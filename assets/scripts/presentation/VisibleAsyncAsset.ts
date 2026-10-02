/** 可见页面独占资源的异步租约；引擎加载与引用计数由调用方适配。 */
export class VisibleAsyncAsset<T> {
    private visible = false;
    private generation = 0;
    private current: T | null = null;

    public constructor(
        private readonly load: (complete: (asset: T | null) => void) => void,
        private readonly retain: (asset: T) => void,
        private readonly release: (asset: T) => void,
        private readonly publish: (asset: T | null) => void,
    ) {}

    public setVisible(visible: boolean): void {
        if (this.visible === visible) return;
        this.visible = visible;
        const generation = ++this.generation;
        if (!visible) {
            const previous = this.current;
            this.current = null;
            // 先断开精灵引用再交还租约，避免引擎销毁纹理时渲染器仍引用它。
            this.publish(null);
            if (previous) this.release(previous);
            return;
        }
        this.load(asset => {
            if (asset) this.retain(asset);
            // 离开再返回不是同一次加载；迟到结果也必须归还，不能回填新页面。
            if (!this.visible || generation !== this.generation) {
                if (asset) this.release(asset);
                return;
            }
            this.current = asset;
            this.publish(asset);
        });
    }
}
