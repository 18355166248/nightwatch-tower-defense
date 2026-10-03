import type { GridDefinition, GridId } from '../core/GridTypes';

export const PHASE_A_GRIDS: Readonly<Record<GridId, GridDefinition>> = {
    'grid-9x13': {
        id: 'grid-9x13',
        columns: 9,
        rows: 13,
        entry: { column: 4, row: 0 },
        exit: { column: 4, row: 12 },
    },
    'grid-10x14': {
        id: 'grid-10x14',
        columns: 10,
        rows: 14,
        entry: { column: 4, row: 0 },
        exit: { column: 4, row: 13 },
    },
    'grid-8x13': {
        id: 'grid-8x13',
        columns: 8,
        rows: 13,
        // 首关缩掉右侧一列，但保留入口/核心和既有教学塔的相对位置，避免缩格暗中改变教学路线。
        entry: { column: 4, row: 0 },
        exit: { column: 4, row: 12 },
    },
};

export const DEFAULT_GRID_ID: GridId = 'grid-8x13';
export const PHASE_A_TOWER_COST = 30;
export const PHASE_A_INITIAL_GOLD = 120;
