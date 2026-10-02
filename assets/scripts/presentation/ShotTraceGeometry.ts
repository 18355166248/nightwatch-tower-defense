import type { PhaseBPoint } from './PhaseBLayout';

export interface RivetTrailPose {
    readonly head: PhaseBPoint;
    readonly tail: PhaseBPoint;
    readonly headRadius: number;
    readonly opacity: number;
}

/** 命中仍由战斗系统即时结算；短弹迹只是那次射击的视觉回放，不能影响索敌或伤害。 */
export function rivetTrailPose(origin: PhaseBPoint, target: PhaseBPoint, remainingFraction: number, cellSize: number): RivetTrailPose {
    const life = Number.isFinite(remainingFraction) ? Math.max(0, Math.min(1, remainingFraction)) : 0;
    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    const distance = Math.hypot(dx, dy);
    const traveled = 1 - life * life;
    const head = { x: origin.x + dx * traveled, y: origin.y + dy * traveled };
    const length = Math.min(distance * traveled, Math.max(0, cellSize) * 0.52);
    const directionX = distance > 0 ? dx / distance : 0;
    const directionY = distance > 0 ? dy / distance : 0;
    return {
        head,
        tail: { x: head.x - directionX * length, y: head.y - directionY * length },
        headRadius: Math.max(0, cellSize) * (0.05 + life * 0.025),
        opacity: Math.round(240 * Math.min(1, life * 3)),
    };
}
