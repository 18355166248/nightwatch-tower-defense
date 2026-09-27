import type { TowerId } from '../config/PhaseBCombatConfig';

export type TowerInputMode = 'idle' | 'tower-pressed' | 'armed' | 'dragging' | 'click-preview';

/** 记住的塔种不是正在放置的塔；只有活动手势才能让塔卡呈现“已拿起”。 */
export function activePlacementTower(selectedTowerId: TowerId, inputMode: TowerInputMode): TowerId | null {
    return inputMode === 'idle' ? null : selectedTowerId;
}
