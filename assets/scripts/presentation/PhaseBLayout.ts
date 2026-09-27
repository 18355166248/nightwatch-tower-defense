import type { GridCell, GridDefinition, GridId } from '../core/GridTypes';
import type { PauseScreen } from '../systems/PauseOverlayRuntime';

export const PHASE_B_DESIGN_WIDTH = 1080;
export const PHASE_B_DESIGN_HEIGHT = 1920;
export const PHASE_B_TOWER_BUTTON = { left: -160, right: 160, bottom: -890, top: -735 } as const;
export const PHASE_B_RIVET_BUTTON = { left: -170, right: -8, bottom: -890, top: -735 } as const;
export const PHASE_B_FROST_BUTTON = { left: 8, right: 170, bottom: -890, top: -735 } as const;
export const PHASE_B_SPEED_BUTTON = { left: -480, right: -200, bottom: -890, top: -735 } as const;
export const PHASE_B_EARLY_WAVE_BUTTON = { left: 200, right: 480, bottom: -890, top: -735 } as const;
export const PHASE_B_RESET_BUTTON = { left: -440, right: -100, bottom: -600, top: -515 } as const;
export const PHASE_B_PLAY_BUTTON = { left: 100, right: 440, bottom: -600, top: -515 } as const;
export const PHASE_B_RESULT_RESTART_BUTTON = { left: -390, right: -20, bottom: -410, top: -275 } as const;
export const PHASE_B_RESULT_HOME_BUTTON = { left: 20, right: 390, bottom: -410, top: -275 } as const;
export const PHASE_B_PAUSE_BUTTONS = [
    { left: -340, right: 340, bottom: 165, top: 290 },
    { left: -340, right: 340, bottom: 5, top: 130 },
    { left: -340, right: 340, bottom: -155, top: -30 },
    { left: -340, right: 340, bottom: -315, top: -190 },
] as const;
const PHASE_B_PAUSE_SETTINGS_BUTTONS = [
    { left: -340, right: 340, bottom: 30, top: 130 },
    { left: -340, right: 340, bottom: -100, top: 0 },
    { left: -340, right: 340, bottom: -230, top: -130 },
] as const;
const PHASE_B_PAUSE_CONFIRM_BUTTONS = [
    { left: -340, right: 340, bottom: -20, top: 80 },
    { left: -340, right: 340, bottom: -145, top: -45 },
] as const;

/** 暂停页绘制和命中必须从同一份屏幕几何读取，避免精修版式后按钮错位。 */
export function phaseBPauseButtons(screen: PauseScreen): readonly PhaseBRect[] {
    return screen === 'menu' ? PHASE_B_PAUSE_BUTTONS
        : screen === 'settings' ? PHASE_B_PAUSE_SETTINGS_BUTTONS : PHASE_B_PAUSE_CONFIRM_BUTTONS;
}
export const PHASE_B_SOUND_BUTTON = { left: 310, right: 480, bottom: 790, top: 900 } as const;
export const PHASE_B_UPGRADE_BUTTON = { left: -350, right: -10, bottom: -710, top: -625 } as const;
export const PHASE_B_SELL_BUTTON = { left: 10, right: 350, bottom: -710, top: -625 } as const;
export const PHASE_B_UPGRADE_FULL_BUTTON = { left: -350, right: 350, bottom: -710, top: -625 } as const;
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
    private visibleWidth = PHASE_B_DESIGN_WIDTH;

    /** 固定高度适配会在长屏上收窄可见设计宽度；输入和绘制必须共用同一安全边界。 */
    public setVisibleWidth(width: number): void {
        if (Number.isFinite(width) && width > 0) this.visibleWidth = width;
    }

    public get safeHalfWidth(): number {
        return Math.min(PHASE_B_DESIGN_WIDTH, this.visibleWidth) / 2 - 24;
    }

    public get visibleDesignWidth(): number {
        return this.visibleWidth;
    }

    public safeRect(rect: PhaseBRect): PhaseBRect {
        return { ...rect, left: Math.max(rect.left, -this.safeHalfWidth), right: Math.min(rect.right, this.safeHalfWidth) };
    }

    public hudCardRects(): readonly PhaseBRect[] {
        const span = Math.min(938, this.safeHalfWidth * 2);
        const width = Math.min(222, (span - 48) / 4);
        return Array.from({ length: 4 }, (_, index) => {
            const left = -span / 2 + index * (width + 16);
            return { left, right: left + width, bottom: 710, top: 774 };
        });
    }

    /** 结算统计和底板共用窄屏安全宽度，触控按钮继续使用独立命中矩形。 */
    public resultPanelRect(): PhaseBRect {
        const width = Math.min(860, this.safeHalfWidth * 2);
        return { left: -width / 2, right: width / 2, bottom: -540, top: 490 };
    }

    public pausePanelRect(screen: PauseScreen = 'menu'): PhaseBRect {
        const width = Math.min(860, this.safeHalfWidth * 2);
        return screen === 'menu'
            ? { left: -width / 2, right: width / 2, bottom: -465, top: 475 }
            : { left: -width / 2, right: width / 2, bottom: -330, top: 330 };
    }

    /** 横屏只显示阻断提示，利用固定高度策略额外露出的宽度放大文案。 */
    public orientationPanelRect(): PhaseBRect {
        const width = Math.min(2200, Math.max(860, this.visibleWidth - 180));
        return { left: -width / 2, right: width / 2, bottom: -360, top: 360 };
    }

    public resultStatRects(): readonly PhaseBRect[] {
        const panel = this.resultPanelRect();
        const padding = 32;
        const gap = 18;
        const width = (panel.right - panel.left - padding * 2 - gap) / 2;
        const left = panel.left + padding;
        const right = left + width + gap;
        return [
            { left, right: left + width, bottom: 38, top: 138 },
            { left: right, right: right + width, bottom: 38, top: 138 },
            { left, right: left + width, bottom: -80, top: 20 },
            { left: right, right: right + width, bottom: -80, top: 20 },
        ];
    }

    public resultDetailRects(): readonly PhaseBRect[] {
        const panel = this.resultPanelRect();
        const padding = 32;
        const gap = 12;
        const width = (panel.right - panel.left - padding * 2 - gap * 2) / 3;
        return Array.from({ length: 3 }, (_, index) => {
            const left = panel.left + padding + index * (width + gap);
            return { left, right: left + width, bottom: -238, top: -115 };
        });
    }

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
