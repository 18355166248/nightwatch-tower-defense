interface VoiceGroup { readonly id: number; readonly cost: number; readonly priority: number; }

/** 按整条声音预留声部；重要警报可替换枪声，不允许只播出和弦的半截。 */
export class AudioVoiceBudget {
    private readonly groups = new Map<number, VoiceGroup>();
    private nextId = 1;
    public constructor(public readonly limit = 12) {}
    public get activeCount(): number {
        return Array.from(this.groups.values()).reduce((sum, group) => sum + group.cost, 0);
    }

    public acquire(cost: number, priority: number): { readonly id: number; readonly evicted: readonly number[] } | null {
        if (!Number.isInteger(cost) || cost < 1 || cost > this.limit) return null;
        const candidates = Array.from(this.groups.values()).filter((group) => group.priority < priority)
            .sort((a, b) => a.priority - b.priority || a.id - b.id);
        const evicted: number[] = [];
        let remaining = this.limit - this.activeCount;
        for (const group of candidates) {
            if (remaining >= cost) break;
            remaining += group.cost;
            evicted.push(group.id);
        }
        // 空间不足时整个事务拒绝，不能先杀掉旧音后又发现新音放不下。
        if (remaining < cost) return null;
        for (const id of evicted) this.groups.delete(id);
        const id = this.nextId++;
        this.groups.set(id, { id, cost, priority });
        return { id, evicted };
    }
    public release(id: number): void { this.groups.delete(id); }
    public clear(): void { this.groups.clear(); }
}
