import type { GridCell, GridDefinition, GridId } from '../core/GridTypes';

export const PHASE_B_DESIGN_WIDTH = 1080;
export const PHASE_B_DESIGN_HEIGHT = 1920;
export const PHASE_B_TOWER_BUTTON = { left: -160, right: 160, bottom: -890, top: -735 } as const;
export const PHASE_B_RIVET_BUTTON = { left: -170, right: -8, bottom: -890, top: -735 } as const;
export const PHASE_B_FROST_BUTTON = { left: 8, right: 170, bottom: -890, top: -735 } as const;
export const PHASE_B_SPEED_BUTTON = { left: -480, right: -200, bottom: -890, top: -735 } as const;
export const PHASE_B_EARLY_WAVE_BUTTON = { left: 200, right: 480, bottom: -890, top: -735 } as const;
export const PHASE_B_RESULT_RESTART_BUTTON = { left: -300, right: 300, bottom: -300, top: -135 } as const;
export const PHASE_B_SOUND_BUTTON = { left: 310, right: 480, bottom: 790, top: 900 } as const;
export const PHASE_B_GRID_TABS: readonly { id: GridId; label: string; left: number; right: number }[] = [
    { id: 'grid-9x13', label: '9×13', left: -430, right: -155 },
    { id: 'grid-10x14', label: '10×14', left: -135, right: 135 },
    { id: 'grid-8x13', label: '8×13', left: 155, right: 430 },
];

export interface PhaseBPoint {
    readonly x: number;
    readonly y: number;
}

export interface PhaseBGridPoint {
    readonly column: number;
    readonly row: number;
}

export interface PhaseBRect {
    readonly left: number;
    readonly right: number;
    readonly bottom: number;
    readonly top: number;
}

export interface PhaseBBoardMetrics {
    readonly cellSize: number;
    readonly left: number;
    readonly bottom: number;
    readonly width: number;
    readonly height: number;
}

const BOARD_TOP = 610;
const BOARD_MAX_WIDTH = 860;
const BOARD_MAX_HEIGHT = 1110;

/** 输入与渲染共享同一套几何换算，避免调整画板尺寸后出现“看得见但点不中”。 */
export class PhaseBLayout {
    public boardMetrics(grid: GridDefinition): PhaseBBoardMetrics {
        const cellSize = Math.floor(Math.min(BOARD_MAX_WIDTH / grid.columns, BOARD_MAX_HEIGHT / grid.rows));
        const width = cellSize * grid.columns;
        const height = cellSize * grid.rows;
        return { cellSize, width, height, left: -width / 2, bottom: BOARD_TOP - height };
    }

    public pointToCell(point: PhaseBPoint, grid: GridDefinition): GridCell | null {
        const metrics = this.boardMetrics(grid);
        if (point.x < metrics.left || point.x >= metrics.left + metrics.width) return null;
        if (point.y < metrics.bottom || point.y >= metrics.bottom + metrics.height) return null;
        return {
            column: Math.floor((point.x - metrics.left) / metrics.cellSize),
            row: Math.floor((metrics.bottom + metrics.height - point.y) / metrics.cellSize),
        };
    }

    public gridPointCenter(point: PhaseBGridPoint, grid: GridDefinition): PhaseBPoint {
        const metrics = this.boardMetrics(grid);
        return {
            x: metrics.left + (point.column + 0.5) * metrics.cellSize,
            y: metrics.bottom + metrics.height - (point.row + 0.5) * metrics.cellSize,
        };
    }

    public insideRect(point: PhaseBPoint, rect: PhaseBRect): boolean {
        return point.x >= rect.left && point.x <= rect.right && point.y >= rect.bottom && point.y <= rect.top;
    }
}
