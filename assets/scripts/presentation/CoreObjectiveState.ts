export type CoreIntegrityTone = 'steady' | 'strained' | 'critical' | 'empty';

export interface CoreObjectiveState {
    readonly health: number;
    readonly maxHealth: number;
    readonly ratio: number;
    readonly tone: CoreIntegrityTone;
}

/** 核心目标的显示分级只依赖生命快照，不反向修改胜负状态。 */
export function buildCoreObjectiveState(health: number, maxHealth: number): CoreObjectiveState {
    if (!Number.isFinite(health) || !Number.isFinite(maxHealth) || maxHealth <= 0) {
        throw new RangeError('核心生命必须是有限数，且上限为正数');
    }
    const current = Math.max(0, Math.min(maxHealth, health));
    const ratio = current / maxHealth;
    const tone: CoreIntegrityTone = current === 0
        ? 'empty'
        : ratio <= 0.3
            ? 'critical'
            : ratio <= 0.6
                ? 'strained'
                : 'steady';
    return { health: current, maxHealth, ratio, tone };
}
