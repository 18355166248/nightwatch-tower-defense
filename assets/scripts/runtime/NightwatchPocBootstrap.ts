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
import { BrowserSynthAudio } from '../audio/BrowserSynthAudio';
import { FirstLevelSoundDirector, type FirstLevelSoundCue } from '../audio/FirstLevelSoundDirector';
import { PHASE_A_FIXTURES } from '../config/PhaseAFixtures';
import { DEFAULT_GRID_ID, PHASE_A_GRIDS, PHASE_A_INITIAL_GOLD } from '../config/PhaseAGrids';
import { FIRST_LEVEL_STARTING_GOLD } from '../config/FirstLevelOpening';
import { PHASE_B_TOWERS, PHASE_B_WAVES, type TowerId } from '../config/PhaseBCombatConfig';
import { cellKey, sameCell, type EnemyRouteState, type GridCell, type GridId } from '../core/GridTypes';
import { PhaseBDebugInput, type PhaseBDebugAction } from '../input/PhaseBDebugInput';
import { activePlacementTower, type TowerInputMode } from '../input/TowerPlacementMode';
import { TowerInspection } from '../input/TowerInspection';
import { buildBattleResultViewModel } from '../presentation/BattleResultViewModel';
import { BrowserBattleDiagnostics } from '../presentation/BrowserBattleDiagnostics';
import { countCombatFeedback, CombatFeedbackRuntime } from '../presentation/CombatFeedbackRuntime';
import { PhaseBBackdropView } from '../presentation/PhaseBBackdropView';
import { PhaseBCanvasRenderer } from '../presentation/PhaseBCanvasRenderer';
import { PhaseBHudView } from '../presentation/PhaseBHudView';
import { PhaseBPauseOverlayView } from '../presentation/PhaseBPauseOverlayView';
import { towerInspectionSummary, towerSelectionSummary, towerUpgradeSuccessText, waveClearIncomeText } from '../presentation/PhaseBHudText';
import { PhaseBUnitSpriteView } from '../presentation/PhaseBUnitSpriteView';
import { RouteChangeFeedback, routeChangeText, routeLengthDelta } from '../presentation/RouteChangeFeedback';
import { ResultRevealRuntime } from '../presentation/ResultRevealRuntime';
import { waveStartStatus, waveThreatHint } from '../presentation/WaveBriefing';
import type { PhaseBSceneState } from '../presentation/PhaseBSceneState';
import {
    FIRST_LEVEL_SKIP_COACH_BUTTON,
    FIRST_LEVEL_SKIP_INTRO_BUTTON,
    FIRST_LEVEL_START_BUTTON,
    FirstLevelExperience,
} from '../presentation/FirstLevelExperience';
import { FirstLevelExperienceView } from '../presentation/FirstLevelExperienceView';
import { firstLevelGuidance } from '../presentation/FirstLevelGuidance';
import {
    PHASE_B_DESIGN_HEIGHT,
    PHASE_B_DESIGN_WIDTH,
    PHASE_B_EARLY_WAVE_BUTTON,
    PHASE_B_FROST_BUTTON,
    PHASE_B_GRID_TABS,
    phaseBPauseButtons,
    PHASE_B_RESULT_HOME_BUTTON,
    PHASE_B_RESULT_RESTART_BUTTON,
    PHASE_B_SOUND_BUTTON,
    PHASE_B_SPEED_BUTTON,
    PHASE_B_RESET_BUTTON,
    PHASE_B_PLAY_BUTTON,
    PHASE_B_RIVET_BUTTON,
    PHASE_B_UPGRADE_BUTTON,
    PhaseBLayout,
} from '../presentation/PhaseBLayout';
import { BattleRunCheckpoint } from '../systems/BattleRunCheckpoint';
import { BattleRunClock } from '../systems/BattleRunClock';
import { BattleStateMachine } from '../systems/BattleStateMachine';
import { EconomyLedger } from '../systems/EconomyLedger';
import { FirstLevelBestTimeStore } from '../systems/FirstLevelBestTimeStore';
import { applyGuidedQaOpening, applyGuidedQaPurchases, canApplyGuidedQaPurchases, shouldHoldQaIntermission } from '../systems/GuidedQaPlacement';
import { PauseOverlayRuntime } from '../systems/PauseOverlayRuntime';
import { isCoarseLandscape } from '../systems/ViewportSafety';
import { PlacementModel, type PlacementPreview } from '../systems/PlacementModel';
import { SimulationClock } from '../systems/SimulationClock';
import { WaveCombatRuntime } from '../systems/WaveCombatRuntime';
import { WaveCatalog } from '../systems/WaveCatalog';
import { WaveRewardRuntime } from '../systems/WaveRewardRuntime';
import { nextUpgradeCost } from '../systems/TowerLevelRules';

const { ccclass } = _decorator;

