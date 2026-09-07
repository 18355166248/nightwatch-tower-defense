import { Color, Graphics } from 'cc';
import { PHASE_A_TOWER_COST } from '../config/PhaseAGrids';
import { cellKey, sameCell, type GridCell, type GridDefinition, type GridId } from '../core/GridTypes';
import type { BattleResultViewModel } from './BattleResultViewModel';
import type { CombatFeedbackSnapshot } from './CombatFeedbackRuntime';
import {
    PHASE_B_GRID_TABS,
    PHASE_B_EARLY_WAVE_BUTTON,
    PHASE_B_RESULT_RESTART_BUTTON,
    PHASE_B_SPEED_BUTTON,
    PHASE_B_TOWER_BUTTON,
    type PhaseBGridPoint,
    type PhaseBPoint,
    PhaseBLayout,
} from './PhaseBLayout';

export interface PhaseBCanvasRenderState {
    readonly selectedGridId: GridId;
    readonly grid: GridDefinition;
    readonly towers: ReadonlySet<string>;
    readonly activePath: readonly GridCell[] | null;
    readonly preview: { readonly accepted: boolean; readonly cell: GridCell } | null;
    readonly enemies: readonly {
        readonly health: number;
        readonly archetype: { readonly maxHealth: number };
        readonly fromCell: GridCell;
        readonly toCell: GridCell;
        readonly progress: number;
    }[];
    readonly feedback: CombatFeedbackSnapshot;
    readonly gold: number;
    readonly speedMultiplier: number;
    readonly canStartNextWaveEarly: boolean;
    readonly showPlayControl: boolean;
    readonly result: BattleResultViewModel | null;
}

/**
 * 程序化灰盒渲染器只读取玩法快照，不持有经济、状态机或输入状态。
 * 后续替换 Sprite/Prefab 时可以整体替换此类，而不改动战斗编排。
 */
export class PhaseBCanvasRenderer {
    public constructor(
        private readonly graphics: Graphics,
        private readonly layout: PhaseBLayout,
    ) {}

    public render(state: PhaseBCanvasRenderState): void {
        const graphics = this.graphics;
        graphics.clear();
        graphics.fillColor = new Color('#101827');
        graphics.rect(-540, -960, 1080, 1920);
        graphics.fill();
        this.drawTabs(state);
        this.drawBoard(state);
        this.drawControls(state);
        this.drawResultOverlay(state.result);
    }

    private drawTabs(state: PhaseBCanvasRenderState): void {
        const graphics = this.graphics;
        for (const tab of PHASE_B_GRID_TABS) {
            graphics.fillColor = tab.id === state.selectedGridId ? new Color('#C68A35') : new Color('#263A55');
            graphics.rect(tab.left, 610, tab.right - tab.left, 90);
            graphics.fill();
        }
        this.drawGridCode(-292, 655, [9, 1, 3]);
        this.drawGridCode(0, 655, [1, 0, 1, 4]);
        this.drawGridCode(292, 655, [8, 1, 3]);
    }

