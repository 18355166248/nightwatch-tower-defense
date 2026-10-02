/** 只保留当前可见视图的昂贵资源；重复快照不重复创建/释放，规则状态仍由调用方持有。 */
export class VisibleViewResource<T> {
    private current: T | null = null;

    public constructor(private readonly create: () => T, private readonly release: (resource: T) => void) {}

    public setVisible(visible: boolean): T | null {
        if (visible) {
            if (this.current === null) this.current = this.create();
            return this.current;
        }
        const previous = this.current;
        // 先断开所有权，再释放；失败或重入都不能重复释放同一个旧界面。
        this.current = null;
        if (previous !== null) this.release(previous);
        return null;
    }
}
