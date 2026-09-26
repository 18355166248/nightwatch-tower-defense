import type { TowerArchetype } from '../config/PhaseBCombatConfig';

export type UpgradeTower = Pick<TowerArchetype, 'id' | 'cost' | 'upgrade' | 'finalUpgrade'>;

/** 等级差异集中在配置适配层；放置、战斗和界面只消费统一塔属性。 */
export function towerAtLevel(tower: TowerArchetype, level: number): TowerArchetype {
    if (level <= 1 || !tower.upgrade) return tower;
    if (level === 2 || !tower.finalUpgrade) return { ...tower, ...tower.upgrade };
    return { ...tower, ...tower.finalUpgrade };
}

export function nextUpgradeCost(tower: UpgradeTower, level: number): number | null {
    if (level === 1) return tower.upgrade?.cost ?? null;
    if (level === 2) return tower.finalUpgrade?.cost ?? null;
    return null;
}

/** 撤销、检查点与回放共用累计投入，避免高等级塔退款或复原漏算某一阶。 */
export function towerInvestment(tower: UpgradeTower, level: number): number {
    let invested = tower.cost;
    for (let currentLevel = 1; currentLevel < level; currentLevel += 1) {
        const cost = nextUpgradeCost(tower, currentLevel);
        if (cost === null) throw new Error(`炮塔 ${tower.id} 缺少 Lv${currentLevel + 1} 升级配置`);
        invested += cost;
    }
    return invested;
}
