import type { EnemyId } from '../config/PhaseBCombatConfig';

const SOURCE_CANVAS_SIZE = 128;
const HAULER_B_FOOT_DELTA = 3;

/** 只补偿透明切图的前脚基线差；缺少 B 帧时调用方必须传 0，保持原图位置。 */
export function enemySpriteRegistrationY(archetypeId: EnemyId, displayedFrame: 0 | 1, displaySize: number): number {
    if (archetypeId !== 'iron-canister-hauler' || displayedFrame === 0) return 0;
    return -HAULER_B_FOOT_DELTA * displaySize / SOURCE_CANVAS_SIZE;
}
