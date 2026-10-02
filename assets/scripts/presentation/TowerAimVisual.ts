export interface TowerAimPoint {
    readonly column: number;
    readonly row: number;
}

const MAX_SWIVEL_DEGREES = 38;
const RETURN_SECONDS = 0.18;

/** 原画是 3/4 俯视炮身，只允许小幅机械摆头；后方目标保持中立，避免炮口与弹道互相矛盾。 */
export function rivetAimAngleDegrees(
    origin: TowerAimPoint,
    target: TowerAimPoint,
    remainingSeconds: number,
    durationSeconds: number,
): number {
    if (!Number.isFinite(remainingSeconds) || !Number.isFinite(durationSeconds)
        || durationSeconds <= 0 || remainingSeconds <= 0) return 0;
    const dx = target.column - origin.column;
    const up = origin.row - target.row;
    if (Math.abs(dx) + Math.abs(up) < 1e-6) return 0;
    if (Math.abs(dx) < 1e-6) return 0;
    // 背面任何角度都超出 3/4 原画可表达范围；维持中立，避免炮管朝前却标称在追后方目标。
    if (up < 0) return 0;
    const raw = -Math.atan2(dx, up) * 180 / Math.PI;
    const bounded = Math.max(-MAX_SWIVEL_DEGREES, Math.min(MAX_SWIVEL_DEGREES, raw));
    const t = Math.max(0, Math.min(1, remainingSeconds / Math.min(RETURN_SECONDS, durationSeconds)));
    // 停火末段平滑回正；暂停时剩余时长不前进，因此不会偷偷转动。
    return bounded * t * t * (3 - 2 * t);
}
