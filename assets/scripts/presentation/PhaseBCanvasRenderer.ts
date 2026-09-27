import { Color, Graphics } from 'cc';
import { FROST_COIL, RIVET_GUN } from '../config/PhaseBCombatConfig';
import { towerAtLevel } from '../systems/TowerLevelRules';
import { cellKey, type GridDefinition } from '../core/GridTypes';
import type { BattleResultViewModel } from './BattleResultViewModel';
import type { PhaseBSceneState } from './PhaseBSceneState';
import { CoreObjectiveView } from './CoreObjectiveView';
import { BattlefieldSurfaceView } from './BattlefieldSurfaceView';
import { EnemySlowIndicatorView } from './EnemySlowIndicatorView';
import { enemySlowVisualStrength } from './UnitVisualMotion';
import {
    PHASE_B_GRID_TABS,
    PHASE_B_FROST_BUTTON,
    PHASE_B_EARLY_WAVE_BUTTON,
    PHASE_B_RESULT_RESTART_BUTTON,
    PHASE_B_SOUND_BUTTON,
    PHASE_B_SPEED_BUTTON,
    PHASE_B_RESET_BUTTON,
    PHASE_B_PLAY_BUTTON,
    PHASE_B_RIVET_BUTTON,
    PHASE_B_UPGRADE_BUTTON,
    type PhaseBGridPoint,
    type PhaseBPoint,
    PhaseBLayout,
} from './PhaseBLayout';

/**
 * 程序化灰盒渲染器只读取玩法快照，不持有经济、状态机或输入状态。
 * 后续替换 Sprite/Prefab 时可以整体替换此类，而不改动战斗编排。
 */
export class PhaseBCanvasRenderer {
    private readonly coreObjective: CoreObjectiveView;
    private readonly battlefieldSurface: BattlefieldSurfaceView;

    public constructor(
        private readonly graphics: Graphics,
        private readonly layout: PhaseBLayout,
    ) {
        this.coreObjective = new CoreObjectiveView(graphics, layout);
        this.battlefieldSurface = new BattlefieldSurfaceView(graphics, layout);
    }

    public render(state: PhaseBSceneState): void {
        const graphics = this.graphics;
        graphics.clear();
        graphics.fillColor = new Color(9, 15, 26, 65);
        graphics.rect(-540, -960, 1080, 1920);
        graphics.fill();
        this.drawInterfacePanels();
        if (state.qaMode) this.drawTabs(state);
        else this.drawLevelBanner();
        this.drawBoard(state);
        this.drawControls(state);
        this.drawResultOverlay(state.result);
    }

    private drawInterfacePanels(): void {
        const graphics = this.graphics;
        const safeHalf = this.layout.safeHalfWidth;
        // 文字永远压在低对比面板上，避免底图时钟和屋檐抢掉状态信息。
        graphics.fillColor = new Color(13, 24, 38, 190);
        graphics.roundRect(-Math.min(485, safeHalf), 712, Math.min(970, safeHalf * 2), 215, 25);
        graphics.fill();
        // 四项常驻资源各占固定视觉槽，长事件文案不再把关键数字挤成一行小字。
        for (const rect of this.layout.hudCardRects()) {
            graphics.fillColor = new Color(35, 55, 73, 228);
            graphics.roundRect(rect.left, rect.bottom, rect.right - rect.left, rect.top - rect.bottom, 14);
            graphics.fill();
        }
        graphics.fillColor = new Color(13, 24, 38, 168);
        graphics.roundRect(-Math.min(500, safeHalf), -950, Math.min(1000, safeHalf * 2), 465, 25);
        graphics.fill();
    }

    private drawTabs(state: PhaseBSceneState): void {
        const graphics = this.graphics;
        for (const tab of PHASE_B_GRID_TABS) {
            const rect = this.layout.safeRect({ ...tab, bottom: 610, top: 700 });
            graphics.fillColor = tab.id === state.selectedGridId ? new Color('#C68A35') : new Color('#263A55');
            graphics.rect(rect.left, rect.bottom, rect.right - rect.left, rect.top - rect.bottom);
            graphics.fill();
        }
        this.drawGridCode(-292, 655, [9, 1, 3]);
        this.drawGridCode(0, 655, [1, 0, 1, 4]);
        this.drawGridCode(292, 655, [8, 1, 3]);
    }

