/** 保存目标身份；是否继续锁定由调用方的威胁优先级决定，不在此模块改写战斗策略。 */
export class TowerTargetLocks {
    private readonly locks = new Map<string, {towerId:string;targetId:string}>();
    public choose<T extends {readonly id:string}>(key:string,towerId:string,ordered:readonly T[],
        mayKeep:(locked:T,best:T)=>boolean=()=>true):T|null {
        const best=ordered[0];
        if(!best){this.locks.delete(key);return null;}
        const previous=this.locks.get(key);
        const locked=previous?.towerId===towerId ? ordered.find(candidate=>candidate.id===previous.targetId) : undefined;
        const target=locked && mayKeep(locked,best) ? locked : best;
        this.locks.set(key,{towerId,targetId:target.id});
        return target;
    }
    public retain(towers:ReadonlySet<string>,enemies:ReadonlySet<string>):void {
        // 卖塔、漏怪与同帧其他塔击杀都结束旧锁；不将失效ID带到下波或重开。
        for(const [key,lock] of Array.from(this.locks.entries())) {
            if(!towers.has(key)||!enemies.has(lock.targetId))this.locks.delete(key);
        }
    }
    public clear():void {this.locks.clear();}
    public get snapshot():readonly {towerKey:string;towerId:string;targetId:string}[] {
        return Array.from(this.locks.entries(),([towerKey,lock])=>({towerKey,...lock}));
    }
}
