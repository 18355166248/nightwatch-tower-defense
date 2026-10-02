export interface VisualPoint { readonly x: number; readonly y: number }

/** 单位绘制后发布本帧显示坐标；规则格点永远不被回写，缺图时明确回退逻辑位置。 */
export class CombatVisualAnchors {
    private readonly targets = new Map<string, VisualPoint>();
    private readonly emitters = new Map<string, VisualPoint>();
    public begin(): void { this.targets.clear(); this.emitters.clear(); }
    public target(id: string, point: VisualPoint): void { this.targets.set(id, { ...point }); }
    public emitter(key: string, point: VisualPoint): void { this.emitters.set(key, { ...point }); }
    public resolveTarget(id: string, fallback: VisualPoint): VisualPoint { return this.targets.get(id) ?? fallback; }
    public resolveEmitter(key: string, fallback: VisualPoint): VisualPoint { return this.emitters.get(key) ?? fallback; }
}