    private drawLevelBanner(): void {
        const graphics = this.graphics;
        const width = Math.min(860, this.layout.safeHalfWidth * 2);
        graphics.fillColor = new Color('#263A55');
        graphics.roundRect(-width / 2, 615, width, 85, 18);
        graphics.fill();
        graphics.fillColor = new Color('#F4D58D');
        graphics.circle(-375, 657, 15);
        graphics.fill();
        graphics.strokeColor = new Color('#7ED9B0');
        graphics.lineWidth = 8;
        graphics.moveTo(-350, 657);
        graphics.lineTo(-295, 657);
        graphics.stroke();
    }

    private drawBoard(state: PhaseBSceneState): void {
        const graphics = this.graphics;
        const metrics = this.layout.boardMetrics(state.grid);
        this.battlefieldSurface.draw(state);
        if (!state.useUnitSprites) {
            for (const key of Array.from(state.towers)) {
                const [column, row] = key.split(',').map(Number);
                const center = this.center({ column, row }, state.grid);
                this.drawTower(center, metrics.cellSize, state.towerIdsByCell.get(key) === 'frost-coil');
            }
        }
        // 升级环位于贴图层下方；Lv3 再加内环，不依赖额外切图也能辨认满级塔。
        for (const [key, level] of Array.from(state.towerLevelsByCell.entries())) {
            if (level < 2) continue;
            const [column, row] = key.split(',').map(Number);
            const center = this.center({ column, row }, state.grid);
            graphics.strokeColor = new Color('#FFE09C');
            graphics.lineWidth = 5;
            graphics.circle(center.x, center.y, metrics.cellSize * 0.42);
            graphics.stroke();
            if (level >= 3) {
                graphics.strokeColor = new Color('#7DE8EF');
                graphics.lineWidth = 4;
                graphics.circle(center.x, center.y, metrics.cellSize * 0.34);
                graphics.stroke();
            }
        }

        this.drawRouteChange(state, metrics.cellSize);
        this.drawRouteArrows(state, metrics.cellSize);
        this.drawInspectedTowerRange(state, metrics.cellSize);
        this.drawPlacementRange(state, metrics.cellSize);
        this.coreObjective.draw(state.grid, state.coreHealth, state.maxCoreHealth);

        for (const enemy of state.enemies) {
            const from = this.center(enemy.fromCell, state.grid);
            const to = this.center(enemy.toCell, state.grid);
            const x = from.x + (to.x - from.x) * enemy.progress;
            const y = from.y + (to.y - from.y) * enemy.progress;
            if (!state.useUnitSprites) {
                const runner = enemy.archetype.id === 'clockwork-runner';
                const heavy = enemy.archetype.id === 'iron-canister-hauler';
                graphics.fillColor = new Color(heavy ? '#D7A455' : runner ? '#33D7E7' : '#F06A63');
                if (heavy) graphics.roundRect(x - metrics.cellSize * 0.31, y - metrics.cellSize * 0.31,
                    metrics.cellSize * 0.62, metrics.cellSize * 0.62, 8);
                else graphics.circle(x, y, metrics.cellSize * 0.25);
                graphics.fill();
                graphics.strokeColor = new Color(runner ? '#D1FCFF' : '#FFF1CF');
                graphics.lineWidth = 4;
                if (heavy) graphics.roundRect(x - metrics.cellSize * 0.31, y - metrics.cellSize * 0.31,
                    metrics.cellSize * 0.62, metrics.cellSize * 0.62, 8);
                else graphics.circle(x, y, metrics.cellSize * 0.25);
                graphics.stroke();
            }
            if (!state.useUnitSprites && enemy.slowRemainingSeconds > 0) {
                const strength = enemySlowVisualStrength(enemy.slowRemainingSeconds, FROST_COIL.effect?.durationSeconds ?? 0);
                EnemySlowIndicatorView.draw(graphics, x, y, metrics.cellSize * 0.31, strength);
            }
            if (!state.useUnitSprites) {
                const healthWidth = metrics.cellSize * 0.62;
                graphics.fillColor = new Color('#35262C');
                graphics.rect(x - healthWidth / 2, y + metrics.cellSize * 0.42, healthWidth, 7);
                graphics.fill();
                graphics.fillColor = new Color('#69D391');
                graphics.rect(x - healthWidth / 2, y + metrics.cellSize * 0.42, healthWidth * Math.max(0, enemy.health / enemy.archetype.maxHealth), 7);
                graphics.fill();
            }
        }
        this.drawCombatFeedback(state, metrics.cellSize);
    }