    private drawBoard(state: PhaseBCanvasRenderState): void {
        const graphics = this.graphics;
        const metrics = this.layout.boardMetrics(state.grid);
        const activePath = state.activePath;

        if (activePath && activePath.length > 1) {
            graphics.strokeColor = state.preview?.accepted ? new Color('#5FE1A2') : new Color('#5E8FC6');
            graphics.lineWidth = Math.max(10, metrics.cellSize * 0.18);
            const first = this.center(activePath[0], state.grid);
            graphics.moveTo(first.x, first.y);
            for (let index = 1; index < activePath.length; index += 1) {
                const point = this.center(activePath[index], state.grid);
                graphics.lineTo(point.x, point.y);
            }
            graphics.stroke();
        }

        for (let row = 0; row < state.grid.rows; row += 1) {
            for (let column = 0; column < state.grid.columns; column += 1) {
                const cell = { column, row };
                const center = this.center(cell, state.grid);
                const half = metrics.cellSize / 2;
                let fill = new Color(31, 47, 67, 160);
                if (sameCell(cell, state.grid.entry)) fill = new Color('#5678D4');
                else if (sameCell(cell, state.grid.exit)) fill = new Color('#D65F5F');
                else if (state.towers.has(cellKey(cell))) fill = new Color('#D5A84B');
                if (state.preview && sameCell(cell, state.preview.cell)) {
                    fill = state.preview.accepted ? new Color('#45C486') : new Color('#E05252');
                }
                graphics.fillColor = fill;
                graphics.rect(center.x - half + 3, center.y - half + 3, metrics.cellSize - 6, metrics.cellSize - 6);
                graphics.fill();
                graphics.strokeColor = new Color(111, 143, 169, 130);
                graphics.lineWidth = 2;
                graphics.rect(center.x - half, center.y - half, metrics.cellSize, metrics.cellSize);
                graphics.stroke();
                if (state.towers.has(cellKey(cell))) {
                    graphics.fillColor = new Color('#172235');
                    graphics.circle(center.x, center.y, metrics.cellSize * 0.22);
                    graphics.fill();
                }
            }
        }

        for (const enemy of state.enemies) {
            const from = this.center(enemy.fromCell, state.grid);
            const to = this.center(enemy.toCell, state.grid);
            const x = from.x + (to.x - from.x) * enemy.progress;
            const y = from.y + (to.y - from.y) * enemy.progress;
            graphics.fillColor = new Color('#F06A63');
            graphics.circle(x, y, metrics.cellSize * 0.25);
            graphics.fill();
            graphics.strokeColor = new Color('#FFF1CF');
            graphics.lineWidth = 4;
            graphics.circle(x, y, metrics.cellSize * 0.25);
            graphics.stroke();
            const healthWidth = metrics.cellSize * 0.62;
            graphics.fillColor = new Color('#35262C');
            graphics.rect(x - healthWidth / 2, y + metrics.cellSize * 0.31, healthWidth, 7);
            graphics.fill();
            graphics.fillColor = new Color('#69D391');
            graphics.rect(x - healthWidth / 2, y + metrics.cellSize * 0.31, healthWidth * Math.max(0, enemy.health / enemy.archetype.maxHealth), 7);
            graphics.fill();
        }
        this.drawCombatFeedback(state, metrics.cellSize);
    }

    private drawCombatFeedback(state: PhaseBCanvasRenderState, cellSize: number): void {
        const graphics = this.graphics;
        for (const tracer of state.feedback.tracers) {
            const origin = this.center(tracer.origin, state.grid);
            const target = this.center(tracer.point, state.grid);
            const life = tracer.remainingSeconds / tracer.durationSeconds;
            graphics.strokeColor = tracer.lethal
                ? new Color(255, 244, 188, Math.round(255 * life))
                : new Color(255, 205, 105, Math.round(225 * life));
            graphics.lineWidth = tracer.lethal ? 9 : 6;
            graphics.moveTo(origin.x, origin.y);
            graphics.lineTo(target.x, target.y);
            graphics.stroke();
            graphics.fillColor = new Color(255, 239, 169, Math.round(230 * life));
            graphics.circle(origin.x, origin.y, cellSize * (0.08 + 0.07 * life));
            graphics.fill();
        }
        for (const impact of state.feedback.impacts) {
            const point = this.center(impact.point, state.grid);
            const progress = 1 - impact.remainingSeconds / impact.durationSeconds;
            graphics.strokeColor = new Color(255, 241, 207, Math.round(230 * (1 - progress)));
            graphics.lineWidth = 5;
            graphics.circle(point.x, point.y, cellSize * (0.1 + progress * 0.2));
            graphics.stroke();
        }
        for (const death of state.feedback.deaths) {
            const point = this.center(death.point, state.grid);
            const progress = 1 - death.remainingSeconds / death.durationSeconds;
            const alpha = Math.round(230 * (1 - progress));
            graphics.strokeColor = new Color(240, 106, 99, alpha);
            graphics.lineWidth = 8 * (1 - progress) + 2;
            graphics.circle(point.x, point.y, cellSize * (0.24 + progress * 0.48));
            graphics.stroke();
            for (let ray = 0; ray < 6; ray += 1) {
                const angle = ray * Math.PI / 3;
                const inner = cellSize * (0.2 + progress * 0.18);
                const outer = cellSize * (0.28 + progress * 0.5);
                graphics.moveTo(point.x + Math.cos(angle) * inner, point.y + Math.sin(angle) * inner);
                graphics.lineTo(point.x + Math.cos(angle) * outer, point.y + Math.sin(angle) * outer);
            }
            graphics.stroke();
        }
        for (const reward of state.feedback.rewards) {
            const point = this.center(reward.point, state.grid);
            const progress = 1 - reward.remainingSeconds / reward.durationSeconds;
            const y = point.y + cellSize * (0.35 + progress * 0.55);
            const alpha = Math.round(255 * Math.min(1, reward.remainingSeconds / 0.2));
            graphics.fillColor = new Color(244, 198, 82, alpha);
            for (let coin = 0; coin < Math.min(4, reward.amount); coin += 1) {
                graphics.circle(point.x + (coin - 1.5) * cellSize * 0.11, y, cellSize * 0.055);
                graphics.fill();
            }
        }
        for (const coreHit of state.feedback.coreHits) {
            const exit = this.center(state.grid.exit, state.grid);
            const progress = 1 - coreHit.remainingSeconds / coreHit.durationSeconds;
            graphics.strokeColor = new Color(255, 82, 82, Math.round(245 * (1 - progress)));
            graphics.lineWidth = 12;
            graphics.circle(exit.x, exit.y, cellSize * (0.35 + progress * 0.45));
            graphics.stroke();
        }
    }

