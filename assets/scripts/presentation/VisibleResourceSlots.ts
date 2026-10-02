/** 展示快照按槽位持有资源；变化时只释放未使用槽位，不在每次重绘重建仍可见资源。 */
export class VisibleResourceSlots<T> {
    private readonly resources = new Map<string,T>();
    private readonly used = new Set<string>();
    public constructor(private readonly release: (resource:T)=>void) {}
    public begin():void {this.used.clear();}
    public acquire(key:string,create:()=>T):T {
        this.used.add(key);
        if(this.resources.has(key))return this.resources.get(key)!;
        const resource=create();this.resources.set(key,resource);
        return resource;
    }
    public end():void {
        for(const [key,resource] of Array.from(this.resources.entries())) {
            if(this.used.has(key))continue;
            // 先移除所有权再销毁；释放回调重入时不会取回或重复销毁旧资源。
            this.resources.delete(key);this.release(resource);
        }
    }
    public clear():void {this.begin();this.end();}
    public entries():IterableIterator<[string,T]> {return this.resources.entries();}
}