@ccclass('NightwatchPocBootstrap')
export class NightwatchPocBootstrap extends Component {
    private readonly qaMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('qa') === '1';
    private readonly qaCoarsePointer = this.qaMode && new URLSearchParams(window.location.search).get('qaCoarse') === '1';
    private readonly qaNaturalCountdown = this.qaMode && new URLSearchParams(window.location.search).get('qaNaturalCountdown') === '1';
    private canvas: Node | null = null;
    private browserCanvas: HTMLCanvasElement | null = null;
    private coarsePointerQuery: MediaQueryList | null = null;
    private renderer: PhaseBCanvasRenderer | null = null;
    private hud: PhaseBHudView | null = null;
    private unitSprites: PhaseBUnitSpriteView | null = null;
    private experienceView: FirstLevelExperienceView | null = null;
    private pauseView: PhaseBPauseOverlayView | null = null;
    private readonly waves = new WaveCatalog(PHASE_B_WAVES);
    private economy = new EconomyLedger(this.qaMode ? PHASE_A_INITIAL_GOLD : FIRST_LEVEL_STARTING_GOLD);
    private model = new PlacementModel(PHASE_A_GRIDS[DEFAULT_GRID_ID], this.economy, PHASE_B_TOWERS);
    private battle = new BattleStateMachine(this.waves.totalWaves);
    private combat = new WaveCombatRuntime(PHASE_A_GRIDS[DEFAULT_GRID_ID], PHASE_B_TOWERS);
    private waveRewards = new WaveRewardRuntime();
    private readonly feedback = new CombatFeedbackRuntime();
    private readonly routeChange = new RouteChangeFeedback();
    private readonly resultReveal = new ResultRevealRuntime();
    private readonly pauseOverlay = new PauseOverlayRuntime();
    private readonly sound = new FirstLevelSoundDirector(new BrowserSynthAudio());
    private readonly towerInspection = new TowerInspection();
    private readonly simulationClock = new SimulationClock();
    private readonly runClock = new BattleRunClock();
    private readonly bestTime = new FirstLevelBestTimeStore(this.qaMode);
    private selectedGridId: GridId = DEFAULT_GRID_ID;
    private selectedTowerId: TowerId = 'rivet-gun';
    private preview: PlacementPreview | null = null;
    private inputMode: TowerInputMode = 'idle';
    private primaryTouchId: number | null = null;
    private pressStart = new Vec3();
    private preparing = true;
    private guidedIntermissionHeld = false;
    private qaGuidedRun = false;
    private waveKillGold = 0;
    private resultWasNewRecord = false;
    private initialCoreHealth = 10;
    private initialPathLength = this.model.flowField.distanceAt(this.model.grid.entry);
    private runCheckpoint: BattleRunCheckpoint | null = null;
    private statusText = '拖动底部炮塔，或点塔后双击格子提交';
    private readonly layout = new PhaseBLayout();
    private readonly browserDiagnostics = new BrowserBattleDiagnostics();
    private readonly debugInput = new PhaseBDebugInput((action) => this.handleDebugAction(action));
    private readonly experience = new FirstLevelExperience(this.qaMode);
    private readonly onBrowserBlur = (): void => {
        // 浏览器失焦不等同退后台，但拖放必须原子取消，不能靠下一次 TOUCH_END 误提交。
        if (this.inputMode !== 'idle') this.cancelInput('画布失焦：已取消放置，未扣费');
    };

