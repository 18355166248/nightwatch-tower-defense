import { assetManager, director, dynamicAtlasManager, Label, Node, SpriteFrame, Texture2D } from 'cc';
import { renderBudgetSummary, textureAllocationOwner } from './RenderBudgetSummary';
import { labelTextureBudget, type LabelTextureReference } from './LabelTextureBudget';
import { rgbaInkBounds, type InkBounds } from './RgbaInkBounds';

interface LabelInkSample {
    readonly path: string;
    readonly allocationBytes: number;
    readonly canvasWidth: number | null;
    readonly canvasHeight: number | null;
    readonly bounds: InkBounds | null;
    readonly aboveEngineAlphaFloorBounds: InkBounds | null;
    readonly unavailable: string | null;
}

export interface CachedTextureAllocation {
    readonly name: string;
    readonly uuid: string;
    readonly width: number;
    readonly height: number;
    readonly bytes: number;
}

/** 固定3.8.8只读适配；文字getter兼容边界单列，0.5秒节流避免逐帧遍历影响被测游戏。 */
export class CocosRenderBudgetProbe {
    // 默认不开像素读取；独立诊断入口也只每5秒读一次，不把诊断开销混入正式性能结论。
    private readonly inkEnabled = typeof window !== 'undefined'
        && new URLSearchParams(window.location.search).get('labelBudget') === 'ink';
    private lastInkAt = -Infinity;
    private lastSampleAt = -Infinity;
    private snapshot = { ...renderBudgetSummary(null, null), ...labelTextureBudget([]), rendererDynamicAtlasCount: null as number | null,
        rendererDynamicAtlasSize: null as number | null, rendererBudgetSampleAtMs: null as number | null,
        rendererLargestCachedTextures: [] as readonly CachedTextureAllocation[],
        rendererLabelInkEnabled: this.inkEnabled,
        rendererLabelInkSampleAtMs: null as number | null,
        rendererLabelInkSamples: [] as readonly LabelInkSample[] };

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
        const sampleInk = this.inkEnabled && nowMs - this.lastInkAt >= 5000;
        const inkSamples: LabelInkSample[] = [];
        const inkOwners = new Set<object>();
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
            if (sampleInk && label.enabledInHierarchy && !inkOwners.has(owner)) {
                inkOwners.add(owner);
                inkSamples.push(this.readInk(image as Texture2D, path.join('/'), owner.size, visited.has(owner)));
            }
        }
        const memory = device.memoryStatus;
        this.snapshot = { ...renderBudgetSummary({ textureBytes: memory.textureSize,
            bufferBytes: memory.bufferSize, drawCalls: device.numDrawCalls }, cachedBytes, this.snapshot.rendererTexturePeakBytes),
            ...labelTextureBudget(references, labelTexturesSupported),
            rendererDynamicAtlasCount: dynamicAtlasManager.atlasCount,
            rendererDynamicAtlasSize: dynamicAtlasManager.textureSize,
            rendererBudgetSampleAtMs: nowMs,
            rendererLabelInkEnabled: this.inkEnabled,
            rendererLabelInkSampleAtMs: sampleInk ? nowMs : this.snapshot.rendererLabelInkSampleAtMs,
            rendererLabelInkSamples: sampleInk ? inkSamples : this.snapshot.rendererLabelInkSamples,
            rendererLargestCachedTextures: allocations.sort((a, b) => b.bytes - a.bytes || a.uuid.localeCompare(b.uuid)).slice(0, 8) };
        if (sampleInk) this.lastInkAt = nowMs;
        return this.snapshot;
    }

    private readInk(texture: Texture2D, path: string, allocationBytes: number, shared: boolean): LabelInkSample {
        const result = { path, allocationBytes, canvasWidth: null as number | null,
            canvasHeight: null as number | null, bounds: null as InkBounds | null,
            aboveEngineAlphaFloorBounds: null as InkBounds | null, unavailable: null as string | null };
        // 共享图集与失去CPU原图的纹理不能当作独立文字画布，缺测明确报告，不伪造0占用。
        const source = texture.image?.data;
        if (shared || typeof HTMLCanvasElement === 'undefined' || !(source instanceof HTMLCanvasElement))
            return { ...result, unavailable: shared ? 'shared-resource' : 'no-cpu-canvas' };
        result.canvasWidth = source.width; result.canvasHeight = source.height;
        if (source.width !== texture.width || source.height !== texture.height)
            return { ...result, unavailable: 'canvas-texture-size-mismatch' };
        try {
            const context = source.getContext('2d');
            if (!context) return { ...result, unavailable: 'no-2d-context' };
            const pixels = context.getImageData(0, 0, source.width, source.height).data;
            result.bounds = rgbaInkBounds(pixels, source.width, source.height);
            // 3.8.8会以alpha=1铺满TTF画布；另列高于底色的范围，仅供分析，不能当无损裁切许可。
            result.aboveEngineAlphaFloorBounds = rgbaInkBounds(pixels, source.width, source.height, 1);
            return result.bounds ? result : { ...result, unavailable: 'invalid-rgba' };
        } catch {
            return { ...result, unavailable: 'pixel-read-unavailable' };
        }
    }
}
