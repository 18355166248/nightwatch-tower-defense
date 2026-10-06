import type { GridCell } from '../core/GridTypes';
import type { TowerId } from './PhaseBCombatConfig';

/** 首关教学先建立上路折线，再在中段布置冷凝/机枪交叉火力；敌人需走进可见战场才被集火。 */
export const FIRST_LEVEL_STARTING_GOLD = 140;
export const FIRST_LEVEL_SUGGESTED_TOWER_COUNT = 4;
export const FIRST_LEVEL_SUGGESTED_PATH_DELTA = 4;
export const FIRST_LEVEL_OPENING: readonly { readonly cell: GridCell; readonly towerId: TowerId }[] = [
    { cell: { column: 2, row: 3 }, towerId: 'rivet-gun' },
    { cell: { column: 3, row: 3 }, towerId: 'rivet-gun' },
    { cell: { column: 2, row: 7 }, towerId: 'frost-coil' },
    { cell: { column: 1, row: 7 }, towerId: 'rivet-gun' },
];

// 中段机枪既负责首波收口也覆盖终局回流，两个升级节点必须指向同一实际塔位。
const FIRST_LEVEL_MID_RIVET_CELL: GridCell = { column: 1, row: 7 };

/** 高等级升级是波间建议，玩家可拒绝；规则回放沿同一建议构筑验证后半局压力。 */
export const FIRST_LEVEL_GUIDED_UPGRADES: readonly {
    readonly wave: number;
    readonly cell: GridCell;
    readonly towerId: TowerId;
    readonly targetLevel: number;
    readonly coachHint: string;
}[] = [
    { wave: 1, cell: FIRST_LEVEL_MID_RIVET_CELL, towerId: 'rivet-gun', targetLevel: 2, coachHint: '强化中段机枪' },
    { wave: 5, cell: { column: 5, row: 8 }, towerId: 'frost-coil', targetLevel: 2, coachHint: '增强重甲减速' },
    { wave: 6, cell: FIRST_LEVEL_MID_RIVET_CELL, towerId: 'rivet-gun', targetLevel: 3, coachHint: '提升中段火力' },
    { wave: 7, cell: { column: 5, row: 8 }, towerId: 'frost-coil', targetLevel: 3, coachHint: '强化终局群控' },
];

export const FIRST_LEVEL_FIRST_REINFORCEMENT: GridCell = { column: 4, row: 2 };

/** 前三次补塔先改向再拉长路线，后段火力分散到上下两处；玩家仍可自由提前建塔。 */
export const FIRST_LEVEL_REINFORCEMENTS: readonly {
    readonly afterWave: number;
    readonly cell: GridCell;
    readonly towerId: TowerId;
    readonly coachHint: string;
}[] = [
    { afterWave: 1, cell: FIRST_LEVEL_FIRST_REINFORCEMENT, towerId: 'rivet-gun', coachHint: '补右上机枪，改变来路' },
    { afterWave: 2, cell: { column: 1, row: 2 }, towerId: 'rivet-gun', coachHint: '封左上支路，为延长路线准备' },
    { afterWave: 3, cell: { column: 0, row: 2 }, towerId: 'rivet-gun', coachHint: '补左侧塔，迫敌多绕两格' },
    { afterWave: 4, cell: { column: 5, row: 8 }, towerId: 'frost-coil', coachHint: '下排冷凝拖慢重甲' },
    { afterWave: 5, cell: { column: 4, row: 8 }, towerId: 'rivet-gun', coachHint: '下排机枪集中火力' },
    { afterWave: 6, cell: { column: 5, row: 6 }, towerId: 'rivet-gun', coachHint: '右侧中段设伏，增加终局火力' },
];

/** 末段可选加固用于缩短清场；推荐路径已可守住，教学不代替玩家做额外花费。 */
export const FIRST_LEVEL_OPTIONAL_FORTIFICATIONS: readonly { readonly cell: GridCell; readonly towerId: TowerId }[] = [
    { cell: { column: 5, row: 7 }, towerId: 'rivet-gun' },
    { cell: { column: 4, row: 6 }, towerId: 'rivet-gun' },
];
