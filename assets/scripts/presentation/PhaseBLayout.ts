import type { GridCell, GridDefinition, GridId } from '../core/GridTypes';
import type { PauseScreen } from '../systems/PauseOverlayRuntime';
import { firstLevelConfirmationLayout } from './FirstLevelConfirmationPresentation';

export const PHASE_B_DESIGN_WIDTH = 1080;
export const PHASE_B_DESIGN_HEIGHT = 1920;
export const PHASE_B_TOWER_BUTTON = { left: -160, right: 160, bottom: -890, top: -735 } as const;
export const PHASE_B_RIVET_BUTTON = { left: -170, right: -8, bottom: -890, top: -735 } as const;
export const PHASE_B_FROST_BUTTON = { left: 8, right: 170, bottom: -890, top: -735 } as const;
export const PHASE_B_SPEED_BUTTON = { left: -480, right: -200, bottom: -890, top: -735 } as const;
export const PHASE_B_EARLY_WAVE_BUTTON = { left: 200, right: 480, bottom: -890, top: -735 } as const;
export const PHASE_B_RESET_BUTTON = { left: -440, right: -220, bottom: -610, top: -510 } as const;
export const PHASE_B_CENTER_PAUSE_BUTTON = { left: 220, right: 440, bottom: -610, top: -510 } as const;
export const PHASE_B_RESULT_RESTART_BUTTON = { left: -365, right: 365, bottom: -485, top: -330 } as const;
export const PHASE_B_RESULT_HOME_BUTTON = { left: -365, right: 365, bottom: -650, top: -495 } as const;
export const PHASE_B_PAUSE_BUTTONS = [
    { left: -365, right: 365, bottom: 50, top: 205 },
    { left: -365, right: -12, bottom: -135, top: 20 },
    { left: 12, right: 365, bottom: -135, top: 20 },
    { left: -365, right: 365, bottom: -300, top: -145 },
] as const;
const PHASE_B_PAUSE_SETTINGS_BUTTONS = [
    { left: -340, right: 340, bottom: 275, top: 430 },
    { left: -340, right: 340, bottom: 95, top: 250 },
    { left: -340, right: 340, bottom: -85, top: 70 },
    { left: -340, right: 340, bottom: -265, top: -110 },
    { left: -340, right: 340, bottom: -445, top: -290 },
] as const;
const PHASE_B_PAUSE_CONFIRM_BUTTONS = [
    { left: -340, right: 340, bottom: -55, top: 100 },
    { left: -340, right: 340, bottom: -235, top: -80 },
] as const;

/** 暂停页绘制和命中必须从同一份屏幕几何读取，避免精修版式后按钮错位。 */
export function phaseBPauseButtons(screen: PauseScreen): readonly PhaseBRect[] {
    return screen === 'menu' ? PHASE_B_PAUSE_BUTTONS
        : screen === 'settings' ? PHASE_B_PAUSE_SETTINGS_BUTTONS : PHASE_B_PAUSE_CONFIRM_BUTTONS;
}

export function phaseBConfirmationButtons(screen: PauseScreen, visibleWidth: number): readonly PhaseBRect[] {
    return screen === 'confirm-restart' || screen === 'confirm-home' || screen === 'route-error'
        ? firstLevelConfirmationLayout(visibleWidth).buttons : phaseBPauseButtons(screen);
}