    private drawTower(center: PhaseBPoint, cellSize: number, frost: boolean): void {
        const graphics = this.graphics;
        graphics.fillColor = new Color('#172235');
        graphics.circle(center.x, center.y - cellSize * 0.04, cellSize * 0.3);
        graphics.fill();
        graphics.strokeColor = new Color(frost ? '#DDFBFF' : '#FFF0BB');
        graphics.lineWidth = 4;
        graphics.circle(center.x, center.y, cellSize * 0.24);
        graphics.stroke();
        if (frost) {
            graphics.strokeColor = new Color('#8BE8F4');
            graphics.lineWidth = 5;
            for (let spoke = 0; spoke < 4; spoke += 1) {
                const angle = spoke * Math.PI / 2;
                graphics.moveTo(center.x, center.y);
                graphics.lineTo(center.x + Math.cos(angle) * cellSize * 0.2, center.y + Math.sin(angle) * cellSize * 0.2);
            }
            graphics.stroke();
            graphics.fillColor = new Color('#E3FAFF');
            graphics.circle(center.x, center.y, cellSize * 0.09);
            graphics.fill();
            return;
        }
        graphics.fillColor = new Color('#F4C66A');
        graphics.rect(center.x - cellSize * 0.08, center.y + cellSize * 0.02, cellSize * 0.16, cellSize * 0.31);
        graphics.fill();
        graphics.fillColor = new Color('#E8D5A3');
        graphics.circle(center.x, center.y, cellSize * 0.15);
        graphics.fill();
    }

    private drawRouteArrows(state: PhaseBSceneState, cellSize: number): void {
        const path = state.activePath;
        if (!path || path.length < 2) return;
        const graphics = this.graphics;
        graphics.fillColor = state.preview?.accepted ? new Color('#90FFD0') : new Color('#B8DDF5');
        // 每隔一格画一个方向标，既标明动态改路结果，又避免箭头盖满敌人与塔。
        for (let index = 0; index < path.length - 1; index += 2) {
            const from = this.center(path[index], state.grid);
            const to = this.center(path[index + 1], state.grid);
            const dx = (to.x - from.x) / cellSize;
            const dy = (to.y - from.y) / cellSize;
            const x = (from.x + to.x) / 2;
            const y = (from.y + to.y) / 2;
            const length = cellSize * 0.19;
            const width = cellSize * 0.12;
            graphics.moveTo(x + dx * length, y + dy * length);
            graphics.lineTo(x - dx * length - dy * width, y - dy * length + dx * width);
            graphics.lineTo(x - dx * length + dy * width, y - dy * length - dx * width);
            graphics.close();
            graphics.fill();
        }
    }

    private drawRouteChange(state: PhaseBSceneState, cellSize: number): void {
        const change = state.routeChange;
        const path = state.activePath;
        if (!change || change.delta === 0 || !path || state.preview) return;
        const progress = change.remainingSeconds / change.durationSeconds;
        const alpha = Math.round(190 * progress);
        const graphics = this.graphics;
        graphics.strokeColor = change.delta < 0
            ? new Color(255, 186, 114, alpha)
            : new Color(108, 245, 183, alpha);
        graphics.lineWidth = 3 + 4 * progress;
        // 只描当前真实路径外框，不改逻辑格；动画结束后自动恢复安静的战场层级。
        for (const cell of path) {
            const center = this.center(cell, state.grid);
            const half = cellSize * 0.43;
            graphics.rect(center.x - half, center.y - half, half * 2, half * 2);
            graphics.stroke();
        }
    }

