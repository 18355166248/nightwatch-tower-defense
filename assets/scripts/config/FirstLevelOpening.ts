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

export const FIRST_LEVEL_FIRST_REINFORCEMENT: GridCell = { column: 1, row: 2 };

/** 推荐布防保留末波压力；只用于提示，玩家仍可自由加固。 */
export const FIRST_LEVEL_REINFORCEMENTS: readonly { readonly cell: GridCell; readonly towerId: TowerId }[] = [
    { cell: FIRST_LEVEL_FIRST_REINFORCEMENT, towerId: 'rivet-gun' },
    { cell: { column: 0, row: 2 }, towerId: 'rivet-gun' },
    { cell: { column: 6, row: 2 }, towerId: 'rivet-gun' },
    { cell: { column: 7, row: 2 }, towerId: 'rivet-gun' },
    // 末段冷凝必须贴近实际绕行路线；旧塔位 (4,8) 在默认路径外，几乎不会开火。
    { cell: { column: 7, row: 8 }, towerId: 'frost-coil' },
    { cell: { column: 5, row: 8 }, towerId: 'rivet-gun' },
    { cell: { column: 6, row: 8 }, towerId: 'rivet-gun' },
];

/** 末段可选加固：多花金币能显著减少最后两波漏怪，但教学不代替玩家做决定。 */
export const FIRST_LEVEL_OPTIONAL_FORTIFICATIONS: readonly { readonly cell: GridCell; readonly towerId: TowerId }[] = [
    { cell: { column: 7, row: 9 }, towerId: 'rivet-gun' },
    { cell: { column: 8, row: 8 }, towerId: 'rivet-gun' },
];
