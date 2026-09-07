import {
    _decorator,
    Component,
    EventTouch,
    game,
    Game,
    Graphics,
    Node,
    ResolutionPolicy,
    UITransform,
    Vec3,
    view,
} from 'cc';
import { PHASE_A_FIXTURES } from '../config/PhaseAFixtures';
import { DEFAULT_GRID_ID, PHASE_A_GRIDS, PHASE_A_INITIAL_GOLD, PHASE_A_TOWER_COST } from '../config/PhaseAGrids';
import { PHASE_B_WAVES, RIVET_GUN } from '../config/PhaseBCombatConfig';
import { cellKey, sameCell, type EnemyRouteState, type GridCell, type GridId } from '../core/GridTypes';
import { PhaseBDebugInput, type PhaseBDebugAction } from '../input/PhaseBDebugInput';
import { buildBattleResultViewModel } from '../presentation/BattleResultViewModel';
import { BrowserBattleDiagnostics } from '../presentation/BrowserBattleDiagnostics';
import { countCombatFeedback, CombatFeedbackRuntime } from '../presentation/CombatFeedbackRuntime';
import { PhaseBCanvasRenderer } from '../presentation/PhaseBCanvasRenderer';
import { PhaseBHudView } from '../presentation/PhaseBHudView';
import {
    PHASE_B_DESIGN_HEIGHT,
    PHASE_B_DESIGN_WIDTH,
    PHASE_B_EARLY_WAVE_BUTTON,
    PHASE_B_GRID_TABS,
    PHASE_B_RESULT_RESTART_BUTTON,
    PHASE_B_SPEED_BUTTON,
    PHASE_B_TOWER_BUTTON,
    PhaseBLayout,
} from '../presentation/PhaseBLayout';
import { BattleRunCheckpoint } from '../systems/BattleRunCheckpoint';
import { BattleStateMachine } from '../systems/BattleStateMachine';
import { EconomyLedger } from '../systems/EconomyLedger';
import { PlacementModel, type PlacementPreview } from '../systems/PlacementModel';
import { SimulationClock } from '../systems/SimulationClock';
import { WaveCombatRuntime } from '../systems/WaveCombatRuntime';
import { WaveCatalog } from '../systems/WaveCatalog';

const { ccclass } = _decorator;

type InputMode = 'idle' | 'tower-pressed' | 'armed' | 'dragging' | 'click-preview';

@ccclass('NightwatchPocBootstrap')
export class NightwatchPocBootstrap extends Component {
    private canvas: Node | null = null;
    private renderer: PhaseBCanvasRenderer | null = null;
    private hud: PhaseBHudView | null = null;
    private readonly waves = new WaveCatalog(PHASE_B_WAVES);
    private economy = new EconomyLedger(PHASE_A_INITIAL_GOLD);
    private model = new PlacementModel(PHASE_A_GRIDS[DEFAULT_GRID_ID], this.economy, PHASE_A_TOWER_COST);
    private battle = new BattleStateMachine(this.waves.totalWaves);
    private combat = new WaveCombatRuntime(PHASE_A_GRIDS[DEFAULT_GRID_ID], RIVET_GUN);
    private readonly feedback = new CombatFeedbackRuntime();
    private readonly simulationClock = new SimulationClock();
    private selectedGridId: GridId = DEFAULT_GRID_ID;
    private preview: PlacementPreview | null = null;
    private inputMode: InputMode = 'idle';
    private primaryTouchId: number | null = null;
    private pressStart = new Vec3();
    private preparing = true;
    private pausedByLifecycle = false;
    private initialCoreHealth = 10;
    private initialPathLength = this.model.flowField.distanceAt(this.model.grid.entry);
    private runCheckpoint: BattleRunCheckpoint | null = null;
    private statusText = '拖动底部炮塔，或点塔后双击格子提交';
    private readonly layout = new PhaseBLayout();
    private readonly browserDiagnostics = new BrowserBattleDiagnostics();
    private readonly debugInput = new PhaseBDebugInput((action) => this.handleDebugAction(action));

