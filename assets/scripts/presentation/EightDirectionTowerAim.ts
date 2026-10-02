import type { VisualPoint } from './CombatVisualAnchors';

export const TOWER_HEAD_DIRECTIONS = ['north', 'north-east', 'east', 'south-east',
    'south', 'south-west', 'west', 'north-west'] as const;
export type TowerHeadDirection = typeof TOWER_HEAD_DIRECTIONS[number];

/** 输入为 Cocos 显示坐标（Y向上）；只选重绘帧，不平面旋转底座或炮头。 */
export function towerHeadDirection(origin: VisualPoint, target: VisualPoint,
    previous: TowerHeadDirection = 'north'): TowerHeadDirection {
    const x = target.x - origin.x;
    const y = target.y - origin.y;
    if (!Number.isFinite(x) || !Number.isFinite(y) || Math.hypot(x, y) < 1e-6) return previous;
    const degrees = (Math.atan2(x, y) * 180 / Math.PI + 360) % 360;
    const previousAngle = TOWER_HEAD_DIRECTIONS.indexOf(previous) * 45;
    const difference = Math.abs((degrees - previousAngle + 540) % 360 - 180);
    // 边界留4°迟滞，避免目标步态微偏移在两帧间快速闪换；跨过边界后仍立即交接。
    if (difference <= 26.5) return previous;
    return TOWER_HEAD_DIRECTIONS[Math.round(degrees / 45) % 8];
}

export interface DirectionalHeadRegistration {
    /** 归一化图片坐标，原点左上；来自每个方向的切图，不猜画布中心。 */
    readonly pivot: VisualPoint;
    readonly muzzles: readonly [VisualPoint, VisualPoint];
}

/** 双炮口和透明帧共用注册点/显示尺寸；外部决定交替开火，不由图集改伤害事实。 */
export function directionalHeadMuzzlePoint(registration: DirectionalHeadRegistration,
    mountingPoint: VisualPoint, displaySize: number, barrel: 0 | 1, scale: VisualPoint = { x: 1, y: 1 }): VisualPoint {
    if (!Number.isFinite(displaySize) || displaySize <= 0) throw new RangeError('炮头显示尺寸必须大于0');
    const muzzle = registration.muzzles[barrel];
    return { x: mountingPoint.x + (muzzle.x - registration.pivot.x) * displaySize * scale.x,
        y: mountingPoint.y - (muzzle.y - registration.pivot.y) * displaySize * scale.y };
}