    private drawResultOverlay(result: BattleResultViewModel | null): void {
        if (!result) return;
        const graphics = this.graphics;
        graphics.fillColor = new Color(7, 12, 21, 232);
        graphics.rect(-540, -960, 1080, 1920);
        graphics.fill();
        graphics.fillColor = new Color('#17263A');
        graphics.roundRect(-430, -430, 860, 850, 34);
        graphics.fill();
        graphics.fillColor = new Color(result.kind === 'victory' ? '#2F9E72' : '#B84F50');
        graphics.rect(-430, 350, 860, 70);
        graphics.fill();
        graphics.fillColor = new Color(result.kind === 'victory' ? '#79E0AD' : '#FF8580');
        graphics.roundRect(
            PHASE_B_RESULT_RESTART_BUTTON.left,
            PHASE_B_RESULT_RESTART_BUTTON.bottom,
            PHASE_B_RESULT_RESTART_BUTTON.right - PHASE_B_RESULT_RESTART_BUTTON.left,
            PHASE_B_RESULT_RESTART_BUTTON.top - PHASE_B_RESULT_RESTART_BUTTON.bottom,
            24,
        );
        graphics.fill();
    }

    private drawControls(state: PhaseBCanvasRenderState): void {
        const graphics = this.graphics;
        this.drawButton(-440, -600, 340, 85);
        this.drawButton(100, -600, 340, 85);
        this.drawButton(-440, -700, 280, 90);
        this.drawButton(160, -700, 280, 90);
        this.drawResetIcon(-270, -558);
        this.drawPhaseIcon(270, -558, state.showPlayControl);
        this.drawRouteIcon(-300, -655, false);
        this.drawRouteIcon(300, -655, true);
        graphics.fillColor = new Color('#29405C');
        graphics.roundRect(
            PHASE_B_SPEED_BUTTON.left,
            PHASE_B_SPEED_BUTTON.bottom,
            PHASE_B_SPEED_BUTTON.right - PHASE_B_SPEED_BUTTON.left,
            PHASE_B_SPEED_BUTTON.top - PHASE_B_SPEED_BUTTON.bottom,
            20,
        );
        graphics.fill();
        graphics.fillColor = state.canStartNextWaveEarly ? new Color('#2F9E72') : new Color('#354355');
        graphics.roundRect(
            PHASE_B_EARLY_WAVE_BUTTON.left,
            PHASE_B_EARLY_WAVE_BUTTON.bottom,
            PHASE_B_EARLY_WAVE_BUTTON.right - PHASE_B_EARLY_WAVE_BUTTON.left,
            PHASE_B_EARLY_WAVE_BUTTON.top - PHASE_B_EARLY_WAVE_BUTTON.bottom,
            20,
        );
        graphics.fill();
        graphics.fillColor = state.gold >= PHASE_A_TOWER_COST ? new Color('#D5A84B') : new Color('#596273');
        graphics.rect(PHASE_B_TOWER_BUTTON.left, PHASE_B_TOWER_BUTTON.bottom, PHASE_B_TOWER_BUTTON.right - PHASE_B_TOWER_BUTTON.left, PHASE_B_TOWER_BUTTON.top - PHASE_B_TOWER_BUTTON.bottom);
        graphics.fill();
        graphics.fillColor = new Color('#263043');
        graphics.circle(0, -800, 44);
        graphics.fill();
        graphics.strokeColor = new Color('#F7E4B1');
        graphics.lineWidth = 10;
        graphics.moveTo(-52, -842);
        graphics.lineTo(0, -790);
        graphics.lineTo(52, -842);
        graphics.stroke();
    }

