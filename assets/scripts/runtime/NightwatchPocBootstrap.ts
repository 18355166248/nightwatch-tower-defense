import {
    _decorator,
    Color,
    Component,
    EventTouch,
    game,
    Game,
    Graphics,
    Label,
    Node,
    ResolutionPolicy,
    UITransform,
    Vec3,
    view,
} from 'cc';
import { PHASE_A_FIXTURES } from '../config/PhaseAFixtures';
import { DEFAULT_GRID_ID, PHASE_A_GRIDS, PHASE_A_INITIAL_GOLD, PHASE_A_TOWER_COST } from '../config/PhaseAGrids';
import { PHASE_B_WAVE_ONE, RIVET_GUN } from '../config/PhaseBCombatConfig';
import { cellKey, sameCell, type EnemyRouteState, type GridCell, type GridId } from '../core/GridTypes';
import { PhaseBDebugInput, type PhaseBDebugAction } from '../input/PhaseBDebugInput';
import { CombatFeedbackRuntime } from '../presentation/CombatFeedbackRuntime';
import { BattleStateMachine } from '../systems/BattleStateMachine';
import { EconomyLedger } from '../systems/EconomyLedger';
import { PlacementModel, type PlacementPreview } from '../systems/PlacementModel';
import { WaveCombatRuntime, type GridPoint } from '../systems/WaveCombatRuntime';

const { ccclass } = _decorator;

const DESIGN_WIDTH = 1080;
const DESIGN_HEIGHT = 1920;
const BOARD_TOP = 610;
const BOARD_MAX_WIDTH = 860;
const BOARD_MAX_HEIGHT = 1110;
const TOWER_BUTTON = { left: -160, right: 160, bottom: -890, top: -735 };
const GRID_TABS: readonly { id: GridId; label: string; left: number; right: number }[] = [
    { id: 'grid-9x13', label: '9×13', left: -430, right: -155 },
    { id: 'grid-10x14', label: '10×14', left: -135, right: 135 },
    { id: 'grid-8x13', label: '8×13', left: 155, right: 430 },
];

type InputMode = 'idle' | 'tower-pressed' | 'armed' | 'dragging' | 'click-preview';

@ccclass('NightwatchPocBootstrap')
export class NightwatchPocBootstrap extends Component {
    private canvas: Node | null = null;
    private graphics: Graphics | null = null;
    private titleLabel: Label | null = null;
    private statusLabel: Label | null = null;
    private helpLabel: Label | null = null;
    private economy = new EconomyLedger(PHASE_A_INITIAL_GOLD);
    private model = new PlacementModel(PHASE_A_GRIDS[DEFAULT_GRID_ID], this.economy, PHASE_A_TOWER_COST);
    private battle = new BattleStateMachine(1);
    private combat = new WaveCombatRuntime(PHASE_A_GRIDS[DEFAULT_GRID_ID], RIVET_GUN);
    private readonly feedback = new CombatFeedbackRuntime();
    private selectedGridId: GridId = DEFAULT_GRID_ID;
    private preview: PlacementPreview | null = null;
    private inputMode: InputMode = 'idle';
    private primaryTouchId: number | null = null;
    private pressStart = new Vec3();
    private preparing = true;
    private pausedByLifecycle = false;
    private statusText = '拖动底部炮塔，或点塔后双击格子提交';
    private publishedDiagnostics = '';
    private readonly debugInput = new PhaseBDebugInput((action) => this.handleDebugAction(action));

