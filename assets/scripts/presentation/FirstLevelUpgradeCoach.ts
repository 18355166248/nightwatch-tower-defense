import { FIRST_LEVEL_GUIDED_UPGRADES } from '../config/FirstLevelOpening';
import { FROST_COIL, RIVET_GUN } from '../config/PhaseBCombatConfig';
import { cellKey, type GridCell } from '../core/GridTypes';
import { nextUpgradeCost } from '../systems/TowerLevelRules';

export interface GuidedUpgradeContext {
    readonly wave: number;
    readonly gold: number;
    readonly occupiedCells: ReadonlySet<string>;
    readonly towerLevelsByCell: ReadonlyMap<string, number>;
}

export interface GuidedUpgradeHint {
    readonly cell: GridCell;
    readonly guidanceText: string;
}

/** 只提示已经建成且付得起的塔；错过早期升级时仍可在下一次波间补上，不把教学卡死。 */
export function nextGuidedUpgrade(context: GuidedUpgradeContext): GuidedUpgradeHint | null {
    for (const entry of FIRST_LEVEL_GUIDED_UPGRADES) {
        if (entry.wave > context.wave) continue;
        const key = cellKey(entry.cell);
        if (!context.occupiedCells.has(key)) continue;
        const level = context.towerLevelsByCell.get(key) ?? 1;
        if (level >= entry.targetLevel) continue;
        const tower = entry.towerId === 'frost-coil' ? FROST_COIL : RIVET_GUN;
        const cost = nextUpgradeCost(tower, level);
        if (cost === null || context.gold < cost) continue;
        return { cell: entry.cell,
            guidanceText: `第 ${context.wave} 波清场 · ${entry.coachHint}，点塔升至 Lv${level + 1} 后再点 ▶` };
    }
    return null;
}
