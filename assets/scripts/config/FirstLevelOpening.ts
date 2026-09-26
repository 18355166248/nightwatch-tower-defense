import type { GridCell } from '../core/GridTypes';
import type { TowerId } from './PhaseBCombatConfig';

/** 首关教学推荐开局：冷凝在横墙外侧，三座机枪承担输出；仅作引导，不限制自由构筑。 */
export const FIRST_LEVEL_STARTING_GOLD = 140;
export const FIRST_LEVEL_SUGGESTED_TOWER_COUNT = 4;
export const FIRST_LEVEL_SUGGESTED_PATH_DELTA = 4;
export const FIRST_LEVEL_OPENING: readonly { readonly cell: GridCell; readonly towerId: TowerId }[] = [
    { cell: { column: 3, row: 2 }, towerId: 'rivet-gun' },
    { cell: { column: 2, row: 2 }, towerId: 'frost-coil' },
    { cell: { column: 4, row: 2 }, towerId: 'rivet-gun' },
    { cell: { column: 5, row: 2 }, towerId: 'rivet-gun' },
];

/** 推荐回放跟随首波波间的真实教学选择；这是建议，不自动替玩家升级。 */
export const FIRST_LEVEL_GUIDED_UPGRADES: readonly { readonly wave: number; readonly cell: GridCell }[] = [
    { wave: 1, cell: FIRST_LEVEL_OPENING[0].cell },
];

export const FIRST_LEVEL_FIRST_REINFORCEMENT: GridCell = { column: 6, row: 2 };

/** 每波只强调一个布防目的；左侧封路塔虽不开火，却使第三波后敌人转入右侧火力区。玩家仍可自由提前建塔。 */
export const FIRST_LEVEL_REINFORCEMENTS: readonly {
    readonly afterWave: number;
    readonly cell: GridCell;
    readonly towerId: TowerId;
    readonly coachHint: string;
}[] = [
    { afterWave: 1, cell: FIRST_LEVEL_FIRST_REINFORCEMENT, towerId: 'rivet-gun', coachHint: '补机枪延长路线' },
    { afterWave: 2, cell: { column: 1, row: 2 }, towerId: 'rivet-gun', coachHint: '封左支路，为下波改道准备' },
    { afterWave: 3, cell: { column: 7, row: 2 }, towerId: 'rivet-gun', coachHint: '引敌转向右侧' },
    { afterWave: 4, cell: { column: 7, row: 8 }, towerId: 'frost-coil', coachHint: '下排冷凝拖慢重甲' },
    { afterWave: 5, cell: { column: 6, row: 8 }, towerId: 'rivet-gun', coachHint: '下排机枪集中火力' },
    { afterWave: 6, cell: { column: 7, row: 10 }, towerId: 'rivet-gun', coachHint: '出口前补最后火力' },
];

/** 末段可选加固用于缩短清场；推荐路径已可守住，教学不代替玩家做额外花费。 */
export const FIRST_LEVEL_OPTIONAL_FORTIFICATIONS: readonly { readonly cell: GridCell; readonly towerId: TowerId }[] = [
    { cell: { column: 7, row: 9 }, towerId: 'rivet-gun' },
    { cell: { column: 8, row: 8 }, towerId: 'rivet-gun' },
];
