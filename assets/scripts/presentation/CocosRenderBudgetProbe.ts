import { assetManager, director, dynamicAtlasManager, Label, Node, SpriteFrame, Texture2D } from 'cc';
import { renderBudgetSummary, textureAllocationOwner } from './RenderBudgetSummary';
import { labelTextureBudget, type LabelTextureReference } from './LabelTextureBudget';

export interface CachedTextureAllocation {
    readonly name: string;
    readonly uuid: string;
    readonly width: number;
    readonly height: number;
    readonly bytes: number;
}

/** 固定3.8.8只读适配；文字getter兼容边界单列，0.5秒节流避免逐帧遍历影响被测游戏。 */
export class CocosRenderBudgetProbe {
    private lastSampleAt = -Infinity;
    private snapshot = { ...renderBudgetSummary(null, null), ...labelTextureBudget([]), rendererDynamicAtlasCount: null as number | null,
        rendererDynamicAtlasSize: null as number | null, rendererBudgetSampleAtMs: null as number | null,
        rendererLargestCachedTextures: [] as readonly CachedTextureAllocation[] };

    public read(nowMs: number) {
        if (!Number.isFinite(nowMs) || nowMs - this.lastSampleAt < 500) return this.snapshot;
        this.lastSampleAt = nowMs;
        const device = director.root?.device;
        if (!device) {
            this.snapshot = { ...this.snapshot, ...renderBudgetSummary(null, null, this.snapshot.rendererTexturePeakBytes),
                ...labelTextureBudget([], false), rendererDynamicAtlasCount: null, rendererDynamicAtlasSize: null,
                rendererLargestCachedTextures: [], rendererBudgetSampleAtMs: nowMs };
            return this.snapshot;
        }
        const allocations: CachedTextureAllocation[] = [];
        const visited = new Set<object>();
        assetManager.assets.forEach((asset) => {
            if (!(asset instanceof Texture2D)) return;
            const texture = textureAllocationOwner(asset.getGFXTexture());
            // Texture2D返回的是view而非分配本体；按本体去重，不能漏掉全部资源或重复计多个视图。
            if (!texture || visited.has(texture)) return;
            visited.add(texture);
            allocations.push({ name: asset.name, uuid: asset.uuid, width: asset.width, height: asset.height, bytes: texture.size });
        });
        const cachedBytes = allocations.reduce((sum, allocation) => sum + allocation.bytes, 0);
        const references: LabelTextureReference[] = [];
        let labelTexturesSupported = true;
        const scene = director.getScene();
        for (const label of scene?.getComponentsInChildren(Label) ?? []) {
            if (!('spriteFrame' in label)) { labelTexturesSupported = false; continue; }
            // 固定3.8.8的deprecated只读兼容探针，严禁借此调用内部销毁方法；生命周期由视图的Node管理。
            const frame = label.spriteFrame;
            const image = frame instanceof SpriteFrame ? frame.texture : frame;
            if (image && !(image instanceof Texture2D)) { labelTexturesSupported = false; continue; }
            const owner = image instanceof Texture2D ? textureAllocationOwner(image.getGFXTexture()) : null;
            if (!owner) continue;
            const path: string[] = [];
            let node: Node | null = label.node;
            while (node) { path.unshift(node.name); node = node.parent; }
            references.push({ owner, bytes: owner.size, visible: label.enabledInHierarchy,
                path: path.join('/'), sharedWithResource: visited.has(owner) });
        }
        const memory = device.memoryStatus;
        this.snapshot = { ...renderBudgetSummary({ textureBytes: memory.textureSize,
            bufferBytes: memory.bufferSize, drawCalls: device.numDrawCalls }, cachedBytes, this.snapshot.rendererTexturePeakBytes),
            ...labelTextureBudget(references, labelTexturesSupported),
            rendererDynamicAtlasCount: dynamicAtlasManager.atlasCount,
            rendererDynamicAtlasSize: dynamicAtlasManager.textureSize,
            rendererBudgetSampleAtMs: nowMs,
            rendererLargestCachedTextures: allocations.sort((a, b) => b.bytes - a.bytes || a.uuid.localeCompare(b.uuid)).slice(0, 8) };
        return this.snapshot;
    }
}