    protected override onLoad(): void {
        view.setDesignResolutionSize(PHASE_B_DESIGN_WIDTH, PHASE_B_DESIGN_HEIGHT, ResolutionPolicy.FIXED_HEIGHT);
        this.canvas = this.findCanvas();
        if (!this.canvas) throw new Error('Phase A 场景缺少 Canvas');

        const layer = new Node('PhaseAProgrammaticLayer');
        layer.layer = this.canvas.layer;
        const transform = layer.addComponent(UITransform);
        transform.setContentSize(PHASE_B_DESIGN_WIDTH, PHASE_B_DESIGN_HEIGHT);
        this.canvas.addChild(layer);
        this.hud = new PhaseBHudView(layer);
        const graphicsNode = new Node('PhaseAGraphics');
        graphicsNode.layer = layer.layer;
        graphicsNode.addComponent(UITransform).setContentSize(PHASE_B_DESIGN_WIDTH, PHASE_B_DESIGN_HEIGHT);
        layer.addChild(graphicsNode);
        // Graphics 承担所有底板与战场绘制，固定到首个 sibling，避免结算遮罩盖住 Label。
        graphicsNode.setSiblingIndex(0);
        const graphics = graphicsNode.addComponent(Graphics);
        this.renderer = new PhaseBCanvasRenderer(graphics, this.layout);

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
        const step = this.simulationClock.gameDeltaSeconds(deltaTime);
        this.feedback.advance(step);
        const phaseBeforeAdvance = this.battle.snapshot.phase;
        if (phaseBeforeAdvance === 'countdown') {
            this.battle.advance(step);
            if (this.battle.snapshot.phase === 'spawning') this.startCurrentWave();
        }
        const phase = this.battle.snapshot.phase;
        if (phase === 'spawning' || phase === 'clearing') this.advanceCombat(step);
        this.redraw();
    }

    private findCanvas(): Node | null {
        const scene = this.node.scene;
        if (!scene) return null;
        return scene.getChildByName('Canvas');
    }

