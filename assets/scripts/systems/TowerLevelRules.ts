import type { TowerArchetype } from '../config/PhaseBCombatConfig';

export type UpgradeTower = Pick<TowerArchetype, 'id' | 'cost' | 'upgrade'>;

/** 等级差异集中在配置适配层；放置、战斗和界面只消费统一塔属性。 */
export function towerAtLevel(tower: TowerArchetype, level: number): TowerArchetype {
    if (level <= 1 || !tower.upgrade) return tower;
    return { ...tower, ...tower.upgrade };
}

export function nextUpgradeCost(tower: UpgradeTower, level: number): number | null {
    return level === 1 ? tower.upgrade?.cost ?? null : null;
}