    protected override onLoad(): void {
        view.setDesignResolutionSize(DESIGN_WIDTH, DESIGN_HEIGHT, ResolutionPolicy.FIXED_HEIGHT);
        this.canvas = this.findCanvas();
        if (!this.canvas) throw new Error('Phase A 场景缺少 Canvas');

        const layer = new Node('PhaseAProgrammaticLayer');
        layer.layer = this.canvas.layer;
        const transform = layer.addComponent(UITransform);
        transform.setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
        this.canvas.addChild(layer);
        this.titleLabel = this.createLabel(layer, 46, new Color('#F4D58D'), 850);
        this.statusLabel = this.createLabel(layer, 27, new Color('#D7E6F5'), 755);
        this.statusLabel.node.getComponent(UITransform)?.setContentSize(920, 125);
        this.helpLabel = this.createLabel(layer, 25, new Color('#8FA9C4'), -945);
        // Cocos UI 子节点按逆序提交批次：底板节点最后加入，使其先画；前面的 Label 才能稳定盖在色块上。
        const graphicsNode = new Node('PhaseAGraphics');
        graphicsNode.layer = layer.layer;
        graphicsNode.addComponent(UITransform).setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
        layer.addChild(graphicsNode);
        this.graphics = graphicsNode.addComponent(Graphics);

        this.canvas.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.canvas.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.canvas.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.canvas.on(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
        game.on(Game.EVENT_HIDE, this.onLifecycleHide, this);
        this.debugInput.attach();
        this.redraw();
    }

    protected override onDestroy(): void {
        this.cancelInput('场景销毁');
        this.canvas?.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.canvas?.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.canvas?.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.canvas?.off(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
        game.off(Game.EVENT_HIDE, this.onLifecycleHide, this);
        this.debugInput.detach();
    }

    protected override update(deltaTime: number): void {
        const step = Math.min(deltaTime, 0.05);
        this.feedback.advance(step);
        if (!this.preparing && this.battle.snapshot.phase !== 'paused') this.advanceCombat(step);
        this.redraw();
    }

    private findCanvas(): Node | null {
        const scene = this.node.scene;
        if (!scene) return null;
        return scene.getChildByName('Canvas');
    }

    private createLabel(parent: Node, fontSize: number, color: Color, y: number): Label {
        const node = new Node('Label');
        node.layer = parent.layer;
        node.setPosition(-460, y, 0);
        const transform = node.addComponent(UITransform);
        const label = node.addComponent(Label);
        // Label 挂载时会初始化 UITransform，尺寸必须在挂载后设置，否则 SHRINK 会把按钮字压成细线。
        transform.setContentSize(920, 80);
        transform.setAnchorPoint(0, 0.5);
        label.fontSize = fontSize;
        label.lineHeight = Math.round(fontSize * 1.25);
        label.color = color;
        label.overflow = Label.Overflow.NONE;
        parent.addChild(node);
        return label;
    }

    private onTouchStart(event: EventTouch): void {
        const id = event.getID();
        if (this.primaryTouchId !== null && this.primaryTouchId !== id) return;
        this.primaryTouchId = id;
        const point = this.localPoint(event);
        this.pressStart.set(point);

        if (this.handleTopControls(point)) {
            this.primaryTouchId = null;
            return;
        }
        if (this.insideRect(point, TOWER_BUTTON)) {
            this.inputMode = 'tower-pressed';
            this.preview = null;
            this.statusText = '拖到网格落塔；轻点则进入点击建塔';
            return;
        }
        this.handleGridTap(point);
    }

    private onTouchMove(event: EventTouch): void {
        if (event.getID() !== this.primaryTouchId || this.inputMode !== 'tower-pressed' && this.inputMode !== 'dragging') return;
        const point = this.localPoint(event);
        if (this.inputMode === 'tower-pressed' && Vec3.distance(point, this.pressStart) > 18) this.inputMode = 'dragging';
        if (this.inputMode === 'dragging') this.updatePreviewAt(point);
    }

    private onTouchEnd(event: EventTouch): void {
        if (event.getID() !== this.primaryTouchId) return;
        if (this.inputMode === 'dragging') {
            this.commitCurrentPreview();
        } else if (this.inputMode === 'tower-pressed') {
            this.inputMode = 'armed';
            this.statusText = '已选炮塔：点格子预览，再点同一格提交';
        }
        this.primaryTouchId = null;
    }

    private onTouchCancel(event: EventTouch): void {
        if (event.getID() === this.primaryTouchId) this.cancelInput('触摸已取消，未扣费');
    }

    private onLifecycleHide(): void {
        // 首次生命周期阻塞统一取消活动手势，恢复后保持暂停，避免后台补跑敌人。
        this.cancelInput('页面进入后台：操作取消，战斗保持暂停');
        if (!this.preparing) {
            this.battle.pause();
            this.pausedByLifecycle = true;
        }
    }

    private handleTopControls(point: Vec3): boolean {
        if (point.y >= 610 && point.y <= 700) {
            for (const tab of GRID_TABS) {
                if (point.x >= tab.left && point.x <= tab.right) {
                    this.switchGrid(tab.id);
                    return true;
                }
            }
        }
        if (point.y >= -700 && point.y <= -610 && point.x >= -440 && point.x <= -160) {
            this.applyFixture('shortFold');
            return true;
        }
        if (point.y >= -700 && point.y <= -610 && point.x >= 160 && point.x <= 440) {
            this.applyFixture('longSnake');
            return true;
        }
        if (point.y >= -600 && point.y <= -515 && point.x >= -440 && point.x <= -100) {
            this.resetGrid();
            return true;
        }
        if (point.y >= -600 && point.y <= -515 && point.x >= 100 && point.x <= 440) {
            this.toggleBattle();
            return true;
        }
        return false;
    }

    private handleDebugAction(action: PhaseBDebugAction): void {
        if (action === 'reset') this.resetGrid();
        else if (action === 'apply-short') this.applyFixture('shortFold');
        else if (action === 'apply-long') this.applyFixture('longSnake');
        else this.toggleBattle();
    }

    private toggleBattle(): void {
        if (this.battle.snapshot.phase === 'paused') {
            this.pausedByLifecycle = false;
            this.battle.resume();
            this.statusText = '已继续第 1 波';
            return;
        }
        if (!this.preparing) {
            this.battle.pause();
            this.statusText = '已暂停，保留当前波次状态';
            return;
        }
        const initialPath = this.model.grid.rows - 1;
        const pathDelta = this.model.flowField.distanceAt(this.model.grid.entry) - initialPath;
        const start = this.battle.startFirstWave(this.model.towers.size, pathDelta);
        if (!start.accepted) {
            this.statusText = start.reason === 'needs-two-towers'
                ? '第一波门禁：至少建造 2 座机枪塔'
                : '第一波门禁：路径至少增加 2 格';
            return;
        }
        this.combat.start(PHASE_B_WAVE_ONE);
        this.preparing = false;
        this.statusText = '第 1 波：8 名发条步兵进场';
    }

    private handleGridTap(point: Vec3): void {
        const cell = this.pointToCell(point);
        if (!cell) return;
        if (this.inputMode === 'armed') {
            this.preview = this.model.preview(cell, this.enemyStates());
            this.inputMode = 'click-preview';
            this.statusText = this.preview.accepted ? '预览合法：再点同一格提交' : this.rejectText(this.preview.reason);
            return;
        }
        if (this.inputMode === 'click-preview') {
            if (this.preview && sameCell(this.preview.cell, cell)) this.commitCurrentPreview();
            else {
                this.preview = this.model.preview(cell, this.enemyStates());
                this.statusText = this.preview.accepted ? '已更换预览格：再点同一格提交' : this.rejectText(this.preview.reason);
            }
            return;
        }
        if (this.inputMode === 'idle' && this.model.towers.has(cellKey(cell))) {
            const sold = this.model.sell(cell, this.preparing && !this.pausedByLifecycle);
            this.statusText = sold ? '准备态全额撤销成功' : '运行中不可出售；切回准备态再撤销';
        }
    }

    private updatePreviewAt(point: Vec3): void {
        const cell = this.pointToCell(point);
        if (!cell) {
            this.preview = null;
            this.statusText = '画布或战场外：松手将取消';
            return;
        }
        if (this.preview && sameCell(this.preview.cell, cell)) return;
        this.preview = this.model.preview(cell, this.enemyStates());
        this.statusText = this.preview.accepted ? `合法落点 (${cell.column},${cell.row})` : this.rejectText(this.preview.reason);
    }

    private commitCurrentPreview(): void {
        if (!this.preview) {
            this.cancelInput('没有有效落点，未扣费');
            return;
        }
        const result = this.model.commit(this.preview, this.enemyStates());
        this.statusText = result.accepted
            ? `建造成功 · 金币 ${result.gold} · 地图版本 ${result.mapVersion}`
            : this.rejectText(result.reason);
        this.preview = null;
        this.inputMode = 'idle';
    }

    private cancelInput(message: string): void {
        this.primaryTouchId = null;
        this.preview = null;
        this.inputMode = 'idle';
        this.statusText = message;
    }

    private switchGrid(id: GridId): void {
        this.selectedGridId = id;
        this.resetGrid();
        this.statusText = `已切换 ${PHASE_A_GRIDS[id].columns}×${PHASE_A_GRIDS[id].rows}，证据需独立记录`;
    }

    private resetGrid(initialGold = PHASE_A_INITIAL_GOLD): void {
        const grid = PHASE_A_GRIDS[this.selectedGridId];
        this.economy = new EconomyLedger(initialGold);
        this.model = new PlacementModel(grid, this.economy, PHASE_A_TOWER_COST);
        this.battle = new BattleStateMachine(1);
        this.combat = new WaveCombatRuntime(grid, RIVET_GUN);
        this.preparing = true;
        this.pausedByLifecycle = false;
        this.feedback.clear();
        this.cancelInput('已重置为空网格');
    }

    private applyFixture(kind: 'shortFold' | 'longSnake'): void {
        const cells = PHASE_A_FIXTURES[this.selectedGridId][kind];
        this.resetGrid(kind === 'longSnake' ? 450 : 120);
        for (const cell of cells) {
            const preview = this.model.preview(cell, []);
            const result = this.model.commit(preview, []);
            if (!result.accepted) throw new Error(`${kind} fixture 无法提交：${result.reason}`);
        }
        this.statusText = `${kind === 'shortFold' ? '短折线' : '长蛇形'} fixture · 路径 ${this.model.flowField.distanceAt(this.model.grid.entry)} 格`;
    }

    private advanceCombat(deltaTime: number): void {
        const result = this.combat.tick(deltaTime, this.model.flowField, this.model.towers);
        this.feedback.consume(result);
        for (const killed of result.killed) {
            this.economy.credit(killed.archetype.killReward);
        }
        if (result.killed.length > 0 || result.leaked.length > 0) {
            this.battle.resolveCombatOutcome(result.leaked.length, this.combat.enemies.length);
        }
        if (result.spawningCompleted) this.battle.markSpawningComplete(this.combat.enemies.length);
        const phase = this.battle.snapshot.phase;
        if (phase === 'victory') this.statusText = `第 1 波清场！击杀奖励已结算，剩余金币 ${this.model.gold}`;
        else if (phase === 'defeat') this.statusText = '核心已失守';
        else if (result.killed.length > 0) this.statusText = `击杀 ${result.killed.length} 名敌人 · +${result.killed.reduce((sum, enemy) => sum + enemy.archetype.killReward, 0)} 金币`;
        else if (result.leaked.length > 0) this.statusText = `漏怪 ${result.leaked.length} 名 · 核心生命 ${this.battle.snapshot.coreHealth}`;
    }

    private enemyStates(): readonly EnemyRouteState[] {
        // 生命周期暂停只冻结时间，不抹掉敌人的已承诺路段；恢复前仍不可在 from/to 格落塔。
        if (this.preparing) return [];
        return this.combat.enemyRouteStates();
    }

    private boardMetrics(): { cellSize: number; left: number; bottom: number; width: number; height: number } {
        const grid = this.model.grid;
        const cellSize = Math.floor(Math.min(BOARD_MAX_WIDTH / grid.columns, BOARD_MAX_HEIGHT / grid.rows));
        const width = cellSize * grid.columns;
        const height = cellSize * grid.rows;
        return { cellSize, width, height, left: -width / 2, bottom: BOARD_TOP - height };
    }

    private pointToCell(point: Vec3): GridCell | null {
        const metrics = this.boardMetrics();
        if (point.x < metrics.left || point.x >= metrics.left + metrics.width) return null;
        if (point.y < metrics.bottom || point.y >= metrics.bottom + metrics.height) return null;
        return {
            column: Math.floor((point.x - metrics.left) / metrics.cellSize),
            row: Math.floor((metrics.bottom + metrics.height - point.y) / metrics.cellSize),
        };
    }

    private cellCenter(cell: GridCell): Vec3 {
        return this.gridPointCenter(cell);
    }

    private gridPointCenter(point: GridPoint): Vec3 {
        const metrics = this.boardMetrics();
        return new Vec3(
            metrics.left + (point.column + 0.5) * metrics.cellSize,
            metrics.bottom + metrics.height - (point.row + 0.5) * metrics.cellSize,
            0,
        );
    }

    private localPoint(event: EventTouch): Vec3 {
        const location = event.getUILocation();
        const transform = this.canvas?.getComponent(UITransform);
        return transform?.convertToNodeSpaceAR(new Vec3(location.x, location.y, 0)) ?? new Vec3();
    }

    private redraw(): void {
        const graphics = this.graphics;
        if (!graphics) return;
        graphics.clear();
        graphics.fillColor = new Color('#101827');
        graphics.rect(-540, -960, 1080, 1920);
        graphics.fill();

        this.drawTabs(graphics);
        this.drawBoard(graphics);
        this.drawControls(graphics);
        if (this.titleLabel) this.titleLabel.string = '夜城防线 · Phase B 第一波灰盒';
        if (this.statusLabel) {
            const path = this.preview?.path?.length ? this.preview.path.length - 1 : this.model.flowField.distanceAt(this.model.grid.entry);
            const battle = this.battle.snapshot;
            this.statusLabel.string = `${this.statusText}\n金币 ${this.model.gold} · 路径 ${path} 格 · 波次 ${battle.wave}/1 · 核心 ${battle.coreHealth} · ${this.phaseText()}`;
        }
        if (this.helpLabel) this.helpLabel.string = '先建 2 塔且路径 +2｜↻重置 ▷开波/暂停｜键盘 F/G/R/空格｜底部机枪塔';
        this.publishBrowserDiagnostics();
    }

    private publishBrowserDiagnostics(): void {
        if (typeof document === 'undefined') return;
        const canvas = document.querySelector('canvas');
        if (!canvas) return;
        const pathLength = this.preview?.accepted && this.preview.path
            ? this.preview.path.length - 1
            : this.model.flowField.distanceAt(this.model.grid.entry);
        const diagnostics = JSON.stringify({
            gridId: this.selectedGridId,
            columns: this.model.grid.columns,
            rows: this.model.grid.rows,
            gold: this.model.gold,
            mapVersion: this.model.mapVersion,
            towerCount: this.model.towers.size,
            pathLength,
            phase: this.battle.snapshot.phase,
            wave: this.battle.snapshot.wave,
            coreHealth: this.battle.snapshot.coreHealth,
            activeEnemyCount: this.combat.enemies.length,
            spawningCompleted: this.combat.isSpawningComplete,
            spawnedEnemyCount: this.combat.totals.spawned,
            defeatedEnemyCount: this.combat.totals.killed,
            leakedEnemyCount: this.combat.totals.leaked,
            activeFeedbackCount: this.activeFeedbackCount(),
            inputMode: this.inputMode,
            previewAccepted: this.preview?.accepted ?? null,
            status: this.statusText,
        });
        if (diagnostics === this.publishedDiagnostics) return;
        // 浏览器 POC 用 DOM 属性暴露只读快照，方便 QA 核对画布操作的原子性，不提供跳过输入的修改接口。
        canvas.setAttribute('data-phase-a-state', diagnostics);
        canvas.setAttribute(
            'aria-label',
            `夜城防线游戏画布，${this.model.grid.columns}乘${this.model.grid.rows}，金币${this.model.gold}，路径${pathLength}格，${this.statusText}`,
        );
        this.publishedDiagnostics = diagnostics;
    }

    private drawTabs(graphics: Graphics): void {
        for (const tab of GRID_TABS) {
            graphics.fillColor = tab.id === this.selectedGridId ? new Color('#C68A35') : new Color('#263A55');
            graphics.rect(tab.left, 610, tab.right - tab.left, 90);
            graphics.fill();
        }
        this.drawGridCode(graphics, -292, 655, [9, 1, 3]);
        this.drawGridCode(graphics, 0, 655, [1, 0, 1, 4]);
        this.drawGridCode(graphics, 292, 655, [8, 1, 3]);
    }

    private drawBoard(graphics: Graphics): void {
        const metrics = this.boardMetrics();
        const activePath = this.preview?.accepted && this.preview.path
            ? this.preview.path
            : this.model.flowField.pathFrom(this.model.grid.entry);

        if (activePath && activePath.length > 1) {
            graphics.strokeColor = this.preview?.accepted ? new Color('#5FE1A2') : new Color('#5E8FC6');
            graphics.lineWidth = Math.max(10, metrics.cellSize * 0.18);
            const first = this.cellCenter(activePath[0]);
            graphics.moveTo(first.x, first.y);
            for (let index = 1; index < activePath.length; index += 1) {
                const point = this.cellCenter(activePath[index]);
                graphics.lineTo(point.x, point.y);
            }
            graphics.stroke();
        }

        for (let row = 0; row < this.model.grid.rows; row += 1) {
            for (let column = 0; column < this.model.grid.columns; column += 1) {
                const cell = { column, row };
                const center = this.cellCenter(cell);
                const half = metrics.cellSize / 2;
                let fill = new Color(31, 47, 67, 160);
                if (sameCell(cell, this.model.grid.entry)) fill = new Color('#5678D4');
                else if (sameCell(cell, this.model.grid.exit)) fill = new Color('#D65F5F');
                else if (this.model.towers.has(cellKey(cell))) fill = new Color('#D5A84B');
                if (this.preview && sameCell(cell, this.preview.cell)) {
                    fill = this.preview.accepted ? new Color('#45C486') : new Color('#E05252');
                }
                graphics.fillColor = fill;
                graphics.rect(center.x - half + 3, center.y - half + 3, metrics.cellSize - 6, metrics.cellSize - 6);
                graphics.fill();
                graphics.strokeColor = new Color(111, 143, 169, 130);
                graphics.lineWidth = 2;
                graphics.rect(center.x - half, center.y - half, metrics.cellSize, metrics.cellSize);
                graphics.stroke();
                if (this.model.towers.has(cellKey(cell))) {
                    graphics.fillColor = new Color('#172235');
                    graphics.circle(center.x, center.y, metrics.cellSize * 0.22);
                    graphics.fill();
                }
            }
        }

        for (const enemy of this.combat.enemies) {
            const from = this.cellCenter(enemy.fromCell);
            const to = this.cellCenter(enemy.toCell);
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

        this.drawCombatFeedback(graphics, metrics.cellSize);
    }

    private drawCombatFeedback(graphics: Graphics, cellSize: number): void {
        const feedback = this.feedback.snapshot;
        for (const tracer of feedback.tracers) {
            const origin = this.gridPointCenter(tracer.origin);
            const target = this.gridPointCenter(tracer.point);
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
        for (const impact of feedback.impacts) {
            const point = this.gridPointCenter(impact.point);
            const progress = 1 - impact.remainingSeconds / impact.durationSeconds;
            graphics.strokeColor = new Color(255, 241, 207, Math.round(230 * (1 - progress)));
            graphics.lineWidth = 5;
            graphics.circle(point.x, point.y, cellSize * (0.1 + progress * 0.2));
            graphics.stroke();
        }
        for (const death of feedback.deaths) {
            const point = this.gridPointCenter(death.point);
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
        for (const reward of feedback.rewards) {
            const point = this.gridPointCenter(reward.point);
            const progress = 1 - reward.remainingSeconds / reward.durationSeconds;
            const y = point.y + cellSize * (0.35 + progress * 0.55);
            const alpha = Math.round(255 * Math.min(1, reward.remainingSeconds / 0.2));
            graphics.fillColor = new Color(244, 198, 82, alpha);
            for (let coin = 0; coin < Math.min(4, reward.amount); coin += 1) {
                graphics.circle(point.x + (coin - 1.5) * cellSize * 0.11, y, cellSize * 0.055);
                graphics.fill();
            }
        }
        for (const coreHit of feedback.coreHits) {
            const exit = this.cellCenter(this.model.grid.exit);
            const progress = 1 - coreHit.remainingSeconds / coreHit.durationSeconds;
            graphics.strokeColor = new Color(255, 82, 82, Math.round(245 * (1 - progress)));
            graphics.lineWidth = 12;
            graphics.circle(exit.x, exit.y, cellSize * (0.35 + progress * 0.45));
            graphics.stroke();
        }
    }

    private activeFeedbackCount(): number {
        const feedback = this.feedback.snapshot;
        return feedback.tracers.length + feedback.impacts.length + feedback.deaths.length
            + feedback.rewards.length + feedback.coreHits.length;
    }

    private drawControls(graphics: Graphics): void {
        this.drawButton(graphics, -440, -600, 340, 85);
        this.drawButton(graphics, 100, -600, 340, 85);
        this.drawButton(graphics, -440, -700, 280, 90);
        this.drawButton(graphics, 160, -700, 280, 90);
        this.drawResetIcon(graphics, -270, -558);
        this.drawPhaseIcon(graphics, 270, -558);
        this.drawRouteIcon(graphics, -300, -655, false);
        this.drawRouteIcon(graphics, 300, -655, true);
        graphics.fillColor = this.model.gold >= PHASE_A_TOWER_COST ? new Color('#D5A84B') : new Color('#596273');
        graphics.rect(TOWER_BUTTON.left, TOWER_BUTTON.bottom, TOWER_BUTTON.right - TOWER_BUTTON.left, TOWER_BUTTON.top - TOWER_BUTTON.bottom);
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

    private drawGridCode(graphics: Graphics, centerX: number, centerY: number, digits: readonly number[]): void {
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
            this.drawDigit(graphics, digits[index], x, centerY, scale);
            x += digitWidth + gap;
        }
    }

    private drawDigit(graphics: Graphics, digit: number, x: number, y: number, scale: number): void {
        const enabled: Readonly<Record<number, readonly number[]>> = {
            0: [0, 1, 2, 3, 4, 5], 1: [1, 2], 2: [0, 1, 6, 4, 3], 3: [0, 1, 2, 3, 6],
            4: [5, 6, 1, 2], 5: [0, 5, 6, 2, 3], 6: [0, 5, 4, 3, 2, 6], 7: [0, 1, 2],
            8: [0, 1, 2, 3, 4, 5, 6], 9: [0, 1, 2, 3, 5, 6],
        };
        const segments = [
            [2, 18, 18, 4], [18, 2, 4, 18], [18, -18, 4, 18], [2, -22, 18, 4],
            [-2, -18, 4, 18], [-2, 2, 4, 18], [2, -2, 18, 4],
        ] as const;
        graphics.fillColor = new Color('#F2E4BF');
        for (const segment of enabled[digit] ?? []) {
            const [left, bottom, width, height] = segments[segment];
            graphics.rect(x + left * scale, y + bottom * scale, width * scale, height * scale);
            graphics.fill();
        }
    }

    private drawResetIcon(graphics: Graphics, x: number, y: number): void {
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

    private drawPhaseIcon(graphics: Graphics, x: number, y: number): void {
        graphics.fillColor = new Color('#F2E4BF');
        if (this.preparing || this.battle.snapshot.phase === 'paused') {
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

    private drawRouteIcon(graphics: Graphics, x: number, y: number, long: boolean): void {
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

    private drawButton(graphics: Graphics, x: number, y: number, width: number, height: number): void {
        graphics.fillColor = new Color('#29405C');
        graphics.rect(x, y, width, height);
        graphics.fill();
    }

    private insideRect(point: Vec3, rect: { left: number; right: number; bottom: number; top: number }): boolean {
        return point.x >= rect.left && point.x <= rect.right && point.y >= rect.bottom && point.y <= rect.top;
    }

    private phaseText(): string {
        const phase = this.battle.snapshot.phase;
        const labels: Record<typeof phase, string> = {
            preparing: '准备态',
            spawning: '出怪中',
            clearing: '清场中',
            countdown: '波间倒计时',
            paused: this.pausedByLifecycle ? '后台暂停' : '已暂停',
            victory: '已胜利',
            defeat: '已失败',
        };
        return labels[phase];
    }

    private rejectText(reason: PlacementPreview['reason']): string {
        const messages: Record<string, string> = {
            'out-of-bounds': '不能建造：战场外',
            entry: '不能建造：入口格',
            exit: '不能建造：出口格',
            occupied: '不能建造：已有炮塔',
            'enemy-current-cell': '不能建造：敌人当前格',
            'enemy-committed-cell': '不能建造：敌人下一步',
            'would-block-path': '不能建造：会彻底封路',
            'would-force-backtrack': '不能建造：会迫使敌人回头',
            'insufficient-gold': '不能建造：金币不足',
            'stale-preview': '预览已过期，请重新选择',
        };
        return messages[reason ?? ''] ?? '不能建造';
    }
}