    private drawPlacementRange(state: PhaseBSceneState, cellSize: number): void {
        const preview = state.preview;
        if (!preview) return;
        const center = this.center(preview.cell, state.grid);
        const tower = preview.towerId === 'frost-coil' ? FROST_COIL : RIVET_GUN;
        const color = preview.accepted ? new Color(141, 243, 205, 200) : new Color(255, 129, 129, 205);
        this.drawRangeRing(center, cellSize, tower.rangeCells, color);
        const graphics = this.graphics;
        graphics.fillColor = color;
        graphics.circle(center.x, center.y, cellSize * 0.25);
        graphics.fill();
    }

    private drawInspectedTowerRange(state: PhaseBSceneState, cellSize: number): void {
        const inspected = state.inspectedTower;
        if (!inspected) return;
        const center = this.center(inspected.cell, state.grid);
        const tower = towerAtLevel(inspected.towerId === 'frost-coil' ? FROST_COIL : RIVET_GUN, inspected.level);
        const color = inspected.towerId === 'frost-coil'
            ? new Color(139, 232, 244, 205)
            : new Color(255, 218, 139, 205);
        this.drawRangeRing(center, cellSize, tower.rangeCells, color);
        const graphics = this.graphics;
        graphics.strokeColor = color;
        graphics.lineWidth = 6;
        graphics.circle(center.x, center.y, cellSize * 0.43);
        graphics.stroke();
    }

    private drawRangeRing(center: PhaseBPoint, cellSize: number, rangeCells: number, color: Color): void {
        const graphics = this.graphics;
        graphics.strokeColor = color;
        graphics.lineWidth = 4;
        graphics.circle(center.x, center.y, cellSize * rangeCells);
        graphics.stroke();
    }