    private onTouchStart(event: EventTouch): void {
        const id = event.getID();
        if (this.primaryTouchId !== null && this.primaryTouchId !== id) return;
        this.primaryTouchId = id;
        const point = this.localPoint(event);
        this.pressStart.set(point);

        if (this.handleResultTouch(point)) {
            this.primaryTouchId = null;
            return;
        }
        if (this.handleTopControls(point)) {
            this.primaryTouchId = null;
            return;
        }
        if (this.layout.insideRect(point, PHASE_B_TOWER_BUTTON)) {
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
        const phase = this.battle.snapshot.phase;
        if (phase === 'spawning' || phase === 'clearing' || phase === 'countdown') {
            this.battle.pause();
            this.pausedByLifecycle = true;
        }
    }

    private handleTopControls(point: Vec3): boolean {
        if (point.y >= 610 && point.y <= 700) {
            for (const tab of PHASE_B_GRID_TABS) {
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
        if (this.layout.insideRect(point, PHASE_B_SPEED_BUTTON)) {
            this.toggleSpeed();
            return true;
        }
        if (this.layout.insideRect(point, PHASE_B_EARLY_WAVE_BUTTON)) {
            this.startNextWaveEarly();
            return true;
        }
        return false;
    }

    private handleDebugAction(action: PhaseBDebugAction): void {
        if (action === 'reset') this.resetGrid();
        else if (action === 'apply-short') this.applyFixture('shortFold');
        else if (action === 'apply-long') this.applyFixture('longSnake');
        else if (action === 'apply-failure') this.applyFixture('shortFold', 2);
        else if (action === 'restart-run') this.restartFromCheckpoint();
        else if (action === 'toggle-speed') this.toggleSpeed();
        else if (action === 'start-next-wave') this.startNextWaveEarly();
        else this.toggleBattle();
    }

    private handleResultTouch(point: Vec3): boolean {
        if (!this.resultViewModel()) return false;
        if (this.layout.insideRect(point, PHASE_B_RESULT_RESTART_BUTTON)) this.restartFromCheckpoint();
        return true;
    }

    private toggleBattle(): void {
        if (this.resultViewModel()) return;
        const phase = this.battle.snapshot.phase;
        if (phase === 'paused') {
            this.pausedByLifecycle = false;
            this.battle.resume();
            this.statusText = `已继续第 ${this.battle.snapshot.wave} 波`;
            return;
        }
        if (!this.preparing) {
            this.battle.pause();
            this.statusText = '已暂停，保留当前波次状态';
            return;
        }
        const pathDelta = this.currentPathDelta();
        // 先生成无副作用检查点，再推进状态机，避免快照失败留下“已开波但运行时未启动”的半状态。
        const checkpoint = BattleRunCheckpoint.capture(this.model, PHASE_A_TOWER_COST);
        const start = this.battle.startFirstWave(this.model.towers.size, pathDelta);
        if (!start.accepted) {
            this.statusText = start.reason === 'needs-two-towers'
                ? '第一波门禁：至少建造 2 座机枪塔'
                : '第一波门禁：路径至少增加 2 格';
            return;
        }
        this.runCheckpoint = checkpoint;
        this.preparing = false;
        this.startCurrentWave();
    }

    private toggleSpeed(): void {
        const multiplier = this.simulationClock.cycleScale();
        this.statusText = `游戏速度已切换为 ${multiplier}×`;
    }

    private startNextWaveEarly(): void {
        if (!this.battle.startNextWaveEarly()) {
            this.statusText = '只能在波间倒计时提前开波';
            return;
        }
        this.startCurrentWave();
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

    private resetGrid(initialGold = PHASE_A_INITIAL_GOLD, coreHealth = 10): void {
        const grid = PHASE_A_GRIDS[this.selectedGridId];
        this.economy = new EconomyLedger(initialGold);
        this.model = new PlacementModel(grid, this.economy, PHASE_A_TOWER_COST);
        // 开战门槛以当前地图空场流场为基线，不能假设入口出口永远纵向对齐。
        this.initialPathLength = this.model.flowField.distanceAt(grid.entry);
        this.battle = new BattleStateMachine(this.waves.totalWaves, coreHealth);
        this.combat = new WaveCombatRuntime(grid, RIVET_GUN);
        this.initialCoreHealth = coreHealth;
        this.runCheckpoint = null;
        this.preparing = true;
        this.pausedByLifecycle = false;
        this.feedback.clear();
        this.cancelInput('已重置为空网格');
    }

    private applyFixture(kind: 'shortFold' | 'longSnake', coreHealth = 10): void {
        const cells = PHASE_A_FIXTURES[this.selectedGridId][kind];
        this.resetGrid(kind === 'longSnake' ? 450 : 120, coreHealth);
        for (const cell of cells) {
            const preview = this.model.preview(cell, []);
            const result = this.model.commit(preview, []);
            if (!result.accepted) throw new Error(`${kind} fixture 无法提交：${result.reason}`);
        }
        this.statusText = `${kind === 'shortFold' ? '短折线' : '长蛇形'} fixture · 路径 ${this.model.flowField.distanceAt(this.model.grid.entry)} 格${coreHealth < 10 ? ' · 失败回归' : ''}`;
    }

    private restartFromCheckpoint(): void {
        const checkpoint = this.runCheckpoint;
        if (!checkpoint || !this.resultViewModel()) return;
        const restored = checkpoint.restore();
        this.economy = restored.economy;
        this.model = restored.model;
        this.selectedGridId = restored.model.grid.id;
        this.battle = new BattleStateMachine(this.waves.totalWaves, this.initialCoreHealth);
        this.combat = new WaveCombatRuntime(restored.model.grid, RIVET_GUN);
        this.feedback.clear();
        this.preparing = true;
        this.pausedByLifecycle = false;
        this.cancelInput('已恢复开战前部署，可调整后再次开波');
        this.runCheckpoint = checkpoint;
    }

    private currentPathDelta(): number {
        return this.model.flowField.distanceAt(this.model.grid.entry) - this.initialPathLength;
    }

    private startCurrentWave(): void {
        // 自动倒计时和玩家提前开波都汇入这里，避免生成器出现两套初始化顺序。
        const wave = this.waves.get(this.battle.snapshot.wave);
        this.combat.start(wave);
        const enemyCount = wave.groups.reduce((sum, group) => sum + group.count, 0);
        this.statusText = `第 ${wave.wave} 波：${enemyCount} 名发条步兵进场`;
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
        if (result.spawningCompleted && this.battle.snapshot.phase !== 'defeat') {
            this.battle.markSpawningComplete(this.combat.enemies.length);
        }
        const phase = this.battle.snapshot.phase;
        if (phase === 'countdown' || phase === 'victory') this.combat.completeWave();
        if (phase === 'victory') this.statusText = `第 ${this.battle.snapshot.wave} 波清场！击杀奖励已结算，剩余金币 ${this.model.gold}`;
        else if (phase === 'countdown') this.statusText = `第 ${this.battle.snapshot.wave} 波清场，下一波 8 秒后到达`;
        else if (phase === 'defeat') this.statusText = '核心已失守';
        else if (result.killed.length > 0) this.statusText = `击杀 ${result.killed.length} 名敌人 · +${result.killed.reduce((sum, enemy) => sum + enemy.archetype.killReward, 0)} 金币`;
        else if (result.leaked.length > 0) this.statusText = `漏怪 ${result.leaked.length} 名 · 核心生命 ${this.battle.snapshot.coreHealth}`;
    }

    private enemyStates(): readonly EnemyRouteState[] {
        // 生命周期暂停只冻结时间，不抹掉敌人的已承诺路段；恢复前仍不可在 from/to 格落塔。
        if (this.preparing) return [];
        return this.combat.enemyRouteStates();
    }

    private pointToCell(point: Vec3): GridCell | null {
        return this.layout.pointToCell(point, this.model.grid);
    }

    private localPoint(event: EventTouch): Vec3 {
        const location = event.getUILocation();
        const transform = this.canvas?.getComponent(UITransform);
        return transform?.convertToNodeSpaceAR(new Vec3(location.x, location.y, 0)) ?? new Vec3();
    }

    private redraw(): void {
        const result = this.resultViewModel();
        const battle = this.battle.snapshot;
        const activePath = this.preview?.accepted && this.preview.path
            ? this.preview.path
            : this.model.flowField.pathFrom(this.model.grid.entry);
        this.renderer?.render({
            selectedGridId: this.selectedGridId,
            grid: this.model.grid,
            towers: this.model.towers,
            activePath,
            preview: this.preview,
            enemies: this.combat.enemies,
            feedback: this.feedback.snapshot,
            gold: this.model.gold,
            speedMultiplier: this.simulationClock.scale,
            canStartNextWaveEarly: battle.phase === 'countdown',
            showPlayControl: this.preparing || this.battle.snapshot.phase === 'paused',
            result,
        });
        const pathLength = this.preview?.path?.length
            ? this.preview.path.length - 1
            : this.model.flowField.distanceAt(this.model.grid.entry);
        this.hud?.render({
            statusText: this.statusText,
            gold: this.model.gold,
            pathLength,
            wave: battle.wave,
            totalWaves: this.waves.totalWaves,
            coreHealth: battle.coreHealth,
            phaseText: this.phaseText(),
            speedMultiplier: this.simulationClock.scale,
            canStartNextWaveEarly: battle.phase === 'countdown',
            countdownSeconds: battle.countdownSeconds,
            result,
        });
        this.publishBrowserDiagnostics();
    }

    private publishBrowserDiagnostics(): void {
        const pathLength = this.preview?.accepted && this.preview.path
            ? this.preview.path.length - 1
            : this.model.flowField.distanceAt(this.model.grid.entry);
        const result = this.resultViewModel();
        this.browserDiagnostics.publish({
            gridId: this.selectedGridId,
            columns: this.model.grid.columns,
            rows: this.model.grid.rows,
            gold: this.model.gold,
            mapVersion: this.model.mapVersion,
            towerCount: this.model.towers.size,
            pathLength,
            pathDelta: this.currentPathDelta(),
            phase: this.battle.snapshot.phase,
            wave: this.battle.snapshot.wave,
            totalWaves: this.waves.totalWaves,
            countdownSeconds: this.battle.snapshot.countdownSeconds,
            speedMultiplier: this.simulationClock.scale,
            canStartNextWaveEarly: this.battle.snapshot.phase === 'countdown',
            coreHealth: this.battle.snapshot.coreHealth,
            activeEnemyCount: this.combat.enemies.length,
            spawningCompleted: this.combat.isSpawningComplete,
            spawnedEnemyCount: this.combat.totals.spawned,
            defeatedEnemyCount: this.combat.totals.killed,
            leakedEnemyCount: this.combat.totals.leaked,
            activeFeedbackCount: countCombatFeedback(this.feedback.snapshot),
            resultVisible: Boolean(result),
            retryAvailable: Boolean(this.runCheckpoint && result),
            inputMode: this.inputMode,
            previewAccepted: this.preview?.accepted ?? null,
            status: this.statusText,
        },
            result
                ? `${result.title}，${result.summary.replace('\n', '，')}，${result.actionLabel}`
                : `夜城防线游戏画布，${this.model.grid.columns}乘${this.model.grid.rows}，金币${this.model.gold}，路径${pathLength}格，速度${this.simulationClock.scale}倍，${this.battle.snapshot.phase === 'countdown' ? '可提前开波' : '提前开波未激活'}，${this.statusText}`,
        );
    }

    private resultViewModel() {
        return buildBattleResultViewModel(
            this.battle.snapshot,
            this.combat.totals,
            this.model.gold,
            this.initialCoreHealth,
        );
    }

    private phaseText(): string {
        const phase = this.battle.snapshot.phase;
        const labels: Record<typeof phase, string> = {
            preparing: '准备态',
            spawning: '出怪中',
            clearing: '清场中',
            countdown: `下一波 ${Math.ceil(this.battle.snapshot.countdownSeconds)} 秒`,
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