/** 首页不显示局内速度，但保留动作索引4给返回，避免布局压缩后分发到错误设置。 */
export function phaseBSettingsButtons(fromHome: boolean): readonly PhaseBRect[] {
    // 设置行独立于暂停页的双列按钮；保留索引4返回，不随暂停版式变化而串错动作。
    return fromHome ? [PHASE_B_PAUSE_SETTINGS_BUTTONS[0], PHASE_B_PAUSE_SETTINGS_BUTTONS[1], PHASE_B_PAUSE_SETTINGS_BUTTONS[2],
        PHASE_B_PAUSE_SETTINGS_BUTTONS[3], PHASE_B_PAUSE_SETTINGS_BUTTONS[3]] : PHASE_B_PAUSE_SETTINGS_BUTTONS;
}
export const PHASE_B_SOUND_BUTTON = { left: 310, right: 480, bottom: 790, top: 900 } as const;
export const PHASE_B_UPGRADE_BUTTON = { left: -350, right: -10, bottom: -710, top: -625 } as const;
export const PHASE_B_SELL_BUTTON = { left: 10, right: 350, bottom: -710, top: -625 } as const;
export const PHASE_B_UPGRADE_FULL_BUTTON = { left: -350, right: 350, bottom: -710, top: -625 } as const;
export const PHASE_B_GRID_TABS: readonly { id: GridId; label: string; left: number; right: number }[] = [
    { id: 'grid-9x13', label: '9×13', left: -430, right: -155 },
    { id: 'grid-10x14', label: '10×14', left: -135, right: 135 },
    { id: 'grid-6x13', label: '6×13', left: 155, right: 430 },
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

    /** 独立边缘按钮要整体内移，而不是被裁成细条；绘制、文字和命中共用返回值。 */
    public fitRect(rect: PhaseBRect, inset = 0): PhaseBRect {
        const half = Math.max(0, this.safeHalfWidth - inset);
        const width = Math.min(rect.right - rect.left, half * 2);
        const left = Math.min(Math.max(rect.left, -half), half - width);
        return { ...rect, left, right: left + width };
    }

    public hudCardRects(): readonly PhaseBRect[] {
        const span = Math.min(938, this.safeHalfWidth * 2);
        const width = Math.min(222, (span - 48) / 4);
        return Array.from({ length: 4 }, (_, index) => {
            const left = -span / 2 + index * (width + 16);
            return { left, right: left + width, bottom: 710, top: 774 };
        });
    }

    /** 中央行左侧保留重置热区，右侧给两行布防提示；窄屏不让文案压住按钮。 */
    public guidanceRect(): PhaseBRect {
        const right = this.safeHalfWidth - 12;
        // 极长窄屏允许自然换成四行；升级区只在点塔时占用，此时引导已隐藏，不会相互覆盖。
        return { left: -190, right, bottom: right + 190 < 550 ? -715 : -610, top: -510 };
    }

    /** 结算统计和底板共用窄屏安全宽度，触控按钮继续使用独立命中矩形。 */
    public resultPanelRect(): PhaseBRect {
        const width = Math.min(860, this.safeHalfWidth * 2);
        return { left: -width / 2, right: width / 2, bottom: -690, top: 565 };
    }

    public pausePanelRect(screen: PauseScreen = 'menu'): PhaseBRect {
        const width = Math.min(screen === 'menu' ? 836 : 860, this.safeHalfWidth * 2);
        return screen === 'settings'
            ? { left: -width / 2, right: width / 2, bottom: -640, top: 660 }
            : screen === 'menu'
            ? { left: -width / 2, right: width / 2, bottom: -375, top: 440 }
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
            { left, right: left + width, bottom: 95, top: 245 },
            { left: right, right: right + width, bottom: 95, top: 245 },
            { left, right: left + width, bottom: -75, top: 75 },
            { left: right, right: right + width, bottom: -75, top: 75 },
        ];
    }

    public resultDetailRects(): readonly PhaseBRect[] {
        const panel = this.resultPanelRect();
        const padding = 32;
        const gap = 12;
        const width = (panel.right - panel.left - padding * 2 - gap * 2) / 3;
        return Array.from({ length: 3 }, (_, index) => {
            const left = panel.left + padding + index * (width + gap);
            return { left, right: left + width, bottom: -235, top: -105 };
        });
    }

    public boardMetrics(grid: GridDefinition): PhaseBBoardMetrics {
        // 仅显示格宽随极长窄屏收敛；逻辑仍按格坐标运行，输入、塔/敌人和高亮共用这份换算。
        const boardWidth = Math.min(BOARD_MAX_WIDTH, this.safeHalfWidth * 2);
        const cellSize = Math.floor(Math.min(boardWidth / grid.columns, BOARD_MAX_HEIGHT / grid.rows));
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
