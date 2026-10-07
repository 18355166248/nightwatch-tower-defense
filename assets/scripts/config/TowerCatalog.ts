import { ALL_TOWERS } from './ThirdLevelCombatConfig';
import type { TowerId, TowerArchetype } from './PhaseBCombatConfig';

/** 菜单、升级和配塔共享完整目录；本局购买权限仍由冻结阵容限制。 */
export function towerDefinition(id: TowerId): TowerArchetype {
    const tower = ALL_TOWERS.find(item => item.id === id);
    if (!tower) throw new Error(`未知炮塔 ${id}`);
    return tower;
}
export function towerRole(id: TowerId): string {
    return id === 'piercing-cannon' ? '穿透护甲 · 优先坦克'
        : id === 'arc-tower' ? '电弧破盾 · 优先护盾'
        : id === 'frost-coil' ? '范围减速 · 控制疾行' : '持续火力 · 守住防线';
}
export function towerPortraitPath(id: TowerId, level = 1): string {
    return id === 'piercing-cannon' || id === 'arc-tower'
        ? `level-three/units/${id}-level-${level}/spriteFrame` : `level-one/units/${id}/spriteFrame`;
}