    protected override onLoad(): void {
        view.setDesignResolutionSize(PHASE_B_DESIGN_WIDTH, PHASE_B_DESIGN_HEIGHT, ResolutionPolicy.FIXED_HEIGHT);
        this.layout.setVisibleWidth(view.getVisibleSize().width);
        this.canvas = this.findCanvas();
        if (!this.canvas) throw new Error('Phase A 场景缺少 Canvas');

        const layer = new Node('PhaseAProgrammaticLayer');
        layer.layer = this.canvas.layer;
        const transform = layer.addComponent(UITransform);
        transform.setContentSize(PHASE_B_DESIGN_WIDTH, PHASE_B_DESIGN_HEIGHT);
        this.canvas.addChild(layer);
        new PhaseBBackdropView(layer);
        this.unitSprites = new PhaseBUnitSpriteView(layer, this.layout);
        this.hud = new PhaseBHudView(layer, this.layout);
        const graphicsNode = new Node('PhaseAGraphics');
        graphicsNode.layer = layer.layer;
        graphicsNode.addComponent(UITransform).setContentSize(PHASE_B_DESIGN_WIDTH, PHASE_B_DESIGN_HEIGHT);
        layer.addChild(graphicsNode);
        // 底图、动态战场、单位切图、HUD 依次分层；图片加载失败时 Graphics 保留灰盒战斗。
        graphicsNode.setSiblingIndex(1);
        const graphics = graphicsNode.addComponent(Graphics);
        this.renderer = new PhaseBCanvasRenderer(graphics, this.layout);
        this.experienceView = new FirstLevelExperienceView(layer, this.layout);
        this.pauseView = new PhaseBPauseOverlayView(layer, this.layout);

        this.canvas.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.canvas.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.canvas.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.canvas.on(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
        game.on(Game.EVENT_HIDE, this.onLifecycleHide, this);
        game.on(Game.EVENT_SHOW, this.onLifecycleShow, this);
        if (typeof window !== 'undefined') {
            this.coarsePointerQuery = window.matchMedia?.('(pointer: coarse)') ?? null;
            window.addEventListener('blur', this.onBrowserBlur);
            this.browserCanvas = document.querySelector('canvas');
            this.browserCanvas?.addEventListener('blur', this.onBrowserBlur);
        }
        // QA 夹具仅在显式 qa=1 时注册，首关默认画面不暴露测试捷径。
        if (this.qaMode) this.debugInput.attach();
        this.redraw();
    }

    protected override onDestroy(): void {
        this.cancelInput('场景销毁');
        this.canvas?.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.canvas?.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.canvas?.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.canvas?.off(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
        game.off(Game.EVENT_HIDE, this.onLifecycleHide, this);
        game.off(Game.EVENT_SHOW, this.onLifecycleShow, this);
        if (typeof window !== 'undefined') window.removeEventListener('blur', this.onBrowserBlur);
        this.browserCanvas?.removeEventListener('blur', this.onBrowserBlur);
        this.browserCanvas = null;
        this.debugInput.detach();
        this.sound.close();
    }

    protected override update(deltaTime: number): void {
        this.syncOrientationSafety();
        this.simulationClock.advance(deltaTime, (step) => this.advanceGameStep(step));
        // 布塔反馈走真实时间，暂停和 2× 战斗都不会改变玩家读到提示的时长。
        if (this.battle.snapshot.phase !== 'paused') this.routeChange.advance(deltaTime);
        this.resultReveal.advance(deltaTime);
        this.redraw();
    }

    private advanceGameStep(step: number): void {
        const phaseBeforeAdvance = this.battle.snapshot.phase;
        // 暂停时连命中闪光与弹道衰减也冻结，恢复后再从原剩余时长继续。
        if (phaseBeforeAdvance === 'paused') return;
        this.feedback.advance(step);
        this.runClock.advance(step, phaseBeforeAdvance);
        if (phaseBeforeAdvance === 'countdown') {
            this.battle.advance(step);
            if (this.battle.snapshot.phase === 'spawning') this.startCurrentWave();
        }
        const phase = this.battle.snapshot.phase;
        if (phase === 'spawning' || phase === 'clearing') this.advanceCombat(step);
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
        this.syncOrientationSafety();
        if (this.pauseOverlay.hasReason('orientation')) {
            this.primaryTouchId = null;
            return;
        }
        this.sound.unlockFromGesture();
        const point = this.localPoint(event);
        this.pressStart.set(point);

        // 入场卡独占输入；玩家未开始前不能误触底下的塔和战斗按钮。
        if (this.experience.entryMode === 'home') {
            if (this.layout.insideRect(point, FIRST_LEVEL_START_BUTTON)) {
                this.experience.begin();
                this.playSound('ui');
            } else if (this.layout.insideRect(point, FIRST_LEVEL_SKIP_INTRO_BUTTON)) {
                this.experience.skip();
                this.playSound('ui');
            }
            this.primaryTouchId = null;
            return;
        }
        if (this.handleResultTouch(point)) {
            this.primaryTouchId = null;
            return;
        }
        if (this.handlePauseTouch(point)) {
            this.primaryTouchId = null;
            return;
        }
        if (this.experience.entryMode === 'guided' && this.layout.insideRect(point, this.layout.safeRect(FIRST_LEVEL_SKIP_COACH_BUTTON))) {
            this.experience.skip();
            if (this.guidedIntermissionHeld) {
                this.guidedIntermissionHeld = false;
                this.battle.resume();
                this.statusText = '已跳过引导，下一波 8 秒后到达';
            }
            this.playSound('ui');
            this.primaryTouchId = null;
            return;
        }
        if (this.handleUpgradeTouch(point) || this.handleTopControls(point)) {
            this.primaryTouchId = null;
            return;
        }
        if (this.layout.insideRect(point, PHASE_B_RIVET_BUTTON)) {
            this.selectTower('rivet-gun');
            this.beginTowerInput();
            return;
        }
        if (this.layout.insideRect(point, PHASE_B_FROST_BUTTON)) {
            this.selectTower('frost-coil');
            this.beginTowerInput();
            return;
        }
        this.handleGridTap(point);
    }

    private beginTowerInput(): void {
        this.towerInspection.clear();
        this.inputMode = 'tower-pressed';
        this.preview = null;
        this.statusText = `${this.selectedTowerLabel()}：拖到网格落塔；轻点则进入点击建塔`;
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
        this.sound.suspend();
        const phase = this.battle.snapshot.phase;
        const hadInput = this.inputMode !== 'idle';
        if (phase === 'spawning' || phase === 'clearing' || phase === 'countdown'
            || phase === 'paused' && this.pauseOverlay.snapshot.visible) {
            // 用户暂停与后台隐藏可重叠；只有首次阻塞才取消手势，重复 hide 不重复清理。
            if (this.pauseOverlay.enterLifecycle() || hadInput) this.cancelInput('页面进入后台：操作取消，战斗保持暂停');
            if (phase !== 'paused') this.battle.pause();
        } else if (hadInput) this.cancelInput('页面进入后台：操作取消，未扣费');
    }

    private onLifecycleShow(): void {
        this.pauseOverlay.leaveLifecycle();
        this.syncOrientationSafety();
        if (this.pauseOverlay.snapshot.visible) this.statusText = '已回到游戏，请点继续战斗';
    }

    private syncOrientationSafety(): void {
        if (typeof window === 'undefined') return;
        const landscape = isCoarseLandscape({
            width: window.innerWidth,
            height: window.innerHeight,
            coarsePointer: this.qaCoarsePointer || Boolean(this.coarsePointerQuery?.matches),
        });
        if (!landscape) {
            if (this.pauseOverlay.hasReason('orientation')) {
                this.pauseOverlay.leaveOrientation();
                this.statusText = '已恢复竖屏，请点继续战斗';
            }
            return;
        }
        const phase = this.battle.snapshot.phase;
        const active = phase === 'spawning' || phase === 'clearing' || phase === 'countdown';
        if (!active && !(phase === 'paused' && this.pauseOverlay.snapshot.visible)) return;
        if (this.pauseOverlay.hasReason('orientation')) return;
        // 旋转与用户暂停/退后台可交错，第一次横屏就冻结当前帧，恢复竖屏也不自动续战。
        this.pauseOverlay.enterOrientation();
        this.cancelInput('横屏安全暂停：请转回竖屏');
        this.sound.suspend();
        if (active) this.battle.pause();
    }

    private handleTopControls(point: Vec3): boolean {
        if (this.layout.insideRect(point, this.layout.safeRect(PHASE_B_SOUND_BUTTON))) {
            this.toggleSound();
            return true;
        }
        if (this.qaMode && point.y >= 610 && point.y <= 700) {
            for (const tab of PHASE_B_GRID_TABS) {
                if (point.x >= tab.left && point.x <= tab.right) {
                    this.switchGrid(tab.id);
                    return true;
                }
            }
        }
        if (this.qaMode && point.y >= -700 && point.y <= -610 && point.x >= -440 && point.x <= -160) {
            this.applyFixture('shortFold');
            return true;
        }
        if (this.qaMode && point.y >= -700 && point.y <= -610 && point.x >= 160 && point.x <= 440) {
            this.applyFixture('longSnake');
            return true;
        }
        if (this.layout.insideRect(point, this.layout.safeRect(PHASE_B_RESET_BUTTON))) {
            if (!this.preparing && this.battle.snapshot.phase !== 'paused') this.pauseForUser('confirm-restart');
            else this.resetGrid();
            return true;
        }
        if (this.layout.insideRect(point, this.layout.safeRect(PHASE_B_PLAY_BUTTON))) {
            this.toggleBattle();
            return true;
        }
        if (this.layout.insideRect(point, this.layout.safeRect(PHASE_B_SPEED_BUTTON))) {
            this.toggleSpeed();
            return true;
        }
        if (this.layout.insideRect(point, this.layout.safeRect(PHASE_B_EARLY_WAVE_BUTTON))) {
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
        else if (action === 'apply-mixed') this.applyMixedFixture();
        else if (action === 'apply-guided-opening') this.applyGuidedQaFixture();
        else if (action === 'apply-guided-purchases') this.applyGuidedQaWavePurchases();
        else if (action === 'select-rivet') this.selectTower('rivet-gun');
        else if (action === 'select-frost') this.selectTower('frost-coil');
        else if (action === 'restart-run') this.restartFromCheckpoint();
        else if (action === 'toggle-speed') this.toggleSpeed();
        else if (action === 'start-next-wave') this.startNextWaveEarly();
        else this.toggleBattle();
    }

    private handleResultTouch(point: Vec3): boolean {
        if (!this.resultViewModel()) return false;
        if (this.layout.insideRect(point, PHASE_B_RESULT_RESTART_BUTTON)) this.restartFromCheckpoint();
        else if (this.layout.insideRect(point, PHASE_B_RESULT_HOME_BUTTON)) this.returnToHome();
        return true;
    }

    private handlePauseTouch(point: Vec3): boolean {
        const pause = this.pauseOverlay.snapshot;
        if (!pause.visible) return false;
        if (this.pauseOverlay.hasReason('orientation')) return true;
        const button = phaseBPauseButtons(pause.screen).findIndex((rect) => this.layout.insideRect(point, this.layout.safeRect(rect)));
        if (button < 0) return true;
        if (pause.screen === 'menu') {
            if (button === 0) this.resumePausedBattle();
            else if (button === 1) this.pauseOverlay.show('confirm-restart');
            else if (button === 2) this.pauseOverlay.show('settings');
            else if (button === 3) this.pauseOverlay.show('confirm-home');
        } else if (pause.screen === 'settings') {
            if (button === 0) this.toggleSound();
            else if (button === 1) this.toggleSpeed();
            else if (button === 2) this.pauseOverlay.show('menu');
        } else if (button === 1) this.pauseOverlay.show('menu');
        else if (button === 0 && pause.screen === 'confirm-restart') this.restartFromCheckpoint();
        else if (button === 0) this.returnToHome();
        return true;
    }

    private handleUpgradeTouch(point: Vec3): boolean {
        const cell = this.towerInspection.cell;
        if (!cell || !this.layout.insideRect(point, PHASE_B_UPGRADE_BUTTON)) return false;
        const towerId = this.model.deployments.find(({ cell: towerCell }) => sameCell(towerCell, cell))?.towerId;
        const result = this.model.upgrade(cell);
        if (result.accepted) this.towerInspection.clear();
        this.statusText = result.accepted && towerId ? towerUpgradeSuccessText(towerId, result.level)
            : result.reason === 'insufficient-gold' ? '金币不足，暂不能升级'
                : result.reason === 'max-level' ? '当前炮塔已满级' : '炮塔不存在，请重新选择';
        this.playSound(result.accepted ? 'ui' : 'reject');
        return true;
    }

    private toggleBattle(): void {
        if (this.resultViewModel()) return;
        const phase = this.battle.snapshot.phase;
        if (phase === 'paused') {
            if (this.pauseOverlay.snapshot.visible) {
                this.resumePausedBattle();
                return;
            }
            if (this.guidedIntermissionHeld) {
                if (!this.battle.startNextWaveFromHeldIntermission()) return;
                this.guidedIntermissionHeld = false;
                this.startCurrentWave();
                return;
            }
            this.guidedIntermissionHeld = false;
            this.battle.resume();
            this.statusText = `已继续第 ${this.battle.snapshot.wave} 波`;
            this.playSound('ui');
            return;
        }
        if (!this.preparing) {
            this.pauseForUser('menu');
            return;
        }
        const pathDelta = this.currentPathDelta();
        // 先生成无副作用检查点，再推进状态机，避免快照失败留下“已开波但运行时未启动”的半状态。
        const checkpoint = BattleRunCheckpoint.capture(this.model);
        const start = this.battle.startFirstWave(this.model.towers.size, pathDelta);
        if (!start.accepted) {
            this.statusText = start.reason === 'needs-two-towers'
                ? '第一波门禁：至少建造 2 座炮塔'
                : '第一波门禁：路径至少增加 2 格';
            this.playSound('reject');
            return;
        }
        this.runCheckpoint = checkpoint;
        this.preparing = false;
        this.resultWasNewRecord = false;
        this.runClock.start();
        this.startCurrentWave();
    }

    private toggleSpeed(): void {
        const multiplier = this.simulationClock.cycleScale();
        this.statusText = `游戏速度已切换为 ${multiplier}×`;
        this.playSound('ui');
    }

    private toggleSound(): void {
        const enabled = this.sound.toggle();
        this.statusText = enabled ? '音效已开启' : '音效已关闭';
        if (enabled) this.playSound('ui');
    }

    private pauseForUser(screen: 'menu' | 'confirm-restart'): void {
        if (!this.battle.pause()) return;
        this.pauseOverlay.enterUser();
        this.pauseOverlay.show(screen);
        this.cancelInput('战斗已暂停');
        this.sound.suspend();
    }

    private resumePausedBattle(): void {
        if (!this.pauseOverlay.continue()) return;
        if (!this.battle.resume()) throw new Error('暂停来源已解除，但战斗状态无法恢复');
        this.statusText = `已继续第 ${this.battle.snapshot.wave} 波`;
        this.playSound('ui');
    }

    private startNextWaveEarly(): void {
        if (!this.battle.startNextWaveEarly()) {
            this.statusText = '只能在波间倒计时提前开波';
            this.playSound('reject');
            return;
        }
        this.startCurrentWave();
    }

    private handleGridTap(point: Vec3): void {
        const cell = this.pointToCell(point);
        if (!cell) return;
        if (this.inputMode === 'armed') {
            this.preview = this.model.preview(cell, this.enemyStates(), this.selectedTowerId);
            this.inputMode = 'click-preview';
            this.statusText = this.preview.accepted
                ? `可建造 · ${this.previewRouteText(this.preview)} · 再点确认`
                : this.rejectText(this.preview.reason);
            return;
        }
        if (this.inputMode === 'click-preview') {
            if (this.preview && sameCell(this.preview.cell, cell)) this.commitCurrentPreview();
            else {
                this.preview = this.model.preview(cell, this.enemyStates(), this.selectedTowerId);
                this.statusText = this.preview.accepted
                    ? `可建造 · ${this.previewRouteText(this.preview)} · 再点确认`
                    : this.rejectText(this.preview.reason);
            }
            return;
        }
        if (this.inputMode !== 'idle') return;
        const deployment = this.model.deployments.find(({ cell: towerCell }) => sameCell(towerCell, cell));
        const towerId = deployment?.towerId;
        if (towerId) {
            const canSell = this.preparing && !this.pauseOverlay.snapshot.visible;
            const action = this.towerInspection.tap(cell, canSell);
            if (action === 'sell') {
                const before = this.model.flowField.distanceAt(this.model.grid.entry);
                const sold = this.model.sell(cell, true);
                const delta = sold
                    ? this.routeChange.record(cell, before, this.model.flowField.distanceAt(this.model.grid.entry)).delta
                    : 0;
                this.statusText = sold ? `炮塔已全额撤销 · ${routeChangeText(delta)}` : '撤销失败，请重新选择炮塔';
                this.playSound(sold ? 'ui' : 'reject');
            } else if (action === 'inspect') {
                // 教学恢复路径要明确二次点击才撤销；查看态下方提示被升级按钮占用，因此放到顶部事件行。
                this.statusText = canSell && this.experience.entryMode === 'guided'
                    ? '再点此塔全额撤销 · 下方可升级'
                    : this.towerInspectionText(towerId, deployment?.level ?? 1);
                this.playSound('ui');
            } else this.statusText = '已关闭炮塔射程查看';
            return;
        }
        if (this.towerInspection.cell) {
            this.towerInspection.clear();
            this.statusText = '已关闭炮塔射程查看';
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
        this.preview = this.model.preview(cell, this.enemyStates(), this.selectedTowerId);
        this.statusText = this.preview.accepted
            ? `可落塔 · ${this.previewRouteText(this.preview)}`
            : this.rejectText(this.preview.reason);
    }

    private previewRouteText(preview: PlacementPreview): string {
        if (!preview.accepted || !preview.path) throw new Error('仅合法预览可计算路线变化');
        return routeChangeText(routeLengthDelta(
            this.model.flowField.distanceAt(this.model.grid.entry),
            preview.path.length - 1,
        ));
    }

    private commitCurrentPreview(): void {
        if (!this.preview) {
            this.cancelInput('没有有效落点，未扣费');
            return;
        }
        const before = this.model.flowField.distanceAt(this.model.grid.entry);
        const placedCell = this.preview.cell;
        const result = this.model.commit(this.preview, this.enemyStates());
        const routeText = result.accepted
            ? routeChangeText(this.routeChange.record(placedCell, before, this.model.flowField.distanceAt(this.model.grid.entry)).delta)
            : null;
        this.statusText = result.accepted
            ? this.qaMode
                ? `${this.selectedTowerLabel()}建造成功 · ${routeText} · 金币 ${result.gold} · 地图版本 ${result.mapVersion}`
                : `${this.selectedTowerLabel()}已建造 · ${routeText} · 金币 ${result.gold}`
            : this.rejectText(result.reason);
        this.playSound(result.accepted ? 'place' : 'reject');
        this.towerInspection.clear();
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

    private resetGrid(initialGold = this.qaMode ? PHASE_A_INITIAL_GOLD : FIRST_LEVEL_STARTING_GOLD, coreHealth = 10): void {
        const grid = PHASE_A_GRIDS[this.selectedGridId];
        this.economy = new EconomyLedger(initialGold);
        this.model = new PlacementModel(grid, this.economy, PHASE_B_TOWERS);
        // 开战门槛以当前地图空场流场为基线，不能假设入口出口永远纵向对齐。
        this.initialPathLength = this.model.flowField.distanceAt(grid.entry);
        this.battle = new BattleStateMachine(this.waves.totalWaves, coreHealth);
        this.combat = new WaveCombatRuntime(grid, PHASE_B_TOWERS);
        this.waveRewards = new WaveRewardRuntime();
        this.simulationClock.reset();
        this.runClock.reset();
        this.initialCoreHealth = coreHealth;
        this.runCheckpoint = null;
        this.preparing = true;
        this.pauseOverlay.clear();
        this.guidedIntermissionHeld = false;
        this.qaGuidedRun = false;
        this.waveKillGold = 0;
        this.resultWasNewRecord = false;
        this.towerInspection.clear();
        this.feedback.clear();
        this.routeChange.clear();
        this.resultReveal.clear();
        this.cancelInput(this.qaMode ? '已重置为空网格' : '已重新布防，可以调整路线');
    }

    private applyFixture(kind: 'shortFold' | 'longSnake', coreHealth = 10): void {
        const cells = PHASE_A_FIXTURES[this.selectedGridId][kind];
        this.resetGrid(kind === 'longSnake' ? 450 : 120, coreHealth);
        for (const cell of cells) {
            const preview = this.model.preview(cell, [], 'rivet-gun');
            const result = this.model.commit(preview, []);
            if (!result.accepted) throw new Error(`${kind} fixture 无法提交：${result.reason}`);
        }
        this.statusText = `${kind === 'shortFold' ? '短折线' : '长蛇形'} fixture · 路径 ${this.model.flowField.distanceAt(this.model.grid.entry)} 格${coreHealth < 10 ? ' · 失败回归' : ''}`;
    }

    private applyMixedFixture(): void {
        const cells = PHASE_A_FIXTURES[this.selectedGridId].shortFold;
        this.resetGrid(140);
        for (let index = 0; index < cells.length; index += 1) {
            const towerId: TowerId = index === 0 ? 'frost-coil' : 'rivet-gun';
            const result = this.model.commit(this.model.preview(cells[index], [], towerId), []);
            if (!result.accepted) throw new Error(`mixed fixture 无法提交：${result.reason}`);
        }
        this.selectedTowerId = 'frost-coil';
        this.statusText = `混合塔组 fixture · 冷凝前置 + 3 机枪 · 路径 ${this.model.flowField.distanceAt(this.model.grid.entry)} 格`;
    }

    private applyGuidedQaFixture(): void {
        if (!this.qaMode) return;
        this.selectedGridId = DEFAULT_GRID_ID;
        this.resetGrid(FIRST_LEVEL_STARTING_GOLD);
        const applied = applyGuidedQaOpening(this.model);
        this.qaGuidedRun = true;
        this.statusText = `QA 推荐开局 · ${applied.placed} 塔 · 路径 ${applied.pathLength} 格 · 余 ${applied.gold} 金`;
    }

    private applyGuidedQaWavePurchases(): void {
        if (!this.qaMode || !this.qaGuidedRun || !canApplyGuidedQaPurchases(
            this.battle.snapshot.phase, this.guidedIntermissionHeld, this.qaNaturalCountdown,
        )) {
            this.statusText = 'QA 仅在推荐局波间可按 B 补塔';
            return;
        }
        const wave = this.battle.snapshot.wave;
        const applied = applyGuidedQaPurchases(this.model, wave);
        this.statusText = `QA 第 ${wave} 波后 · 建 ${applied.placed} 升 ${applied.upgraded} · 余 ${applied.gold} 金`;
    }

    private selectTower(towerId: TowerId): void {
        this.selectedTowerId = towerId;
        this.preview = null;
        this.inputMode = 'idle';
        this.statusText = towerSelectionSummary(PHASE_B_TOWERS.find(({ id }) => id === towerId)!);
        this.playSound('ui');
    }

    private selectedTowerLabel(): string {
        return this.selectedTowerId === 'frost-coil' ? '冷凝塔' : '机枪塔';
    }

    private towerInspectionText(towerId: TowerId, level = 1): string {
        return towerInspectionSummary(PHASE_B_TOWERS.find(({ id }) => id === towerId)!, level);
    }

    private restartFromCheckpoint(): void {
        const checkpoint = this.runCheckpoint;
        const pausedRun = this.battle.snapshot.phase === 'paused' && this.pauseOverlay.snapshot.visible;
        if (!checkpoint || (!this.resultViewModel() && !pausedRun)) return;
        const restored = checkpoint.restore();
        this.economy = restored.economy;
        this.model = restored.model;
        this.selectedGridId = restored.model.grid.id;
        this.battle = new BattleStateMachine(this.waves.totalWaves, this.initialCoreHealth);
        this.combat = new WaveCombatRuntime(restored.model.grid, PHASE_B_TOWERS);
        this.waveRewards = new WaveRewardRuntime();
        this.simulationClock.reset();
        this.runClock.reset();
        this.feedback.clear();
        this.routeChange.clear();
        this.resultReveal.clear();
        this.preparing = true;
        this.pauseOverlay.clear();
        this.guidedIntermissionHeld = false;
        this.qaGuidedRun = false;
        this.waveKillGold = 0;
        this.resultWasNewRecord = false;
        this.towerInspection.clear();
        this.cancelInput('已恢复开战前部署，可调整后再次开波');
        this.runCheckpoint = checkpoint;
        this.playSound('ui');
    }

    private returnToHome(): void {
        if (!this.resultViewModel() && !(this.battle.snapshot.phase === 'paused' && this.pauseOverlay.snapshot.visible)) return;
        this.selectedGridId = DEFAULT_GRID_ID;
        this.selectedTowerId = 'rivet-gun';
        // QA 结算也可能回到玩家入场卡；首页必须与卡面一致使用 140 金和默认 1×。
        this.resetGrid(FIRST_LEVEL_STARTING_GOLD);
        this.simulationClock.resetToDefaultSpeed();
        this.experience.returnHome();
        this.playSound('ui');
    }

    private currentPathDelta(): number {
        return this.model.flowField.distanceAt(this.model.grid.entry) - this.initialPathLength;
    }

    private startCurrentWave(): void {
        // 自动倒计时和玩家提前开波都汇入这里，避免生成器出现两套初始化顺序。
        this.towerInspection.clear();
        const wave = this.waves.get(this.battle.snapshot.wave);
        this.combat.start(wave);
        this.waveKillGold = 0;
        this.statusText = waveStartStatus(wave);
        this.playSound('wave-start');
    }

    private advanceCombat(deltaTime: number): void {
        const result = this.combat.tick(deltaTime, this.model.flowField, this.model.deployments);
        this.feedback.consume(result);
        for (const shot of result.shots) this.playSound(shot.towerId === 'frost-coil' ? 'frost-shot' : 'rivet-shot');
        if (result.killed.length > 0) this.playSound('kill');
        if (result.leaked.length > 0) this.playSound('core-hit');
        for (const killed of result.killed) {
            this.economy.credit(killed.archetype.killReward);
            this.waveKillGold += killed.archetype.killReward;
        }
        if (result.killed.length > 0 || result.leaked.length > 0) {
            this.battle.resolveCombatOutcome(result.leaked.length, this.combat.enemies.length);
        }
        if (result.spawningCompleted && this.battle.snapshot.phase !== 'defeat') {
            this.battle.markSpawningComplete(this.combat.enemies.length);
        }
        const phase = this.battle.snapshot.phase;
        let clearReward = 0;
        if (phase === 'countdown' || phase === 'victory') {
            this.combat.completeWave();
            // 状态机只决定波次结束；经济奖励经独立幂等结算器发放，避免职责互相反向依赖。
            clearReward = this.waveRewards.settle(this.waves.get(this.battle.snapshot.wave), this.economy).amount;
        }
        if (phase === 'victory') {
            this.resultReveal.begin();
            this.resultWasNewRecord = this.bestTime.recordVictory(this.runClock.elapsedSeconds);
            this.statusText = waveClearIncomeText(this.battle.snapshot.wave, this.waveKillGold, clearReward);
            this.playSound('victory');
        } else if (phase === 'countdown') {
            // 教学波间在奖励结算后暂停，让玩家按“击杀→回款→补塔→继续”掌握整局节奏。
            const holdForCoach = this.experience.shouldHoldIntermission(this.battle.snapshot.wave, this.waves.totalWaves)
                || shouldHoldQaIntermission(this.qaGuidedRun, this.qaNaturalCountdown);
            if (holdForCoach) {
                this.battle.pause();
                this.guidedIntermissionHeld = true;
            }
            // 仅 1× 自然倒计时 QA 在清场瞬间用真实交易自动补塔，避免浏览器控制延迟错过 8 秒窗口。
            // 玩家入口与常规 QA B 键仍需手动决策；此模式只用于测量引擎实际局长。
            const qaPurchase = this.qaNaturalCountdown && this.qaGuidedRun
                ? applyGuidedQaPurchases(this.model, this.battle.snapshot.wave) : null;
            this.statusText = qaPurchase
                ? `${waveClearIncomeText(this.battle.snapshot.wave, this.waveKillGold, clearReward)} · QA 建${qaPurchase.placed}升${qaPurchase.upgraded}`
                : waveClearIncomeText(this.battle.snapshot.wave, this.waveKillGold, clearReward);
            this.playSound('wave-clear');
        } else if (phase === 'defeat') {
            this.resultReveal.begin();
            this.statusText = '核心已失守';
            this.playSound('defeat');
        } else if (result.killed.length > 0) this.statusText = `击杀 ${result.killed.length} 名敌人 · +${result.killed.reduce((sum, enemy) => sum + enemy.archetype.killReward, 0)} 金币`;
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

    private playSound(cue: FirstLevelSoundCue): void {
        this.sound.play(cue, performance.now());
    }

    private redraw(): void {
        // 地址栏伸缩或视窗改尺寸后重新同步安全宽度，所有表现层与触控共用这份布局。
        this.layout.setVisibleWidth(view.getVisibleSize().width);
        const result = this.resultViewModel();
        const battle = this.battle.snapshot;
        const experience = this.experience.snapshot({
            preparing: this.preparing,
            towerCount: this.model.towers.size,
            pathDelta: this.currentPathDelta(),
            previewAccepted: this.preview?.accepted ?? null,
            inputMode: this.inputMode,
            gold: this.model.gold,
            phase: battle.phase,
            wave: battle.wave,
            occupiedCells: this.model.towers,
            towerLevelsByCell: new Map(this.model.deployments.map(({ cell, level }) => [cellKey(cell), level ?? 1])),
            guidedIntermissionHeld: this.guidedIntermissionHeld,
        });
        const activePath = this.preview?.accepted && this.preview.path
            ? this.preview.path
            : this.model.flowField.pathFrom(this.model.grid.entry);
        const inspectedCell = this.towerInspection.cell;
        const inspectedDeployment = inspectedCell
            ? this.model.deployments.find(({ cell }) => sameCell(cell, inspectedCell))
            : undefined;
        const inspectedTowerId = inspectedDeployment?.towerId;
        const inspectedLevel = inspectedDeployment?.level ?? 1;
        const upgradeCost = inspectedTowerId
            ? nextUpgradeCost(PHASE_B_TOWERS.find(({ id }) => id === inspectedTowerId)!, inspectedLevel)
            : null;
        const baseGuidanceText = inspectedTowerId
            ? this.towerInspectionText(inspectedTowerId, inspectedLevel)
            : experience.guidanceText ?? firstLevelGuidance({
                preparing: this.preparing,
                towerCount: this.model.towers.size,
                pathDelta: this.currentPathDelta(),
                previewAccepted: this.preview?.accepted ?? null,
                selectedTowerId: this.selectedTowerId,
            });
        const nextThreat = this.guidedIntermissionHeld && battle.wave < this.waves.totalWaves
            ? waveThreatHint(this.waves.get(battle.wave + 1))
            : null;
        const guidanceText = nextThreat && !inspectedTowerId
            ? `${baseGuidanceText}\n${nextThreat}`
            : baseGuidanceText;
        // 记住上次塔类型仅供下次操作复用；空闲态不能把卡片画成“已拿起”，否则点网格无响应像是故障。
        const activePlacementTowerId = activePlacementTower(this.selectedTowerId, this.inputMode);
        const sceneState: PhaseBSceneState = {
            qaMode: this.qaMode,
            useUnitSprites: this.unitSprites?.ready ?? false,
            selectedGridId: this.selectedGridId,
            grid: this.model.grid,
            towers: this.model.towers,
            towerIdsByCell: new Map(this.model.deployments.map(({ cell, towerId }) => [cellKey(cell), towerId])),
            towerLevelsByCell: new Map(this.model.deployments.map(({ cell, level }) => [cellKey(cell), level ?? 1])),
            activePath,
            preview: this.preview,
            inspectedTower: inspectedCell && inspectedTowerId ? { cell: inspectedCell, towerId: inspectedTowerId, level: inspectedLevel, upgradeCost } : null,
            enemies: this.combat.enemies,
            feedback: this.feedback.snapshot,
            routeChange: this.routeChange.snapshot,
            gold: this.model.gold,
            coreHealth: battle.coreHealth,
            maxCoreHealth: this.initialCoreHealth,
            speedMultiplier: this.simulationClock.scale,
            soundEnabled: this.sound.isEnabled,
            activePlacementTowerId,
            canStartNextWaveEarly: battle.phase === 'countdown',
            showPlayControl: this.preparing || this.battle.snapshot.phase === 'paused',
            result,
            resultRevealProgress: this.resultReveal.progress,
        };
        this.renderer?.render(sceneState);
        this.unitSprites?.render(sceneState);
        this.experienceView?.render(experience, this.model.grid, Boolean(result), this.preview?.cell ?? null);
        this.pauseView?.render({
            pause: this.pauseOverlay.snapshot,
            wave: battle.wave,
            totalWaves: this.waves.totalWaves,
            coreHealth: battle.coreHealth,
            maxCoreHealth: this.initialCoreHealth,
            soundEnabled: this.sound.isEnabled,
            speedMultiplier: this.simulationClock.scale,
        });
        const pathLength = this.preview?.path?.length
            ? this.preview.path.length - 1
            : this.model.flowField.distanceAt(this.model.grid.entry);
        const waveSpawnProgress = this.combat.waveSpawnProgress;
        this.hud?.render({
            qaMode: this.qaMode,
            guidanceText,
            statusText: this.statusText,
            gold: this.model.gold,
            pathLength,
            wave: battle.wave,
            totalWaves: this.waves.totalWaves,
            coreHealth: battle.coreHealth,
            phaseText: this.phaseText(),
            phase: battle.phase,
            waveSpawned: waveSpawnProgress.spawned,
            waveTotal: waveSpawnProgress.total,
            activeEnemyCount: this.combat.enemies.length,
            speedMultiplier: this.simulationClock.scale,
            soundEnabled: this.sound.isEnabled,
            soundReady: this.sound.isReady,
            canStartNextWaveEarly: battle.phase === 'countdown',
            countdownSeconds: battle.countdownSeconds,
            activePlacementTowerId,
            inspectedUpgrade: inspectedTowerId ? { level: inspectedLevel, cost: upgradeCost } : null,
            result,
            resultRevealProgress: this.resultReveal.progress,
        });
        this.publishBrowserDiagnostics(guidanceText);
    }

    private publishBrowserDiagnostics(guidanceText: string | null): void {
        const pathLength = this.preview?.accepted && this.preview.path
            ? this.preview.path.length - 1
            : this.model.flowField.distanceAt(this.model.grid.entry);
        const result = this.resultViewModel();
        const waveSpawnProgress = this.combat.waveSpawnProgress;
        const deployments = this.model.deployments;
        const rivetTowerCount = deployments.filter(({ towerId }) => towerId === 'rivet-gun').length;
        const frostTowerCount = deployments.filter(({ towerId }) => towerId === 'frost-coil').length;
        const upgradedTowerCount = deployments.filter(({ level }) => (level ?? 1) > 1).length;
        const slowedEnemyCount = this.combat.enemies.filter(({ slowRemainingSeconds }) => slowRemainingSeconds > 0).length;
        this.browserDiagnostics.publish({
            entryMode: this.experience.entryMode,
            gridId: this.selectedGridId,
            columns: this.model.grid.columns,
            rows: this.model.grid.rows,
            gold: this.model.gold,
            mapVersion: this.model.mapVersion,
            towerCount: this.model.towers.size,
            rivetTowerCount,
            frostTowerCount,
            upgradedTowerCount,
            selectedTowerId: this.selectedTowerId,
            inspectedTowerCell: this.towerInspection.cell ? cellKey(this.towerInspection.cell) : null,
            slowedEnemyCount,
            waveRewardTotal: this.waveRewards.totalAwarded,
            pathLength,
            pathDelta: this.currentPathDelta(),
            phase: this.battle.snapshot.phase,
            wave: this.battle.snapshot.wave,
            totalWaves: this.waves.totalWaves,
            countdownSeconds: this.battle.snapshot.countdownSeconds,
            speedMultiplier: this.simulationClock.scale,
            runElapsedSeconds: this.runClock.elapsedSeconds,
            bestTimeSeconds: this.bestTime.bestSeconds,
            resultWasNewRecord: this.resultWasNewRecord,
            soundEnabled: this.sound.isEnabled,
            soundReady: this.sound.isReady,
            canStartNextWaveEarly: this.battle.snapshot.phase === 'countdown',
            coreHealth: this.battle.snapshot.coreHealth,
            activeEnemyCount: this.combat.enemies.length,
            waveSpawnedEnemyCount: waveSpawnProgress.spawned,
            waveTotalEnemyCount: waveSpawnProgress.total,
            infantryGaitFrameLoaded: this.unitSprites?.hasGaitFrame('clockwork-infantry') ?? false,
            runnerGaitFrameLoaded: this.unitSprites?.hasGaitFrame('clockwork-runner') ?? false,
            spawningCompleted: this.combat.isSpawningComplete,
            spawnedEnemyCount: this.combat.totals.spawned,
            defeatedEnemyCount: this.combat.totals.killed,
            leakedEnemyCount: this.combat.totals.leaked,
            activeFeedbackCount: countCombatFeedback(this.feedback.snapshot),
            resultVisible: Boolean(result),
            retryAvailable: Boolean(this.runCheckpoint && result),
            orientationBlocked: this.pauseOverlay.hasReason('orientation'),
            pauseMenuVisible: this.pauseOverlay.snapshot.visible,
            pauseScreen: this.pauseOverlay.snapshot.visible ? this.pauseOverlay.snapshot.screen : null,
            pauseReason: this.pauseOverlay.snapshot.reason,
            canContinuePause: this.pauseOverlay.snapshot.canContinue,
            inputMode: this.inputMode,
            previewAccepted: this.preview?.accepted ?? null,
            status: this.statusText,
        },
            this.experience.entryMode === 'home'
                ? '夜城防线第一关：守住夜城入口。开始布防，或直接开始并跳过引导'
                : result
                ? `${result.title}，${result.summary.replace('\n', '，')}，${result.runDetails.map(({ label, value }) => `${label}${value}`).join('，')}，${result.footnote}，${result.actionLabel}，${result.homeActionLabel}`
                : this.pauseOverlay.snapshot.visible
                ? this.pauseOverlay.hasReason('orientation')
                    ? `夜城防线横屏安全暂停，请转回竖屏，再点继续战斗。第${this.battle.snapshot.wave}波，核心${this.battle.snapshot.coreHealth}`
                    : `夜城防线暂停，${this.pauseOverlay.snapshot.screen === 'menu' ? '继续战斗，回到战前布防，战斗设置，返回首页' : this.pauseOverlay.snapshot.screen === 'settings' ? '音效与速度设置，返回暂停' : '请确认或取消'}，第${this.battle.snapshot.wave}波，核心${this.battle.snapshot.coreHealth}`
                : `夜城防线游戏画布，${this.model.grid.columns}乘${this.model.grid.rows}，金币${this.model.gold}，路径${pathLength}格，机枪${rivetTowerCount}座，冷凝${frostTowerCount}座，减速中${slowedEnemyCount}名，${this.inputMode === 'idle' ? '未拿起炮塔' : `已拿起${this.selectedTowerLabel()}`}，速度${this.simulationClock.scale}倍，${this.battle.snapshot.phase === 'countdown' ? '可提前开波' : '提前开波未激活'}，${guidanceText ? `${guidanceText}，` : ''}${this.statusText}`,
        );
    }

    private resultViewModel() {
        return buildBattleResultViewModel(
            this.battle.snapshot,
            this.combat.totals,
            this.model.gold,
            {
                initialCoreHealth: this.initialCoreHealth,
                totalWaves: this.waves.totalWaves,
                elapsedSeconds: this.runClock.elapsedSeconds,
                towerCount: this.model.deployments.length,
                upgradeCount: this.model.deployments.reduce((sum, { level }) => sum + (level ?? 1) - 1, 0),
                bestSeconds: this.bestTime.bestSeconds,
                newRecord: this.resultWasNewRecord,
            },
        );
    }

    private phaseText(): string {
        const phase = this.battle.snapshot.phase;
        const labels: Record<typeof phase, string> = {
            preparing: '准备态',
            spawning: '出怪中',
            clearing: '清场中',
            countdown: `下一波 ${Math.ceil(this.battle.snapshot.countdownSeconds)} 秒`,
            paused: this.pauseOverlay.snapshot.reason === 'lifecycle' ? '后台暂停'
                : this.pauseOverlay.snapshot.reason === 'orientation' ? '横屏暂停' : '已暂停',
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
