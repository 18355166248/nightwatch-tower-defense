import type { TowerArchetype } from '../config/PhaseBCombatConfig';
import { towerAtLevel } from '../systems/TowerLevelRules';

/** 金币已有独立数值卡片，事件行只保留发生了什么，避免短屏顶部重复挤字。 */
export function hudEventText(statusText: string): string {
    return statusText.replace(/\s*·\s*(?:剩余)?金币\s*\d+\s*$/, '');
}

/** 塔属性留在单行事件槽；撤销限制与升级操作分别由帮助行和按钮承载。 */
export function towerInspectionSummary(baseTower: TowerArchetype, level: number): string {
    const tower = towerAtLevel(baseTower, level);
    return tower.effect
        ? `${tower.label} Lv${level} · ${tower.rangeCells}格 · 减速${Math.round((1 - tower.effect.speedMultiplier) * 100)}%`
        : `${tower.label} Lv${level} · ${tower.rangeCells}格 · 伤害${tower.damage}`;
}

/** 击杀金币已逐只入账；这里只汇总本波所得，不重复发钱。 */
export function waveClearIncomeText(wave: number, killGold: number, clearGold: number): string {
    return `第 ${wave} 波守住 · 本波 +${killGold + clearGold}（清场 +${clearGold}）`;
}
