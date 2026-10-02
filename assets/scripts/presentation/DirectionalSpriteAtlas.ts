import { isValid, JsonAsset, Node, Rect, resources, Size, SpriteFrame, Texture2D, Vec2 } from 'cc';
import { parseDirectionalSpriteLayout, DIRECTIONAL_FACINGS, type DirectionalSpriteLayout,
    type UnitFacing, type DirectionalClip } from './DirectionalSpriteLayout';

/** Cocos 资源适配器只负责 manifest/纹理加载和切格，不持有玩法时间或敌人对象。 */
export class DirectionalSpriteAtlas {
    private ownedTexture: Texture2D | null = null;
    private readonly frames = new Map<UnitFacing, readonly SpriteFrame[]>();
    private disposed = false;
    private currentLayout: DirectionalSpriteLayout | null = null;
    private currentStatus: 'loading' | 'ready' | 'unavailable' | 'disposed' = 'loading';

    public constructor(private readonly owner: Node, resourceBase: string, clip: DirectionalClip = 'walk') {
        resources.load(`${resourceBase}-layout`, JsonAsset, (manifestError, asset) => {
            if (!this.ownerAlive()) return;
            const layout = !manifestError && asset ? parseDirectionalSpriteLayout(asset.json, clip) : null;
            if (!layout) { this.currentStatus = 'unavailable'; return; }
            resources.load(`${resourceBase}/texture`, Texture2D, (textureError, texture) => {
                if (!this.ownerAlive()) return;
                // 所有帧使用同一原始纹理，不让自动裁边/动态合图改变来源矩形和 ground-anchor。
                if (textureError || !texture || texture.width !== layout.textureWidth || texture.height !== layout.textureHeight) {
                    this.currentStatus = 'unavailable'; return;
                }
                texture.addRef();
                this.ownedTexture = texture;
                for (const direction of DIRECTIONAL_FACINGS) {
                    const row = layout.frames[direction].map((rect) => {
                        const frame = new SpriteFrame();
                        frame.name = `${direction}-${rect.x / rect.w}`;
                        frame.texture = texture;
                        frame.rect = new Rect(rect.x, rect.y, rect.w, rect.h);
                        frame.originalSize = new Size(rect.w, rect.h);
                        frame.offset = new Vec2(0, 0);
                        frame.rotated = false;
                        frame.packable = false;
                        return frame;
                    });
                    this.frames.set(direction, row);
                }
                // 16 帧全部准备后才切换，避免加载过程中敌人在不同画风/半套朝向之间闪烁。
                this.currentLayout = layout;
                this.currentStatus = 'ready';
            });
        });
    }

    public get status(): string { return this.currentStatus; }
    public get layout(): DirectionalSpriteLayout | null { return this.currentLayout; }
    public frame(direction: UnitFacing, index: number): SpriteFrame | null {
        return this.currentStatus === 'ready' ? this.frames.get(direction)?.[index] ?? null : null;
    }

    public dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        this.currentStatus = 'disposed';
        for (const row of Array.from(this.frames.values())) for (const frame of row) frame.destroy();
        this.frames.clear();
        this.currentLayout = null;
        this.ownedTexture?.decRef();
        this.ownedTexture = null;
    }

    private ownerAlive(): boolean {
        // 异步加载晚于场景销毁时不得重新创建帧或持有纹理；共享资源自身仍由 resources 缓存管理。
        return !this.disposed && isValid(this.owner);
    }
}
