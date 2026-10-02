import type { VisualPoint } from './CombatVisualAnchors';

/** 一次性反馈锁住首次显示点；尸影退场后不跳回逻辑格点，也不追随新的移动目标。 */
export class FeedbackVisualOrigins {
    private readonly points = new Map<string, VisualPoint>();

    public retain(activeIds: ReadonlySet<string>): void {
        // 每帧按仍活跃的反馈回收，重开空快照会清理同名敌人的上一局坐标。
        for (const id of this.points.keys()) {
            if (!activeIds.has(id)) this.points.delete(id);
        }
    }

    public resolve(id: string, point: VisualPoint): VisualPoint {
        const previous = this.points.get(id);
        if (previous) return previous;
        const origin = { ...point };
        this.points.set(id, origin);
        return origin;
    }
}
