import type { GridCell, GridId } from '../core/GridTypes';

export interface PhaseAFixtureSet {
    readonly shortFold: readonly GridCell[];
    readonly longSnake: readonly GridCell[];
}

export const PHASE_A_FIXTURES: Readonly<Record<GridId, PhaseAFixtureSet>> = {
    'grid-9x13': {
        shortFold: [[2, 2], [3, 2], [4, 2], [5, 2]].map(([column, row]) => ({ column, row })),
        longSnake: [
            [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2],
            [4, 8], [5, 8], [6, 8], [7, 8], [8, 8],
        ].map(([column, row]) => ({ column, row })),
    },
    'grid-10x14': {
        shortFold: [[2, 2], [3, 2], [4, 2], [5, 2]].map(([column, row]) => ({ column, row })),
        longSnake: [
            [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2],
            [4, 8], [5, 8], [6, 8], [7, 8], [8, 8], [9, 8],
        ].map(([column, row]) => ({ column, row })),
    },
    'grid-8x13': {
        shortFold: [[1, 2], [2, 2], [3, 2], [4, 2]].map(([column, row]) => ({ column, row })),
        longSnake: [
            [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2],
            [3, 8], [4, 8], [5, 8], [6, 8], [7, 8],
        ].map(([column, row]) => ({ column, row })),
    },
};