    private drawCombatFeedback(state: PhaseBSceneState, cellSize: number): void {
        const graphics = this.graphics;
        for (const tracer of state.feedback.tracers) {
            const origin = this.center(tracer.origin, state.grid);
            const target = this.center(tracer.point, state.grid);
            const life = tracer.remainingSeconds / tracer.durationSeconds;
            graphics.strokeColor = tracer.towerId === 'frost-coil'
                ? new Color(139, 232, 244, Math.round(235 * life))
                : tracer.lethal
                    ? new Color(255, 244, 188, Math.round(255 * life))
                    : new Color(255, 205, 105, Math.round(225 * life));
            graphics.lineWidth = tracer.lethal ? 9 : 6;
            graphics.moveTo(origin.x, origin.y);
            graphics.lineTo(target.x, target.y);
            graphics.stroke();
            graphics.fillColor = tracer.towerId === 'frost-coil'
                ? new Color(190, 248, 255, Math.round(230 * life))
                : new Color(255, 239, 169, Math.round(230 * life));
            graphics.circle(origin.x, origin.y, cellSize * (0.08 + 0.07 * life));
            graphics.fill();
        }
        for (const pulse of state.feedback.slowPulses) {
            const point = this.center(pulse.point, state.grid);
            const progress = 1 - pulse.remainingSeconds / pulse.durationSeconds;
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const radius = cellSize * pulse.radiusCells * (0.58 + 0.42 * easeOut);
            const life = 1 - progress;
            // 脉冲与短弹道独立衰减；淡色底面交代覆盖范围，轮廓只在真正减速时出现。
            graphics.fillColor = new Color(89, 208, 231, Math.round(25 * life));
            graphics.circle(point.x, point.y, radius);
            graphics.fill();
            graphics.strokeColor = new Color(131, 242, 255,
                Math.round((pulse.affectedEnemyCount > 1 ? 205 : 130) * life));
            graphics.lineWidth = pulse.affectedEnemyCount > 1 ? 8 : 6;
            graphics.circle(point.x, point.y, radius);
            graphics.stroke();
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
        const width = Math.min(860, this.layout.safeHalfWidth * 2);
        graphics.roundRect(-width / 2, -430, width, 850, 34);
        graphics.fill();
        graphics.fillColor = new Color(result.kind === 'victory' ? '#2F9E72' : '#B84F50');
        graphics.rect(-width / 2, 350, width, 70);
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

    private drawControls(state: PhaseBSceneState): void {
        const graphics = this.graphics;
        const soundRect = this.layout.safeRect(PHASE_B_SOUND_BUTTON);
        const speedRect = this.layout.safeRect(PHASE_B_SPEED_BUTTON);
        const earlyRect = this.layout.safeRect(PHASE_B_EARLY_WAVE_BUTTON);
        const resetRect = this.layout.safeRect(PHASE_B_RESET_BUTTON);
        const playRect = this.layout.safeRect(PHASE_B_PLAY_BUTTON);
        graphics.fillColor = new Color(state.soundEnabled ? '#2C605E' : '#354355');
        graphics.roundRect(
            soundRect.left,
            soundRect.bottom,
            soundRect.right - soundRect.left,
            soundRect.top - soundRect.bottom,
            17,
        );
        graphics.fill();
        this.drawButton(resetRect.left, resetRect.bottom, resetRect.right - resetRect.left, resetRect.top - resetRect.bottom);
        this.drawButton(playRect.left, playRect.bottom, playRect.right - playRect.left, playRect.top - playRect.bottom);
        if (state.qaMode) {
            this.drawButton(-440, -700, 280, 90);
            this.drawButton(160, -700, 280, 90);
            this.drawRouteIcon(-300, -655, false);
            this.drawRouteIcon(300, -655, true);
        }
        this.drawResetIcon(-270, -558);
        this.drawPhaseIcon(270, -558, state.showPlayControl);
        graphics.fillColor = new Color('#29405C');
        graphics.roundRect(
            speedRect.left,
            speedRect.bottom,
            speedRect.right - speedRect.left,
            speedRect.top - speedRect.bottom,
            20,
        );
        graphics.fill();
        graphics.fillColor = state.canStartNextWaveEarly ? new Color('#2F9E72') : new Color('#354355');
        graphics.roundRect(
            earlyRect.left,
            earlyRect.bottom,
            earlyRect.right - earlyRect.left,
            earlyRect.top - earlyRect.bottom,
            20,
        );
        graphics.fill();
        this.drawTowerButton(PHASE_B_RIVET_BUTTON, state.gold >= RIVET_GUN.cost, state.selectedTowerId === RIVET_GUN.id, '#D5A84B');
        this.drawTowerButton(PHASE_B_FROST_BUTTON, state.gold >= FROST_COIL.cost, state.selectedTowerId === FROST_COIL.id, '#62BCD0');
        const upgrade = state.inspectedTower;
        if (upgrade) {
            graphics.fillColor = new Color(upgrade.upgradeCost === null || state.gold < upgrade.upgradeCost ? '#596273' : '#C79958');
            graphics.roundRect(PHASE_B_UPGRADE_BUTTON.left, PHASE_B_UPGRADE_BUTTON.bottom,
                PHASE_B_UPGRADE_BUTTON.right - PHASE_B_UPGRADE_BUTTON.left,
                PHASE_B_UPGRADE_BUTTON.top - PHASE_B_UPGRADE_BUTTON.bottom, 18);
            graphics.fill();
        }
    }

    private drawTowerButton(rect: { left: number; right: number; bottom: number; top: number }, affordable: boolean, selected: boolean, color: string): void {
        const graphics = this.graphics;
        graphics.fillColor = new Color(affordable ? color : '#596273');
        graphics.roundRect(rect.left, rect.bottom, rect.right - rect.left, rect.top - rect.bottom, 16);
        graphics.fill();
        if (!selected) return;
        graphics.strokeColor = new Color('#FFF1CF');
        graphics.lineWidth = 8;
        graphics.roundRect(rect.left + 5, rect.bottom + 5, rect.right - rect.left - 10, rect.top - rect.bottom - 10, 13);
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
