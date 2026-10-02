export interface VisualPoint { readonly x: number; readonly y: number }

/** 单位绘制后发布本帧显示坐标；规则格点永远不被回写，缺图时明确回退逻辑位置。 */
export class CombatVisualAnchors {
    private readonly targets = new Map<string, VisualPoint>();
    private readonly emitters = new Map<string, VisualPoint>();
    public begin(): void { this.targets.clear(); this.emitters.clear(); }
    public target(id: string, point: VisualPoint): void { this.targets.set(id, { ...point }); }
    public emitter(key: string, point: VisualPoint, barrel: 0 | 1 = 0): void { this.emitters.set(`${key}:${barrel}`, { ...point }); }
    public resolveTarget(id: string, fallback: VisualPoint): VisualPoint { return this.targets.get(id) ?? fallback; }
    public resolveEmitter(key: string, fallback: VisualPoint, barrel: 0 | 1 = 0): VisualPoint {
        // 旧图或加载失败时只有主炮口；第二管明确回退主炮口，不生成虚构位置。
        return this.emitters.get(`${key}:${barrel}`) ?? this.emitters.get(`${key}:0`) ?? fallback;
    }
}