    private drawGridCode(centerX: number, centerY: number, digits: readonly number[]): void {
        const graphics = this.graphics;
        const scale = 1.45;
        const digitWidth = 24 * scale;
        const gap = 12;
        const crossGap = 32;
        const split = digits.length === 3 ? 1 : 2;
        const totalWidth = digits.length * digitWidth + (digits.length - 1) * gap + crossGap;
        let x = centerX - totalWidth / 2;
        for (let index = 0; index < digits.length; index += 1) {
            if (index === split) {
                graphics.strokeColor = new Color('#F2E4BF');
                graphics.lineWidth = 7;
                graphics.moveTo(x - 5, centerY - 14);
                graphics.lineTo(x + 16, centerY + 14);
                graphics.moveTo(x - 5, centerY + 14);
                graphics.lineTo(x + 16, centerY - 14);
                graphics.stroke();
                x += crossGap;
            }
            this.drawDigit(digits[index], x, centerY, scale);
            x += digitWidth + gap;
        }
    }

    private drawDigit(digit: number, x: number, y: number, scale: number): void {
        const enabled: Readonly<Record<number, readonly number[]>> = {
            0: [0, 1, 2, 3, 4, 5], 1: [1, 2], 2: [0, 1, 6, 4, 3], 3: [0, 1, 2, 3, 6],
            4: [5, 6, 1, 2], 5: [0, 5, 6, 2, 3], 6: [0, 5, 4, 3, 2, 6], 7: [0, 1, 2],
            8: [0, 1, 2, 3, 4, 5, 6], 9: [0, 1, 2, 3, 5, 6],
        };
        const segments = [
            [2, 18, 18, 4], [18, 2, 4, 18], [18, -18, 4, 18], [2, -22, 18, 4],
            [-2, -18, 4, 18], [-2, 2, 4, 18], [2, -2, 18, 4],
        ] as const;
        this.graphics.fillColor = new Color('#F2E4BF');
        for (const segment of enabled[digit] ?? []) {
            const [left, bottom, width, height] = segments[segment];
            this.graphics.rect(x + left * scale, y + bottom * scale, width * scale, height * scale);
            this.graphics.fill();
        }
    }

    private drawResetIcon(x: number, y: number): void {
        const graphics = this.graphics;
        graphics.strokeColor = new Color('#F2E4BF');
        graphics.lineWidth = 12;
        graphics.arc(x, y, 35, 0.4, 5.4, false);
        graphics.stroke();
        graphics.fillColor = new Color('#F2E4BF');
        graphics.moveTo(x - 38, y + 20);
        graphics.lineTo(x - 8, y + 35);
        graphics.lineTo(x - 16, y + 3);
        graphics.close();
        graphics.fill();
    }

    private drawPhaseIcon(x: number, y: number, showPlay: boolean): void {
        const graphics = this.graphics;
        graphics.fillColor = new Color('#F2E4BF');
        if (showPlay) {
            graphics.moveTo(x - 24, y - 36);
            graphics.lineTo(x + 40, y);
            graphics.lineTo(x - 24, y + 36);
            graphics.close();
            graphics.fill();
            return;
        }
        graphics.rect(x - 30, y - 36, 19, 72);
        graphics.fill();
        graphics.rect(x + 11, y - 36, 19, 72);
        graphics.fill();
    }

    private drawRouteIcon(x: number, y: number, long: boolean): void {
        const graphics = this.graphics;
        graphics.strokeColor = long ? new Color('#7ED9B0') : new Color('#8FB9E8');
        graphics.lineWidth = 14;
        graphics.moveTo(x - 88, y + 29);
        graphics.lineTo(x - 38, y + 29);
        graphics.lineTo(x - 38, y - 29);
        graphics.lineTo(long ? x + 8 : x + 88, y - 29);
        if (long) {
            graphics.lineTo(x + 8, y + 29);
            graphics.lineTo(x + 88, y + 29);
        }
        graphics.stroke();
    }

    private drawButton(x: number, y: number, width: number, height: number): void {
        this.graphics.fillColor = new Color('#29405C');
        this.graphics.rect(x, y, width, height);
        this.graphics.fill();
    }

    private center(point: PhaseBGridPoint, grid: GridDefinition): PhaseBPoint {
        return this.layout.gridPointCenter(point, grid);
    }
}
