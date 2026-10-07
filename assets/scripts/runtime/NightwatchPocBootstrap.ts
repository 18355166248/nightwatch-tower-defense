import { codexEntry } from '../presentation/CodexPresentation';
import { ALL_TOWERS } from '../config/ThirdLevelCombatConfig';
import { towerDefinition } from '../config/TowerCatalog';
import { TowerLoadout, FIXED_BEGINNER_LOADOUT, THIRD_LEVEL_LOADOUT } from '../systems/TowerLoadout';
import { browserRecordStorage } from '../systems/FirstLevelRecordStorage';
import { campaignLoadoutCards } from '../presentation/CampaignMenuPresentation';
import { CampaignMenu, campaignAction, campaignStages, type CampaignStage } from '../presentation/CampaignMenuPresentation';
import { CampaignMenuView } from '../presentation/CampaignMenuView';
import { CellBuildMenuView } from '../presentation/CellBuildMenuView';
import { cellBuildMenuAction, cellBuildMenuLayout, type CellBuildMenuInput } from '../presentation/CellBuildMenuPresentation';
import { LEVELS, type LevelId } from '../config/LevelCatalog';
import {
    _decorator,
    Component,
    dynamicAtlasManager,
    EventTouch,
    EventMouse,
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
import { combatSoundCues } from '../audio/FirstLevelCombatSound';
import { firstLevelMusicMood } from '../audio/FirstLevelMusicPolicy';
import { PHASE_A_FIXTURES } from '../config/PhaseAFixtures';
import { DEFAULT_GRID_ID, PHASE_A_GRIDS, PHASE_A_INITIAL_GOLD } from '../config/PhaseAGrids';
import { FIRST_LEVEL_STARTING_GOLD } from '../config/FirstLevelOpening';
import { firstLevelCoachSkipRect } from '../presentation/FirstLevelEntryLayout';
import { PHASE_B_TOWERS, type TowerId } from '../config/PhaseBCombatConfig';
import { cellKey, sameCell, type EnemyRouteState, type GridCell, type GridId } from '../core/GridTypes';
import { PhaseBDebugInput, type PhaseBDebugAction } from '../input/PhaseBDebugInput';
import { activePlacementTower, type TowerInputMode } from '../input/TowerPlacementMode';
import { TowerInspection } from '../input/TowerInspection';
import { buildBattleResultViewModel } from '../presentation/BattleResultViewModel';
import { BrowserBattleDiagnostics } from '../presentation/BrowserBattleDiagnostics';
import { enemyHealthBarRatio } from '../presentation/EnemyHealthIndicator';
import { countCombatFeedback, CombatFeedbackRuntime, shouldAdvanceFeedbackWhileGuidedHold } from '../presentation/CombatFeedbackRuntime';
import { PhaseBBackdropView } from '../presentation/PhaseBBackdropView';
import { PhaseBCanvasRenderer } from '../presentation/PhaseBCanvasRenderer';
import { CombatForegroundView } from '../presentation/CombatForegroundView';
import { CoreObjectiveArtView } from '../presentation/CoreObjectiveArtView';
import { EnemyEntryArtView } from '../presentation/EnemyEntryArtView';
import { PhaseBHudView } from '../presentation/PhaseBHudView';
import { firstLevelControlRect } from '../presentation/FirstLevelUiGeometry';
import { firstLevelTowerPanelAction, firstLevelTowerPanelHoverAction, firstLevelTowerPanelLayout, type TowerPanelInput } from '../presentation/FirstLevelTowerPanelPresentation';
import { PhaseBPauseOverlayView } from '../presentation/PhaseBPauseOverlayView';
import { towerInspectionSummary, towerSelectionSummary, towerUpgradeSuccessText, waveClearIncomeText, waveStartButtonViewModel } from '../presentation/PhaseBHudText';
import { PhaseBUnitSpriteView } from '../presentation/PhaseBUnitSpriteView';
import { RouteChangeFeedback, routeChangeText, routeLengthDelta, routePathChanged } from '../presentation/RouteChangeFeedback';
import { ResultRevealRuntime } from '../presentation/ResultRevealRuntime';
import { upcomingWaveBriefing, waveStartStatus, type UpcomingWaveBriefing } from '../presentation/WaveBriefing';
import type { PhaseBSceneState } from '../presentation/PhaseBSceneState';
import {
    FIRST_LEVEL_SKIP_INTRO_BUTTON,
    FirstLevelExperience,
    shouldOutlineGuidedUpgrade,
} from '../presentation/FirstLevelExperience';
import { firstLevelCoachSkipVisible } from '../presentation/FirstLevelCoachPresentation';
import { FirstLevelExperienceView } from '../presentation/FirstLevelExperienceView';
import { firstLevelSettingsPresentation, type FirstLevelSettingsAction } from '../presentation/FirstLevelSettingsPresentation';
import { firstLevelConfirmationPresentation } from '../presentation/FirstLevelConfirmationPresentation';
import { firstLevelPauseMenuPresentation } from '../presentation/FirstLevelRecoveryPresentation';
import { centerPauseVisible } from '../presentation/FirstLevelControlPolicy';
import { firstLevelGuidance } from '../presentation/FirstLevelGuidance';
import {
    PHASE_B_DESIGN_HEIGHT,
    PHASE_B_DESIGN_WIDTH,
    PHASE_B_EARLY_WAVE_BUTTON,
    PHASE_B_FROST_BUTTON,
    PHASE_B_GRID_TABS,
    phaseBConfirmationButtons,
    PHASE_B_RESULT_HOME_BUTTON,
    PHASE_B_RESULT_RESTART_BUTTON,
    PHASE_B_SOUND_BUTTON,
    PHASE_B_SPEED_BUTTON,
    PHASE_B_RESET_BUTTON,
    PHASE_B_CENTER_PAUSE_BUTTON,
    PHASE_B_RIVET_BUTTON,
    PHASE_B_SELL_BUTTON,
    PHASE_B_UPGRADE_BUTTON,
    PHASE_B_UPGRADE_FULL_BUTTON,
    PhaseBLayout,
} from '../presentation/PhaseBLayout';
import { BattleRunCheckpoint } from '../systems/BattleRunCheckpoint';
import { BattleRunClock } from '../systems/BattleRunClock';
import { BattleStateMachine, FIRST_WAVE_MIN_PATH_DELTA, FIRST_WAVE_MIN_TOWER_COUNT, towerSaleWindow } from '../systems/BattleStateMachine';
import { EconomyLedger } from '../systems/EconomyLedger';
import { FirstLevelBestTimeStore } from '../systems/FirstLevelBestTimeStore';
import { FIRST_LEVEL_RECORD_CORE_CAPACITY, FirstLevelBestHealthStore } from '../systems/FirstLevelBestHealthStore';
import { FirstLevelSettingsStore } from '../systems/FirstLevelSettingsStore';
import { applyGuidedQaOpening, applyGuidedQaPurchases, canApplyGuidedQaPurchases, shouldHoldQaIntermission } from '../systems/GuidedQaPlacement';
import { PauseOverlayRuntime } from '../systems/PauseOverlayRuntime';
import { isCoarseLandscape } from '../systems/ViewportSafety';
import { PlacementModel, type PlacementPreview } from '../systems/PlacementModel';
import { SimulationClock } from '../systems/SimulationClock';
import { WaveCombatRuntime, type CombatTickResult } from '../systems/WaveCombatRuntime';
import { RouteDiagnostics, RouteMovementError, type RouteContext, type RouteFault } from '../systems/RouteDiagnostics';
import type { FlowField } from '../systems/FlowField';
import { firstLevelEnemyTraffic } from '../systems/EnemyTrafficRules';
import { WaveCatalog } from '../systems/WaveCatalog';
import { WaveRewardRuntime } from '../systems/WaveRewardRuntime';
import { nextUpgradeCost } from '../systems/TowerLevelRules';
import { infantryRigCandidateEnabled } from '../presentation/DirectionalWalk';
import { firstLevelArtProfile } from '../presentation/FirstLevelArtProfile';
import { CocosRenderBudgetProbe } from '../presentation/CocosRenderBudgetProbe';
import { applyRenderAtlasPolicy, type RenderAtlasPolicyStatus } from '../presentation/RenderAtlasPolicy';
import { BrowserTextureTransferProbe } from '../presentation/BrowserTextureTransferProbe';

const { ccclass } = _decorator;

@ccclass('NightwatchPocBootstrap')
export class NightwatchPocBootstrap extends Component {
    private readonly qaMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('qa') === '1';
    private readonly qaCoarsePointer = this.qaMode && new URLSearchParams(window.location.search).get('qaCoarse') === '1';
    private readonly qaNaturalCountdown = this.qaMode && new URLSearchParams(window.location.search).get('qaNaturalCountdown') === '1';
    private readonly infantryRigCandidate = typeof window !== 'undefined' && infantryRigCandidateEnabled(window.location.search);
    private readonly artProfile = firstLevelArtProfile(typeof window !== 'undefined' ? window.location.search : '');
    private readonly enemyTraffic = firstLevelEnemyTraffic(typeof window !== 'undefined' ? window.location.search : '');
    private readonly routeDiagnostics = new RouteDiagnostics('report');
    private qaFaultCell: GridCell | null = null;
    private backdrop: PhaseBBackdropView | null = null;
    private canvas: Node | null = null;
    private browserCanvas: HTMLCanvasElement | null = null;
    private coarsePointerQuery: MediaQueryList | null = null;
    private renderer: PhaseBCanvasRenderer | null = null;
    private foregroundFeedback: CombatForegroundView | null = null;
    private hud: PhaseBHudView | null = null;
    private unitSprites: PhaseBUnitSpriteView | null = null;
    private coreArt: CoreObjectiveArtView | null = null;
    private entryArt: EnemyEntryArtView | null = null;
    private experienceView: FirstLevelExperienceView | null = null;
    private readonly campaignMenu = new CampaignMenu();
    private campaignView: CampaignMenuView | null = null;
    private campaignEntries: CampaignStage[] = [];
    private loadout = new TowerLoadout(FIXED_BEGINNER_LOADOUT);
    private runTowers = PHASE_B_TOWERS;
    private pauseView: PhaseBPauseOverlayView | null = null;
    private levelId: LevelId = 'first-level';
    private waves = new WaveCatalog(LEVELS[this.levelId].waves);
    private economy = new EconomyLedger(this.qaMode ? PHASE_A_INITIAL_GOLD : FIRST_LEVEL_STARTING_GOLD);
    private model = new PlacementModel(PHASE_A_GRIDS[DEFAULT_GRID_ID], this.economy, PHASE_B_TOWERS);
    private battle = new BattleStateMachine(this.waves.totalWaves);
    private combat = new WaveCombatRuntime(PHASE_A_GRIDS[DEFAULT_GRID_ID], PHASE_B_TOWERS, this.enemyTraffic);
    private waveRewards = new WaveRewardRuntime();
    private readonly feedback = new CombatFeedbackRuntime();
    private readonly routeChange = new RouteChangeFeedback();
    private readonly resultReveal = new ResultRevealRuntime();
    private readonly pauseOverlay = new PauseOverlayRuntime();
    private readonly sound = new FirstLevelSoundDirector(new BrowserSynthAudio());
    private readonly settings = new FirstLevelSettingsStore(this.qaMode);
    private homeSettingsVisible = false;
    private readonly towerInspection = new TowerInspection();
    private readonly simulationClock = new SimulationClock();
    private readonly runClock = new BattleRunClock();
    private bestTime = new FirstLevelBestTimeStore(this.qaMode);
    private bestHealth = new FirstLevelBestHealthStore(this.qaMode);
    private selectedGridId: GridId = DEFAULT_GRID_ID;
    private selectedTowerId: TowerId = 'rivet-gun';
    private preview: PlacementPreview | null = null;
    private buildCell: GridCell | null = null;
    private buildPress: { cell: GridCell; towerId: TowerId; startedAt: number; inspected: boolean } | null = null;
    private buildDetailTowerId: TowerId | undefined;
    private towerPanelHover: {cell:GridCell;action:'upgrade'|'sell'} | null = null;
    private buildMenuView: CellBuildMenuView | null = null;
    private inputMode: TowerInputMode = 'idle';
    private primaryTouchId: number | null = null;
    private pressStart = new Vec3();
    private preparing = true;
    private coachVisualSeconds = 0;
    private guidedIntermissionHeld = false;
    private qaGuidedRun = false;
    private waveKillGold = 0;
    private waveLeakedCount = 0;
    private resultWasNewRecord = false;
    private resultWasNewHealthRecord = false;
    private initialCoreHealth = 10;
    private initialPathLength = this.model.flowField.distanceAt(this.model.grid.entry);
    private runCheckpoint: BattleRunCheckpoint | null = null;
    private statusText = '点空地选择炮塔，一次点选即可建造';
    private readonly layout = new PhaseBLayout();
    private readonly browserDiagnostics = new BrowserBattleDiagnostics();
    private readonly renderBudgetProbe = new CocosRenderBudgetProbe();
    private readonly textureTransferProbe = new BrowserTextureTransferProbe();
    private renderAtlasPolicyStatus: RenderAtlasPolicyStatus = 'default';
    private readonly debugInput = new PhaseBDebugInput((action) => this.handleDebugAction(action));
    private readonly experience = new FirstLevelExperience(this.qaMode);
    private readonly onBrowserBlur = (): void => {
        // 浏览器失焦不等同退后台，但拖放必须原子取消，不能靠下一次 TOUCH_END 误提交。
        if (this.buildCell || this.inputMode !== 'idle') this.cancelInput('画布失焦：已取消放置，未扣费');
    };

    protected override onLoad(): void {
        this.connectRouteDiagnostics();
        this.renderAtlasPolicyStatus = applyRenderAtlasPolicy(dynamicAtlasManager, typeof window !== 'undefined' ? window.location.search : '');
        this.sound.configure(this.settings.snapshot.soundEnabled, this.settings.snapshot.volumeStep);
        // 设计版按同一个比例完整适配，长窄视口留边，不横向裁掉塔栏或单独放大字号。
        view.setDesignResolutionSize(PHASE_B_DESIGN_WIDTH, PHASE_B_DESIGN_HEIGHT, this.qaMode ? ResolutionPolicy.FIXED_HEIGHT : ResolutionPolicy.SHOW_ALL);
        this.layout.setVisibleWidth(view.getVisibleSize().width);
        this.canvas = this.findCanvas();
        if (!this.canvas) throw new Error('Phase A 场景缺少 Canvas');

        const layer = new Node('PhaseAProgrammaticLayer');
        layer.layer = this.canvas.layer;
        const transform = layer.addComponent(UITransform);
        transform.setContentSize(PHASE_B_DESIGN_WIDTH, PHASE_B_DESIGN_HEIGHT);
        this.canvas.addChild(layer);
        this.backdrop = new PhaseBBackdropView(layer, this.artProfile);
        this.unitSprites = new PhaseBUnitSpriteView(layer, this.layout, this.infantryRigCandidate, this.artProfile);
        const graphicsNode = new Node('PhaseAGraphics');
        graphicsNode.layer = layer.layer;
        graphicsNode.addComponent(UITransform).setContentSize(PHASE_B_DESIGN_WIDTH, PHASE_B_DESIGN_HEIGHT);
        layer.addChild(graphicsNode);
        // 底图/战场在单位下，短弹迹在单位上，HUD 与暂停层最高；灰盒回退仍留在战场层。
        graphicsNode.setSiblingIndex(1);
        const graphics = graphicsNode.addComponent(Graphics);
        this.renderer = new PhaseBCanvasRenderer(graphics, this.layout);
        this.coreArt = new CoreObjectiveArtView(layer, this.layout);
        this.entryArt = new EnemyEntryArtView(layer, this.layout);
        this.foregroundFeedback = new CombatForegroundView(layer, this.layout);
        this.hud = new PhaseBHudView(layer, this.layout, level => this.unitSprites?.frostStructureFrame(level) ?? null);
        this.experienceView = new FirstLevelExperienceView(layer, this.layout);
        this.campaignView = new CampaignMenuView(layer, this.layout);
        this.refreshCampaignEntries();
        this.buildMenuView = new CellBuildMenuView(layer, this.layout);
        this.pauseView = new PhaseBPauseOverlayView(layer, this.layout);

        this.canvas.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.canvas.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.canvas.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.canvas.on(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
        this.canvas.on(Node.EventType.MOUSE_MOVE, this.onMouseMove, this);
        this.canvas.on(Node.EventType.MOUSE_LEAVE, this.onMouseLeave, this);
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
        this.canvas?.off(Node.EventType.MOUSE_MOVE, this.onMouseMove, this);
        this.canvas?.off(Node.EventType.MOUSE_LEAVE, this.onMouseLeave, this);
        game.off(Game.EVENT_HIDE, this.onLifecycleHide, this);
        game.off(Game.EVENT_SHOW, this.onLifecycleShow, this);
        if (typeof window !== 'undefined') window.removeEventListener('blur', this.onBrowserBlur);
        this.browserCanvas?.removeEventListener('blur', this.onBrowserBlur);
        this.browserCanvas = null;
        this.debugInput.detach();
        this.hud?.dispose();
        this.unitSprites?.dispose();
        this.sound.close();
    }

    protected override update(deltaTime: number): void {
        if (this.buildPress && !this.buildPress.inspected && Date.now()-this.buildPress.startedAt>=450) {
            this.buildPress.inspected=true;
            this.buildDetailTowerId=this.buildPress.towerId;
        }
        this.syncOrientationSafety();
        // 引导等待时战斗时钟停住，提示动效仍走独立视觉时间；真实暂停不推进。
        if (!this.pauseOverlay.snapshot.visible && Number.isFinite(deltaTime)) this.coachVisualSeconds += Math.min(Math.max(deltaTime, 0), 0.1);
        this.simulationClock.advance(deltaTime, (step) => this.advanceGameStep(step));
        // 教学待命不推进敌人/金币/局内时钟，但最后一击的尸影和金币跳字应按真实时间消退。
        // 用户主动暂停或后台安全暂停仍保持反馈冻结，恢复后从原视觉时长继续。
        if (shouldAdvanceFeedbackWhileGuidedHold(this.battle.snapshot.phase, this.guidedIntermissionHeld,
            this.pauseOverlay.snapshot.visible) && Number.isFinite(deltaTime) && deltaTime > 0) {
            this.feedback.advance(deltaTime);
        }
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

        // 欢迎页/地图独占触控，点选据点不穿透到下面的棋盘；只有“进入关卡”才创建新战斗。
        if (this.experience.entryMode === 'home') {
            if (this.homeSettingsVisible) this.handleHomeSettingsTouch(point);
            else {
                const action = campaignAction(point, this.layout.visibleDesignWidth, this.campaignMenu.snapshot, this.campaignEntries.length);
                if (action === 'settings') this.homeSettingsVisible = true;
                else if (action === 'start') { this.refreshCampaignEntries(); this.campaignMenu.openMap(); }
                else if(action==='codex')this.campaignMenu.openCodex();
                else if(action==='codex-towers'||action==='codex-enemies')this.campaignMenu.browseCodex(action==='codex-towers'?'towers':'enemies');
                else if (action === 'back') {
                    if(this.campaignMenu.snapshot.screen==='codex')this.campaignMenu.closeCodex();
                    else if (this.campaignMenu.snapshot.screen === 'loadout') this.campaignMenu.openMap();
                    else this.campaignMenu.welcome();
                }
                else if (action === 'previous' || action === 'next') {
                    if(this.campaignMenu.snapshot.screen==='codex')this.campaignMenu.browseCodex(action);
                    else this.campaignMenu.turnPage(action === 'next' ? 1 : -1, this.campaignEntries.length);
                }
                else if (action === 'deploy') {
                    const stage = this.campaignEntries[this.campaignMenu.snapshot.selectedIndex];
                    if (stage) {
                        // 地图部署先进入独立配塔页，只有确认阵容才建立新战斗。
                        if (this.campaignMenu.snapshot.screen === 'loadout') {
                            const storage = browserRecordStorage();
                            if (storage) this.loadout.save(storage, stage.id);
                            this.runTowers = this.loadout.freeze(ALL_TOWERS);
                            this.enterLevel(stage.id, stage.guided);
                        } else this.openLoadout(stage.id);
                    }
                } else if (action && typeof action === 'object') {
                    if('codexLevel' in action)this.campaignMenu.browseCodex(action.codexLevel);
                    else this.campaignMenu.select(action.select, this.campaignEntries.length);
                }
                if (!action && this.campaignMenu.snapshot.screen === 'loadout') {
                    const towers = this.loadoutTowers();
                    const index = campaignLoadoutCards(this.layout.visibleDesignWidth, towers.length).findIndex(rect => this.layout.insideRect(point, rect));
                    if (index >= 0) {
                        const id = towers[index].id, ids = this.loadout.ids;
                        this.loadout.choose(ids.includes(id) ? ids.filter(item => item !== id) : [...ids, id]);
                        this.playSound('ui');
                    }
                }
                if (action) this.playSound('ui');
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
        // 弹窗置顶后，重叠位置的点击也必须先交给实际图标，不能误触底层HUD。空白仍走原收起流程。
        const buildInput=this.cellBuildMenuInput();
        const buildHit=buildInput&&cellBuildMenuAction(point,cellBuildMenuLayout(this.layout,this.model.grid,buildInput.cell,buildInput.options.length))!==null;
        const inspectedPanel=this.towerInspection.cell?this.towerPanelInput():null;
        const towerHit=inspectedPanel&&firstLevelTowerPanelAction(point,firstLevelTowerPanelLayout(this.layout.visibleDesignWidth,false,inspectedPanel.anchor));
        if(!this.qaMode&&(buildHit?this.handleCellBuildMenuTouch(point):towerHit?this.handleInspectedTowerTouch(point):false)){
            if(!this.buildPress)this.primaryTouchId=null;
            return;
        }
        // 跳过只在可见的布防/波间窗口接收触摸；战斗隐藏按钮不能留透明热区。
        if (firstLevelCoachSkipVisible(this.experience.entryMode,this.battle.snapshot.phase,this.preparing,this.guidedIntermissionHeld,this.pauseOverlay.snapshot.visible)
            && this.layout.insideRect(point, firstLevelCoachSkipRect(this.layout))) {
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
        if (this.handleTopControls(point) || this.handleCellBuildMenuTouch(point) || this.handlePlacementPanelTouch(point) || this.handleInspectedTowerTouch(point)) {
            if (!this.buildPress) this.primaryTouchId = null;
            return;
        }
        // 正式玩法统一点棋盘选塔，旧塔栏热区仅保留给 QA，避免透明按钮截获新的底部控制。
        if (this.qaMode && this.layout.insideRect(point, PHASE_B_RIVET_BUTTON)) {
            this.selectTower('rivet-gun');
            this.beginTowerInput();
            return;
        }
        if (this.qaMode && this.layout.insideRect(point, PHASE_B_FROST_BUTTON)) {
            this.selectTower('frost-coil');
            this.beginTowerInput();
            return;
        }
        this.handleGridTap(point);
    }

    private beginTowerInput(): void {
        this.buildCell = null;
        this.towerInspection.clear();
        this.inputMode = 'tower-pressed';
        this.preview = null;
        this.statusText = `已拿起${this.selectedTowerLabel()}`;
    }

    private onTouchMove(event: EventTouch): void {
        if (event.getID() === this.primaryTouchId && this.buildPress) {
            if (Vec3.distance(this.localPoint(event),this.pressStart)>18) this.buildPress=null;
            return;
        }
        if (event.getID() !== this.primaryTouchId || this.inputMode !== 'tower-pressed' && this.inputMode !== 'dragging') return;
        const point = this.localPoint(event);
        if (this.inputMode === 'tower-pressed' && Vec3.distance(point, this.pressStart) > 18) this.inputMode = 'dragging';
        if (this.inputMode === 'dragging') this.updatePreviewAt(point);
    }

    private onTouchEnd(event: EventTouch): void {
        if (event.getID() !== this.primaryTouchId) return;
        if (this.buildPress) {
            const press=this.buildPress;this.buildPress=null;
            // 长按只查看说明；松手前重读真实可建状态，敌人或金币变化不能绕过交易校验。
            if (!press.inspected && Date.now()-press.startedAt<450 && this.buildCell && sameCell(press.cell,this.buildCell)) {
                this.selectedTowerId=press.towerId;
                this.preview=this.model.preview(press.cell,this.enemyStates(),press.towerId);
                this.commitCurrentPreview();
                if (this.preview) { this.preview=null;this.inputMode='idle';this.buildCell=press.cell; }
            } else this.buildDetailTowerId=press.towerId;
            this.primaryTouchId=null;
            return;
        }
        if (this.inputMode === 'dragging') {
            this.commitCurrentPreview();
        } else if (this.inputMode === 'tower-pressed') {
            this.inputMode = 'armed';
            this.statusText = `已选${this.selectedTowerLabel()}`;
        }
        this.primaryTouchId = null;
    }

    private onTouchCancel(event: EventTouch): void {
        if (event.getID() === this.primaryTouchId) this.cancelInput('触摸已取消，未扣费');
    }

    private onLifecycleHide(): void {
        this.sound.suspend();
        const phase = this.battle.snapshot.phase;
        const hadInput = this.inputMode !== 'idle' || Boolean(this.buildPress);
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
        if (this.qaMode && this.layout.insideRect(point, this.layout.fitRect(PHASE_B_SOUND_BUTTON))) {
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
        // 新稿不显示战场重置入口；普通模式必须走暂停里的确认流程，不能保留隐形清局热区。
        if (this.qaMode && this.layout.insideRect(point, this.layout.safeRect(PHASE_B_RESET_BUTTON))) {
            if (!this.preparing && this.battle.snapshot.phase !== 'paused') this.pauseForUser('confirm-restart');
            else this.resetGrid();
            return true;
        }
        // 战前也要有退出选关的入口；已有布塔先确认，不把“返回地图”误当开第一波。
        if (this.preparing && !this.qaMode && this.layout.insideRect(point, firstLevelControlRect(PHASE_B_CENTER_PAUSE_BUTTON, true))) {
            if (this.model.towers.size === 0) this.returnToHome();
            else { this.pauseOverlay.enterUser(); this.pauseOverlay.show('confirm-home'); this.cancelInput('返回地图前确认结束布防'); }
            return true;
        }
        if (centerPauseVisible(this.preparing, this.battle.snapshot.phase, this.guidedIntermissionHeld)
            && this.layout.insideRect(point, this.layout.safeRect(firstLevelControlRect(PHASE_B_CENTER_PAUSE_BUTTON, !this.qaMode)))) {
            this.toggleBattle();
            return true;
        }
        if (this.layout.insideRect(point, this.layout.safeRect(firstLevelControlRect(PHASE_B_SPEED_BUTTON, !this.qaMode)))) {
            this.toggleSpeed();
            return true;
        }
        if (this.layout.insideRect(point, this.layout.safeRect(firstLevelControlRect(PHASE_B_EARLY_WAVE_BUTTON, !this.qaMode)))) {
            // 首波与教学波间都由底栏按钮开波；首波不应误走仅允许波间的提前开波接口。
            if (this.preparing || this.guidedIntermissionHeld) this.toggleBattle();
            else this.startNextWaveEarly();
            return true;
        }
        return false;
    }

    private handleDebugAction(action: PhaseBDebugAction): void {
        if (action === 'enter-background' || action === 'leave-background') {
            // 仅显式页面审查夹具可展示后台阻断态；复用真实生命周期入口，不伪造画面或声称真实切后台通过。
            if (this.qaMode && new URLSearchParams(window.location.search).get('qaLifecycle') === '1') {
                if (action === 'enter-background') this.onLifecycleHide();
                else this.onLifecycleShow();
            }
            return;
        }
        if (action === 'inject-route-fault') {
            // 故障适配仅显式QA地址+K键可用；普通试玩/无开关QA不能改流场。
            if (this.qaMode && new URLSearchParams(window.location.search).get('qaRouteFault') === '1'
                && !this.pauseOverlay.snapshot.visible) {
                this.qaFaultCell = this.combat.enemies.find(enemy => !sameCell(enemy.toCell, this.model.grid.exit))?.toCell ?? null;
            }
            return;
        }
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
        // 与结算绘制共用窄屏适配，避免按钮看得到却点不到边缘。
        if (this.layout.insideRect(point, this.layout.fitRect(PHASE_B_RESULT_RESTART_BUTTON))) {
            const next = this.battle.snapshot.phase === 'victory' ? LEVELS[this.levelId].nextLevel : undefined;
            if (next) this.openLoadout(next);
            else this.restartFromCheckpoint();
        }
        else if (this.layout.insideRect(point, this.layout.fitRect(PHASE_B_RESULT_HOME_BUTTON))) this.returnToHome();
        return true;
    }

    private handlePauseTouch(point: Vec3): boolean {
        const pause = this.pauseOverlay.snapshot;
        if (!pause.visible) return false;
        if (this.pauseOverlay.hasReason('orientation')) return true;
        if (pause.screen === 'settings') {
            this.handleSettingsTouch(point, false);
            return true;
        }
        const button = phaseBConfirmationButtons(pause.screen, this.layout.visibleDesignWidth)
            .findIndex((rect) => this.layout.insideRect(point, this.layout.safeRect(rect)));
        if (button < 0) return true;
        if (pause.screen === 'confirm-restart' || pause.screen === 'confirm-home') {
            // 首页确认的主按钮是保留原局；按语义分发，不能沿用旧的“索引0一律确认”。
            const action = firstLevelConfirmationPresentation(pause.screen).actionKinds[button];
            if (action === 'cancel') { if (this.preparing) { this.pauseOverlay.clear(); this.statusText = '已保留布防，可继续建塔与升级'; } else this.pauseOverlay.show('menu'); }
            else if (action === 'restart') this.restartFromCheckpoint();
            else if (action === 'home') this.returnToHome();
            return true;
        }
        if (pause.screen === 'route-error') {
            if (button === 0) this.restartFromCheckpoint();
            else if (button === 1) this.returnToHome();
            return true;
        }
        if (pause.screen === 'menu') {
            if (button === 0) this.resumePausedBattle();
            else if (button === 1) this.pauseOverlay.show('confirm-restart');
            else if (button === 2) this.pauseOverlay.show('settings');
            else if (button === 3) this.pauseOverlay.show('confirm-home');
        } else if (button === 1) this.pauseOverlay.show('menu');
        else if (button === 0 && pause.screen === 'confirm-restart') this.restartFromCheckpoint();
        else if (button === 0) this.returnToHome();
        return true;
    }

    private handleHomeSettingsTouch(point: Vec3): void {
        this.handleSettingsTouch(point, true);
    }

    private handleSettingsTouch(point: Vec3, fromHome: boolean): void {
        const { choices } = firstLevelSettingsPresentation(this.settings.snapshot, this.simulationClock.scale, fromHome);
        const choice = choices.find(({ rect }) => this.layout.insideRect(point, this.layout.safeRect(rect)));
        if (choice) this.handleSettingsAction(choice.action, fromHome);
    }

    /** 首页与暂停共用语义动作；点击已选项保持原值，改设置不解除暂停，也不重启本局。 */
    private handleSettingsAction(action: FirstLevelSettingsAction, fromHome: boolean): void {
        if (action.kind === 'back') {
            if (fromHome) this.homeSettingsVisible = false;
            else this.pauseOverlay.show('menu');
            this.playSound('ui');
            return;
        }
        if (action.kind === 'speed') {
            if (!fromHome) this.simulationClock.setScale(action.multiplier);
        } else if (action.kind === 'motion') this.settings.setReducedMotion(action.reduced);
        else {
            const next = action.kind === 'sound' ? this.settings.setSoundEnabled(action.enabled) : this.settings.setVolumeStep(action.step);
            this.sound.configure(next.soundEnabled, next.volumeStep);
            if (next.soundEnabled) this.sound.unlockFromGesture();
        }
        this.playSound('ui');
    }

    private handleInspectedTowerTouch(point: Vec3): boolean {
        const cell = this.towerInspection.cell;
        if (!cell) return false;
        const panelAction = this.qaMode ? null : firstLevelTowerPanelAction(point, firstLevelTowerPanelLayout(this.layout.visibleDesignWidth,false,this.towerPanelInput()?.anchor));
        if (panelAction === 'close') {
            this.towerInspection.clear();
            this.statusText = '已收起炮塔面板';
            this.playSound('ui');
            return true;
        }
        if (panelAction === 'surface') return true;
        // 浮层没有关闭节点；点击图标外空白只收起，消费这次点击，避免同时误开建造菜单。
        if(!this.qaMode&&!panelAction){
            this.towerInspection.clear();this.towerPanelHover=null;
            this.statusText='已收起炮塔面板';this.playSound('ui');return true;
        }
        const window = towerSaleWindow(this.preparing, this.battle.snapshot.phase, this.guidedIntermissionHeld);
        const refund = this.model.saleQuote(cell, window);
        // 禁售槽仍占独立热区；吞掉点击，不能穿透到棋盘并意外取消当前选塔。
        if (!this.qaMode && refund === null
            && panelAction === 'sell') {
            this.statusText = '当前状态不能移除炮塔';
            this.playSound('reject');
            return true;
        }
        if (refund !== null && (this.qaMode ? this.layout.insideRect(point, PHASE_B_SELL_BUTTON) : panelAction === 'sell')) {
            const before = this.committedPath();
            // 提交时重读阶段：波间若已开波改为五折，不按旧面板的七折报价返金。
            const currentWindow = towerSaleWindow(this.preparing, this.battle.snapshot.phase, this.guidedIntermissionHeld);
            const actualRefund = this.model.saleQuote(cell, currentWindow);
            const sold = this.model.sell(cell, currentWindow);
            if (sold) {
                this.feedback.forgetTower(cell);
                this.towerInspection.clear();
                const change = this.routeChange.record(cell, before, this.committedPath());
                this.statusText = `${currentWindow === 'opening' ? '全额撤销' : currentWindow === 'combat' ? '战斗拆除（五折）' : '波间出售（七折）'} · +${actualRefund} 金 · ${routeChangeText(change.delta, change.changed)}`;
            } else this.statusText = '状态已变化，请重新选择炮塔';
            this.playSound(sold ? 'sell' : 'reject');
            return true;
        }
        const upgradeRect = this.layout.safeRect(firstLevelControlRect(refund === null ? PHASE_B_UPGRADE_FULL_BUTTON : PHASE_B_UPGRADE_BUTTON, !this.qaMode));
        if (this.qaMode ? !this.layout.insideRect(point, upgradeRect) : panelAction !== 'upgrade') return false;
        const towerId = this.model.deployments.find(({ cell: towerCell }) => sameCell(towerCell, cell))?.towerId;
        const result = this.model.upgrade(cell);
        // 升级后保留检查态，让玩家看到真实新外观、射程与已购买圆点；失败也不丢失选塔。
        this.statusText = result.accepted && towerId ? towerUpgradeSuccessText(towerId, result.level)
            : result.reason === 'insufficient-gold' ? '金币不足，暂不能升级'
                : result.reason === 'max-level' ? '当前炮塔已满级' : '炮塔不存在，请重新选择';
        this.playSound(result.accepted ? 'upgrade' : 'reject');
        return true;
    }

    private cellBuildMenuInput(): CellBuildMenuInput | null {
        if (!this.buildCell) return null;
        return { cell: this.buildCell, detailTowerId:this.buildDetailTowerId, options: this.runTowers.map(tower => {
            const preview = this.model.preview(this.buildCell!, this.enemyStates(), tower.id);
            return { towerId: tower.id, enabled: preview.accepted, reason: preview.accepted ? '' : this.rejectText(preview.reason) };
        }) };
    }

    private handleCellBuildMenuTouch(point: Vec3): boolean {
        const input = this.cellBuildMenuInput(); if (!input) return false;
        const action = cellBuildMenuAction(point,cellBuildMenuLayout(this.layout,this.model.grid,input.cell,input.options.length));
        // 点选图标以外的空白只收起，不立即打开另一组选塔；HUD 已优先处理，开波仍保留浮层。
        if (action === null) {
            this.buildCell=null;this.buildDetailTowerId=undefined;this.buildPress=null;
            return true;
        }
        const option = input.options[action];
        if (!option.enabled) { this.statusText = option.reason; this.playSound('reject'); return true; }
        this.buildPress={cell:input.cell,towerId:option.towerId,startedAt:Date.now(),inspected:false};
        return true;
    }

    private handlePlacementPanelTouch(point: Vec3): boolean {
        if (this.qaMode || !this.preview || this.inputMode !== 'click-preview' && this.inputMode !== 'armed') return false;
        const action = firstLevelTowerPanelAction(point, firstLevelTowerPanelLayout(this.layout.visibleDesignWidth, true));
        if (!action) return false;
        // 建造条位于棋盘外；确认按钮与再次点落点共用同一事务，战斗中也不能重复扣费。
        if (action === 'close' || action === 'sell') {
            this.cancelInput('已取消建造，未扣费');
            this.playSound('ui');
        }
        if (action === 'upgrade' && this.inputMode === 'click-preview' && this.preview?.accepted) this.commitCurrentPreview();
        return true;
    }

    private towerPanelInput(): TowerPanelInput | null {
        if (this.preview) return { towerId: this.preview.towerId, level: 1, gold: this.model.gold,
            saleRefund: null, opening: this.preparing, hover: this.inputMode === 'armed', placement: {accepted: this.preview.accepted,
                reason: this.preview.reason, clickConfirm: this.inputMode === 'click-preview'} };
        const cell = this.towerInspection.cell;
        const deployment = cell ? this.model.deployments.find(tower => sameCell(tower.cell,cell)) : null;
        if (!cell || !deployment) return null;
        return {anchor:{center:this.layout.gridPointCenter(cell,this.model.grid),cellSize:this.layout.boardMetrics(this.model.grid).cellSize},towerId: deployment.towerId, level: deployment.level ?? 1, gold: this.model.gold,
            saleRefund: this.model.saleQuote(cell,towerSaleWindow(this.preparing,this.battle.snapshot.phase,this.guidedIntermissionHeld)), opening:this.preparing,
            combat: towerSaleWindow(this.preparing,this.battle.snapshot.phase,this.guidedIntermissionHeld) === 'combat',
            hoverAction:this.towerPanelHover&&sameCell(this.towerPanelHover.cell,cell)?this.towerPanelHover.action:undefined};
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
                // 第一波已教过布塔、战斗及波间操作；玩家主动继续即收口，不能让新手引导贯穿八波。
                this.experience.finish();
                this.towerInspection.clear();
                this.cancelInput('新手引导完成，进入自由防守');
                this.startCurrentWave();
                this.statusText = '新手引导已结束 · 可自由建塔、升级';
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
                ? `第一波门禁：至少建造 ${FIRST_WAVE_MIN_TOWER_COUNT} 座炮塔`
                : `第一波门禁：路径至少增加 ${FIRST_WAVE_MIN_PATH_DELTA} 格`;
            this.playSound('reject');
            return;
        }
        this.runCheckpoint = checkpoint;
        this.preparing = false;
        this.resultWasNewRecord = false;
        this.resultWasNewHealthRecord = false;
        this.runClock.start();
        this.startCurrentWave();
    }

    private toggleSpeed(): void {
        const multiplier = this.simulationClock.cycleScale();
        this.statusText = `游戏速度已切换为 ${multiplier}×`;
        this.playSound('ui');
    }

    private toggleSound(): void {
        const next = this.settings.toggleSound();
        this.sound.configure(next.soundEnabled, next.volumeStep);
        const enabled = next.soundEnabled;
        this.statusText = enabled ? '音乐与音效已开启' : '音乐与音效已关闭';
        if (enabled) {
            this.sound.unlockFromGesture();
            this.playSound('ui');
        }
    }

    private cycleVolume(): void {
        const next = this.settings.cycleVolume();
        this.sound.configure(next.soundEnabled, next.volumeStep);
        this.sound.unlockFromGesture();
        this.statusText = `音量已设为 ${next.volumeStep * 25}%`;
        this.playSound('ui');
    }

    private toggleReducedMotion(): void {
        const next = this.settings.toggleReducedMotion();
        this.statusText = next.reducedMotion ? '已减弱动态效果' : '已恢复动态效果';
        this.playSound('ui');
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

    private onMouseMove(event: EventMouse): void {
        const inspected=this.towerInspection.cell,panel=this.towerPanelInput();
        // 打开菜单不自动展示说明；只有鼠标进入对应操作节点才显示，移动到空白立即清除。
        if(inspected&&panel&&!panel.placement&&!this.buildCell&&!this.pauseOverlay.snapshot.visible){
            const action=firstLevelTowerPanelHoverAction(this.localPoint(event),firstLevelTowerPanelLayout(this.layout.visibleDesignWidth,false,panel.anchor));
            this.towerPanelHover=action==='upgrade'||action==='sell'?{cell:inspected,action}:null;
        }else this.towerPanelHover=null;
        if (this.buildCell && !this.pauseOverlay.snapshot.visible) {
            const input=this.cellBuildMenuInput()!;
            const action=cellBuildMenuAction(this.localPoint(event),cellBuildMenuLayout(this.layout,this.model.grid,input.cell,input.options.length));
            this.buildDetailTowerId=typeof action==='number' ? input.options[action].towerId : undefined;
        }
        // 悬停只更新已拿起塔的影子；首次点击仍锁定落点，第二次点击才扣费，避免鼠标移动误建。
        if (this.inputMode !== 'armed' || this.pauseOverlay.snapshot.visible || this.experience.entryMode === 'home') return;
        const point = this.localPoint(event);
        // 鼠标从落点移向取消按钮时保留面板，否则离开棋盘会让按钮在点击前消失。
        if (this.preview && firstLevelTowerPanelAction(point, firstLevelTowerPanelLayout(this.layout.visibleDesignWidth, true))) return;
        this.updatePreviewAt(point);
    }

    private onMouseLeave(): void {
        this.towerPanelHover=null;
        this.buildDetailTowerId=undefined;
        if (this.inputMode === 'armed') this.preview = null;
    }

    private handleGridTap(point: Vec3): void {
        const cell = this.pointToCell(point);
        if (!cell) return;
        this.buildCell=null;this.buildDetailTowerId=undefined;
        // 点已有塔优先进入检查/撤销，不能被“拿着另一种塔”的建造状态困在占用错误里。
        if (this.model.deployments.some(tower => sameCell(tower.cell, cell))
            && (this.inputMode === 'armed' || this.inputMode === 'click-preview')) {
            this.preview = null;
            this.inputMode = 'idle';
        }
        if (this.inputMode === 'armed') {
            this.preview = this.model.preview(cell, this.enemyStates(), this.selectedTowerId);
            this.inputMode = 'click-preview';
            this.statusText = this.preview.accepted
                ? `可建造 · ${this.previewRouteText(this.preview)}`
                : this.rejectText(this.preview.reason);
            return;
        }
        if (this.inputMode === 'click-preview') {
            if (this.preview && sameCell(this.preview.cell, cell)) this.commitCurrentPreview();
            else {
                this.preview = this.model.preview(cell, this.enemyStates(), this.selectedTowerId);
                this.statusText = this.preview.accepted
                    ? `可建造 · ${this.previewRouteText(this.preview)}`
                    : this.rejectText(this.preview.reason);
            }
            return;
        }
        if (this.inputMode !== 'idle') return;
        const deployment = this.model.deployments.find(({ cell: towerCell }) => sameCell(towerCell, cell));
        const towerId = deployment?.towerId;
        if (towerId) {
            const action = this.towerInspection.tap(cell);
            if (action === 'inspect') {
                const saleWindow = towerSaleWindow(this.preparing, this.battle.snapshot.phase, this.guidedIntermissionHeld);
                this.statusText = saleWindow !== 'locked'
                    ? `${this.towerInspectionText(towerId, deployment?.level ?? 1)} · 下方可${saleWindow === 'opening' ? '撤销' : saleWindow === 'combat' ? '拆除' : '出售'}`
                    : this.towerInspectionText(towerId, deployment?.level ?? 1);
                this.playSound('ui');
            } else this.statusText = '已关闭炮塔射程查看';
            return;
        }
        if (this.towerInspection.cell) {
            this.towerInspection.clear();
            this.statusText = '已关闭炮塔射程查看';
        }
        if (!this.qaMode) {
            // 外部地标仍依赖棋盘内端点格；点击保留通道也打开说明，不能像空白失效区域一样无反馈。
            // 金币不足同样展示价格与禁用原因，具体塔型提交时仍重读真实建造规则。
            // 可编辑阵容允许不带机枪，落点探测必须使用本局目录，避免整张地图无法唤起菜单。
            const candidate = this.model.preview(cell, this.enemyStates(), this.runTowers[0].id);
            if (candidate.accepted || candidate.reason === 'insufficient-gold' || candidate.reason === 'entry' || candidate.reason === 'exit') {
                this.buildCell = cell;
                this.statusText = candidate.reason === 'entry' || candidate.reason === 'exit'
                    ? this.rejectText(candidate.reason) : '选择炮塔，点击即可建造';
                this.playSound('ui');
            } else { this.buildCell = null; this.statusText = this.rejectText(candidate.reason); this.playSound('reject'); }
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
        const before = this.committedPath();
        return routeChangeText(routeLengthDelta(before.length - 1, preview.path.length - 1), routePathChanged(before, preview.path));
    }

    private committedPath(): readonly GridCell[] {
        const path = this.model.flowField.pathFrom(this.model.grid.entry);
        if (!path) throw new Error('当前合法战场缺少入口到出口的路线');
        return path;
    }

    private commitCurrentPreview(): void {
        if (!this.preview) {
            this.cancelInput('没有有效落点，未扣费');
            return;
        }
        const before = this.committedPath();
        const placedCell = this.preview.cell;
        const result = this.model.commit(this.preview, this.enemyStates());
        const change = result.accepted ? this.routeChange.record(placedCell, before, this.committedPath()) : null;
        const routeText = change ? routeChangeText(change.delta, change.changed) : null;
        this.statusText = result.accepted
            ? this.qaMode
                ? `${this.selectedTowerLabel()}建造成功 · ${routeText} · 金币 ${result.gold} · 地图版本 ${result.mapVersion}`
                : `${this.selectedTowerLabel()}已建造 · ${routeText} · 金币 ${result.gold}`
            : this.rejectText(result.reason);
        this.playSound(result.accepted ? 'place' : 'reject');
        this.towerInspection.clear();
        // 失败不是确认完成；保留可取消的真实失败预览，重新选落点后才能再次提交。
        if (!result.accepted && !this.qaMode) {
            this.preview = this.model.preview(placedCell,this.enemyStates(),this.selectedTowerId);
            this.inputMode = 'click-preview';
            return;
        }
        this.preview = null;
        this.buildCell = null;
        this.inputMode = 'idle';
    }

    private cancelInput(message: string): void {
        this.buildPress=null;this.buildDetailTowerId=undefined;
        this.primaryTouchId = null;
        this.preview = null;
        this.buildCell = null;
        this.inputMode = 'idle';
        this.statusText = message;
    }

    private switchGrid(id: GridId): void {
        this.selectedGridId = id;
        this.resetGrid();
        this.statusText = `已切换 ${PHASE_A_GRIDS[id].columns}×${PHASE_A_GRIDS[id].rows}，证据需独立记录`;
    }

    private resetGrid(initialGold = this.qaMode ? PHASE_A_INITIAL_GOLD : LEVELS[this.levelId].startingGold, coreHealth = 10): void {
        // 新局不是暂停恢复：清掉旧音乐位置，下一次布防从同一乐句开头进入。
        this.sound.updateMusic('off');
        this.model.observeMutations(null);
        const grid = PHASE_A_GRIDS[this.selectedGridId];
        this.economy = new EconomyLedger(initialGold);
        this.model = new PlacementModel(grid, this.economy, this.runTowers, this.runTowers[0].id);
        // 开战门槛以当前地图空场流场为基线，不能假设入口出口永远纵向对齐。
        this.initialPathLength = this.model.flowField.distanceAt(grid.entry);
        this.battle = new BattleStateMachine(this.waves.totalWaves, coreHealth);
        this.combat = new WaveCombatRuntime(grid, this.runTowers, this.enemyTraffic);
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
        this.waveLeakedCount = 0;
        this.resultWasNewRecord = false;
        this.resultWasNewHealthRecord = false;
        this.towerInspection.clear();
        this.feedback.clear();
        this.routeChange.clear();
        this.resultReveal.clear();
        this.cancelInput(this.qaMode ? '已重置为空网格' : '已重新布防，可以调整路线');
        this.connectRouteDiagnostics();
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
        if (!this.runTowers.some(tower => tower.id === towerId)) return;
        this.selectedTowerId = towerId;
        this.preview = null;
        this.buildCell = null;
        this.inputMode = 'idle';
        this.statusText = towerSelectionSummary(towerDefinition(towerId));
        this.playSound('pickup');
    }

    private selectedTowerLabel(): string {
        return towerDefinition(this.selectedTowerId).label;
    }

    private towerInspectionText(towerId: TowerId, level = 1): string {
        return towerInspectionSummary(towerDefinition(towerId), level);
    }

    private restartFromCheckpoint(): void {
        const checkpoint = this.runCheckpoint;
        const pausedRun = this.battle.snapshot.phase === 'paused' && this.pauseOverlay.snapshot.visible;
        if (!checkpoint || (!this.resultViewModel() && !pausedRun)) return;
        this.sound.updateMusic('off');
        this.model.observeMutations(null);
        const restored = checkpoint.restore();
        this.economy = restored.economy;
        this.model = restored.model;
        this.selectedGridId = restored.model.grid.id;
        this.battle = new BattleStateMachine(this.waves.totalWaves, this.initialCoreHealth);
        this.combat = new WaveCombatRuntime(restored.model.grid, this.runTowers, this.enemyTraffic);
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
        this.waveLeakedCount = 0;
        this.resultWasNewRecord = false;
        this.resultWasNewHealthRecord = false;
        this.towerInspection.clear();
        this.cancelInput('已恢复开战前部署，可调整后再次开波');
        this.runCheckpoint = checkpoint;
        this.connectRouteDiagnostics();
        this.playSound('ui');
    }

    /** 切关必须重建波次、记录和战斗快照，不能带入上一关金币、炮塔或重开检查点。 */
    private enterLevel(id: LevelId, guided: boolean): void {
        this.levelId = id;
        const level = LEVELS[id];
        this.waves = new WaveCatalog(level.waves);
        this.bestTime = new FirstLevelBestTimeStore(this.qaMode, undefined, id);
        this.bestHealth = new FirstLevelBestHealthStore(this.qaMode, undefined, id);
        this.selectedGridId = level.gridId; this.selectedTowerId = this.runTowers[0].id;
        this.resetGrid(level.startingGold);
        this.simulationClock.resetToDefaultSpeed();
        this.experience.returnHome();
        if (guided) this.experience.begin(); else this.experience.skip();
        this.statusText = `${level.label} · ${level.title} · ${guided ? '新手引导开始' : '自由布防'}`;
    }

    private loadoutTowers() {
        const stage = this.campaignEntries[this.campaignMenu.snapshot.selectedIndex];
        return stage?.id === 'third-level' ? ALL_TOWERS : PHASE_B_TOWERS;
    }
    /** 配塔页可以反复进入，但战斗目录只在确认出战时冻结；返回和结算不提前重建经济。 */
    private openLoadout(id: LevelId): void {
        this.experience.returnHome();
        this.refreshCampaignEntries();
        this.campaignMenu.select(this.campaignEntries.findIndex(stage => stage.id === id), this.campaignEntries.length);
        this.loadout = new TowerLoadout(id === 'third-level' ? THIRD_LEVEL_LOADOUT : FIXED_BEGINNER_LOADOUT);
        const storage = browserRecordStorage(); if (storage) this.loadout.restore(storage, id);
        this.campaignMenu.openLoadout();
    }

    private refreshCampaignEntries(): void {
        this.campaignEntries = campaignStages(id => ({
            bestSeconds: new FirstLevelBestTimeStore(this.qaMode, undefined, id).bestSeconds,
            bestHealth: new FirstLevelBestHealthStore(this.qaMode, undefined, id).bestRemainingHealth,
        }));
    }

    private returnToHome(): void {
        if (!this.preparing && !this.resultViewModel() && !(this.battle.snapshot.phase === 'paused' && this.pauseOverlay.snapshot.visible)) return;
        const previous = this.levelId;
        this.enterLevel(previous, false);
        this.experience.returnHome();
        this.refreshCampaignEntries();
        this.campaignMenu.select(this.campaignEntries.findIndex(stage => stage.id === previous), this.campaignEntries.length);
        this.homeSettingsVisible = false;
        this.playSound('ui');
    }

    private currentPathDelta(): number {
        return this.model.flowField.distanceAt(this.model.grid.entry) - this.initialPathLength;
    }

    private firstWaveReady(): boolean {
        return this.preparing && this.model.towers.size >= FIRST_WAVE_MIN_TOWER_COUNT
            && this.currentPathDelta() >= FIRST_WAVE_MIN_PATH_DELTA;
    }

    private startCurrentWave(): void {
        // 自动倒计时和玩家提前开波都汇入这里，避免生成器出现两套初始化顺序。
        // 候选路线与拖拽在开波时清理，但点格打开的选塔浮层保留，避免倒计时打断选择。
        // 浮层每帧重读金币/敌人占格，点选时重新提交预览，不沿用开波前的可建判断。
        const pendingBuildCell = this.buildCell;
        this.cancelInput('开波时已取消未提交的布塔');
        this.buildCell = pendingBuildCell;
        this.towerInspection.clear();
        const wave = this.waves.get(this.battle.snapshot.wave);
        this.combat.start(wave);
        this.routeDiagnostics.wave(this.routeContext());
        this.waveKillGold = 0;
        this.waveLeakedCount = 0;
        this.statusText = waveStartStatus(wave);
        this.playSound('wave-start');
    }

    private advanceCombat(deltaTime: number): void {
        let context = this.routeContext();
        if (this.qaFaultCell) {
            const blockedNextAt = this.qaFaultCell;
            const realFlow = context.flow;
            // 一步只读代理模拟“承诺格没有下一格”，不改真实地图或金币；用于验证同一生产诊断/恢复路径。
            const failedFlow: FlowField = Object.create(realFlow);
            failedFlow.nextCell = (cell, previous) => sameCell(cell, blockedNextAt) ? null : realFlow.nextCell(cell, previous);
            context = { ...context, flow: failedFlow };
            this.qaFaultCell = null;
        }
        const fault = this.routeDiagnostics.inspect(this.combat.enemies, context);
        if (fault) { this.pauseForRouteFault(fault); return; }
        let result: CombatTickResult;
        try {
            result = this.combat.tick(deltaTime, context.flow, this.model.deployments);
        } catch (error) {
            if (!(error instanceof RouteMovementError)) throw error;
            this.pauseForRouteFault(this.routeDiagnostics.runtimeFailure(error.actor, context));
            return;
        }
        this.routeDiagnostics.departed('killed', result.killed, context);
        this.routeDiagnostics.departed('leaked', result.leaked, context);
        // 格心迁移在同一步、同地图版本写入；不能拖到下一帧输入改图后再给旧迁移标新版本。
        const movedFault = this.routeDiagnostics.inspect(this.combat.enemies, context);
        if (movedFault) { this.pauseForRouteFault(movedFault); return; }
        this.feedback.consume(result);
        const coreBefore = this.battle.snapshot.coreHealth;
        this.waveLeakedCount += result.leaked.length;
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
        for (const cue of combatSoundCues(result, coreBefore, this.battle.snapshot.coreHealth)) this.playSound(cue);
        const phase = this.battle.snapshot.phase;
        let clearReward = 0;
        if (phase === 'countdown' || phase === 'victory') {
            this.combat.completeWave();
            // 状态机只决定波次结束；经济奖励经独立幂等结算器发放，避免职责互相反向依赖。
            clearReward = this.waveRewards.settle(this.waves.get(this.battle.snapshot.wave), this.economy).amount;
            this.browserDiagnostics.publishRouteJournal(this.routeDiagnostics.export());
        }
        if (phase === 'victory') {
            this.experience.finish();
            this.resultReveal.begin();
            this.resultWasNewRecord = this.bestTime.recordVictory(this.runClock.elapsedSeconds);
            this.resultWasNewHealthRecord = this.bestHealth.recordVictory(this.battle.snapshot.coreHealth);
            this.statusText = waveClearIncomeText(this.battle.snapshot.wave, this.waveKillGold, clearReward,
                this.waveLeakedCount, this.battle.snapshot.coreHealth);
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
            const clearText = waveClearIncomeText(this.battle.snapshot.wave, this.waveKillGold, clearReward,
                this.waveLeakedCount, this.battle.snapshot.coreHealth);
            this.statusText = qaPurchase
                ? `${clearText} · QA 建${qaPurchase.placed}升${qaPurchase.upgraded}`
                : clearText;
            this.playSound('wave-clear');
        } else if (phase === 'defeat') {
            this.experience.finish('interrupted');
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

    private routeContext(): RouteContext {
        return { flow: this.model.flowField, mapVersion: this.model.mapVersion,
            wave: this.battle.snapshot.wave, seconds: this.runClock.elapsedSeconds };
    }

    private connectRouteDiagnostics(): void {
        this.qaFaultCell = null;
        this.routeDiagnostics.reset(this.routeContext(), this.model.deployments);
        this.model.observeMutations(event => this.routeDiagnostics.placement(event, this.routeContext(), this.model.deployments));
        this.browserDiagnostics.publishRouteJournal(this.routeDiagnostics.export());
    }

    private pauseForRouteFault(fault: RouteFault): void {
        // 路线异常必须锁住继续；只能恢复战前检查点或首页，不删敌人、不发奖励、不判胜败。
        this.battle.pause();
        this.pauseOverlay.enterRouteError();
        this.guidedIntermissionHeld = false;
        this.cancelInput(`路线异常 ${fault.code} · 地图v${fault.mapVersion} · 诊断已保存`);
        this.sound.suspend();
        this.browserDiagnostics.publishRouteJournal(this.routeDiagnostics.export());
    }

    private pointToCell(point: Vec3): GridCell | null {
        return this.layout.pointToCell(point, this.model.grid);
    }

    private localPoint(event: EventTouch | EventMouse): Vec3 {
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
        this.buildMenuView?.render(this.pauseOverlay.snapshot.visible || result ? null : this.cellBuildMenuInput(), this.model.grid);
        const baselinePath = this.model.flowField.pathFrom(this.model.grid.entry);
        this.sound.updateMusic(firstLevelMusicMood({ home: experience.mode === 'home', phase: battle.phase,
            wave: battle.wave, preparing: this.preparing, pauseVisible: this.pauseOverlay.snapshot.visible,
            guidedHold: this.guidedIntermissionHeld }));
        const activePath = this.preview?.accepted && this.preview.path
            ? this.preview.path
            : baselinePath;
        const inspectedCell = this.towerInspection.cell;
        const inspectedDeployment = inspectedCell
            ? this.model.deployments.find(({ cell }) => sameCell(cell, inspectedCell))
            : undefined;
        const inspectedTowerId = inspectedDeployment?.towerId;
        const inspectedLevel = inspectedDeployment?.level ?? 1;
        const upgradeCost = inspectedTowerId
            ? nextUpgradeCost(towerDefinition(inspectedTowerId!), inspectedLevel)
            : null;
        const saleWindow = towerSaleWindow(this.preparing, battle.phase, this.guidedIntermissionHeld);
        const saleRefund = inspectedCell ? this.model.saleQuote(inspectedCell, saleWindow) : null;
        const baseGuidanceText = inspectedTowerId
            ? this.towerInspectionText(inspectedTowerId, inspectedLevel)
            : experience.guidanceText ?? firstLevelGuidance({
                preparing: this.preparing,
                towerCount: this.model.towers.size,
                pathDelta: this.currentPathDelta(),
                previewAccepted: this.preview?.accepted ?? null,
                selectedTowerId: this.selectedTowerId,
            });
        const upcomingWave = (this.guidedIntermissionHeld || battle.phase === 'countdown')
            && battle.wave < this.waves.totalWaves
            ? upcomingWaveBriefing(this.waves.get(battle.wave + 1))
            : null;
        // 下波敌情占用顶栏固定两行，操作建议仍在底栏；不再把第三行塞进窄屏引导槽。
        const guidanceText = baseGuidanceText;
        // 记住上次塔类型仅供下次操作复用；空闲态不能把卡片画成“已拿起”，否则点网格无响应像是故障。
        const activePlacementTowerId = activePlacementTower(this.selectedTowerId, this.inputMode);
        const waveStartButton = waveStartButtonViewModel(battle.phase, this.firstWaveReady(), this.guidedIntermissionHeld, battle.countdownSeconds);
        const sceneState: PhaseBSceneState = {
            qaMode: this.qaMode,
            useUnitSprites: this.unitSprites?.ready ?? false,
            missingUnitArt: this.unitSprites?.missingArtIds,
            selectedGridId: this.selectedGridId,
            grid: this.model.grid,
            towers: this.model.towers,
            towerIdsByCell: new Map(this.model.deployments.map(({ cell, towerId }) => [cellKey(cell), towerId])),
            towerLevelsByCell: new Map(this.model.deployments.map(({ cell, level }) => [cellKey(cell), level ?? 1])),
            activePath,
            previewBaselinePath: this.preview?.accepted && this.preview.path ? baselinePath : null,
            preview: this.preview,
            inspectedTower: inspectedCell && inspectedTowerId ? { cell: inspectedCell, towerId: inspectedTowerId, level: inspectedLevel, upgradeCost, saleRefund } : null,
            enemies: this.combat.enemies,
            feedback: this.feedback.snapshot,
            routeChange: this.routeChange.snapshot,
            gold: this.model.gold,
            coreHealth: battle.coreHealth,
            maxCoreHealth: this.initialCoreHealth,
            speedMultiplier: this.simulationClock.scale,
            soundEnabled: this.sound.isEnabled,
            reducedMotion: this.settings.snapshot.reducedMotion,
            activePlacementTowerId,
            waveStartButton,
            showCenterPause: centerPauseVisible(this.preparing, battle.phase, this.guidedIntermissionHeld),
            result,
            resultRevealProgress: this.settings.snapshot.reducedMotion ? 1 : this.resultReveal.progress,
        };
        this.backdrop?.setVisible(experience.mode !== 'home', LEVELS[this.levelId].backdropResource);
        // 先发布本帧身体/尸影坐标，再绘制事件；调用顺序不改变节点既定的前后层级。
        this.unitSprites?.render(sceneState, this.runClock.elapsedSeconds, experience.mode !== 'home');
        this.renderer?.render(sceneState, this.unitSprites?.visualAnchors);
        this.coreArt?.render(sceneState.grid, sceneState.feedback.coreHits, Boolean(result), sceneState.reducedMotion);
        this.entryArt?.render(sceneState.grid, Boolean(result));
        this.foregroundFeedback?.render(sceneState, this.unitSprites?.visualAnchors);
        this.experienceView?.render(experience, this.model.grid, Boolean(result), this.preview?.cell ?? null, inspectedCell,
            this.bestTime.bestSeconds, this.bestHealth.bestRemainingHealth, this.coachVisualSeconds, this.settings.snapshot.reducedMotion);
        this.campaignView?.render(experience.mode === 'home', this.campaignMenu.snapshot, this.campaignEntries, { towers: this.loadoutTowers(), selected: this.loadout.ids, fixed: this.campaignEntries[this.campaignMenu.snapshot.selectedIndex]?.id !== 'third-level', warnings: this.loadout.warnings });
        this.pauseView?.render({
            preparing: this.preparing,
            pause: this.pauseOverlay.snapshot,
            routeErrorDetail: this.routeDiagnostics.fault
                ? `第${battle.wave}波 · 地图v${this.routeDiagnostics.fault.mapVersion} · 诊断已保存` : undefined,
            wave: battle.wave,
            totalWaves: this.waves.totalWaves,
            coreHealth: battle.coreHealth,
            maxCoreHealth: this.initialCoreHealth,
            soundEnabled: this.sound.isEnabled,
            volumeStep: this.settings.snapshot.volumeStep,
            reducedMotion: this.settings.snapshot.reducedMotion,
            homeSettingsVisible: this.homeSettingsVisible,
            speedMultiplier: this.simulationClock.scale,
        });
        const pathLength = this.preview?.path?.length
            ? this.preview.path.length - 1
            : this.model.flowField.distanceAt(this.model.grid.entry);
        const waveSpawnProgress = this.combat.waveSpawnProgress;
        this.hud?.render({
            levelTitle: `${LEVELS[this.levelId].label} · ${LEVELS[this.levelId].campaign.district}`,
            qaMode: this.qaMode,
            entryMode: this.experience.entryMode,
            guidanceText,
            statusText: this.statusText,
            gold: this.model.gold,
            pathLength,
            wave: battle.wave,
            totalWaves: this.waves.totalWaves,
            coreHealth: battle.coreHealth,
            phaseText: this.phaseText(),
            maxCoreHealth: this.initialCoreHealth,
            showPause: sceneState.showCenterPause,
            phase: battle.phase,
            waveSpawned: waveSpawnProgress.spawned,
            waveTotal: waveSpawnProgress.total,
            activeEnemyCount: this.combat.enemies.length,
            speedMultiplier: this.simulationClock.scale,
            soundEnabled: this.sound.isEnabled,
            soundReady: this.sound.isReady,
            waveStartButton,
            activePlacementTowerId,
            inspectedUpgrade: inspectedTowerId ? { towerId: inspectedTowerId, level: inspectedLevel, cost: upgradeCost, saleRefund } : null,
            towerPanel: this.towerPanelInput(),
            coach: {experience,phase:battle.phase,preparing:this.preparing,held:this.guidedIntermissionHeld,
                overlayVisible:this.pauseOverlay.snapshot.visible || this.homeSettingsVisible,
                panelVisible:Boolean(this.buildCell || this.preview || inspectedDeployment), guidanceText,
                countdownSeconds:battle.countdownSeconds,
                upgradeTargetSelected:shouldOutlineGuidedUpgrade(experience.suggestedCell,inspectedCell),
                upcoming:this.preparing ? upcomingWaveBriefing(this.waves.get(1)) : upcomingWave},
            upcomingWave,
            result,
            resultRevealProgress: sceneState.resultRevealProgress,
        });
        this.publishBrowserDiagnostics(guidanceText, upcomingWave);
    }

    private publishBrowserDiagnostics(guidanceText: string | null, upcomingWave: UpcomingWaveBriefing | null): void {
        const pathLength = this.preview?.accepted && this.preview.path
            ? this.preview.path.length - 1
            : this.model.flowField.distanceAt(this.model.grid.entry);
        const result = this.resultViewModel();
        const waveSpawnProgress = this.combat.waveSpawnProgress;
        const deployments = this.model.deployments;
        const soundDiagnostics = this.sound.diagnostics;
        const musicDiagnostics = this.sound.musicDiagnostics;
        const rivetTowerCount = deployments.filter(({ towerId }) => towerId === 'rivet-gun').length;
        const frostTowerCount = deployments.filter(({ towerId }) => towerId === 'frost-coil').length;
        const upgradedTowerCount = deployments.filter(({ level }) => (level ?? 1) > 1).length;
        const slowedEnemyCount = this.combat.enemies.filter(({ slowRemainingSeconds }) => slowRemainingSeconds > 0).length;
        const visibleEnemyHealthBarCount = this.combat.enemies.filter((enemy) =>
            enemyHealthBarRatio(enemy.health, enemy.archetype.maxHealth) !== null).length;
        const inspectedCell = this.towerInspection.cell;
        const saleWindow = towerSaleWindow(this.preparing, this.battle.snapshot.phase, this.guidedIntermissionHeld);
        const inspectedSaleRefund = inspectedCell ? this.model.saleQuote(inspectedCell, saleWindow) : null;
        const saleAccessibleText = inspectedSaleRefund === null ? ''
            : `已选塔可${saleWindow === 'opening' ? '全额撤销' : saleWindow === 'combat' ? '战斗拆除（五折）' : '波间出售（七折）'}返还${inspectedSaleRefund}金币，`;
        // 第一波使用布防门槛，波间才使用提前开波状态；避免读屏把可开的第一波误报为未激活。
        const waveStartAccessibleText = this.preparing
            ? this.firstWaveReady()
                ? '第一波可开'
                : '第一波待布防'
            : this.guidedIntermissionHeld ? '下一波可开'
            : this.battle.snapshot.phase === 'countdown' ? '可提前开波' : '提前开波未激活';
        this.browserDiagnostics.publish({
            ...this.renderBudgetProbe.read(performance.now()),
            ...this.textureTransferProbe.read(this.experience.entryMode === 'home'),
            renderAtlasPolicyStatus: this.renderAtlasPolicyStatus,
            combatVisualAlignment: this.foregroundFeedback?.alignmentDiagnostics ?? [],
            combatRewardOrigins: this.foregroundFeedback?.rewardAlignmentDiagnostics ?? [],
            combatTargetLocks: this.combat.lockedTargets,
            eightDirectionHeadStatus: this.unitSprites?.eightDirectionHeadStatus ?? 'unavailable',
            towerHeadDirections: this.unitSprites?.towerDirectionSamples ?? [],
            frostUpgradeArtStatus: this.unitSprites?.frostUpgradeArtStatus ?? 'unavailable',
            frostTowerArtLevels: this.unitSprites?.frostArtSamples ?? [],
            entryMode: this.experience.entryMode,
            tutorialStatus: this.experience.status,
            levelId: this.levelId,
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
            inspectedTowerCell: inspectedCell ? cellKey(inspectedCell) : null,
            inspectedSaleRefund,
            slowedEnemyCount,
            visibleEnemyHealthBarCount,
            renderedEnemyHealthBarCount: this.unitSprites?.renderedHealthBarCount ?? 0,
            displacedEnemyHealthBarCount: this.unitSprites?.displacedHealthBarCount ?? 0,
            overlappingEnemyHealthBarPairs: this.unitSprites?.overlappingHealthBarPairs ?? 0,
            nearCoincidentEnemyAnchorPairs: this.unitSprites?.nearCoincidentEnemyAnchorPairs ?? 0,
            enemyTrafficProfile: this.enemyTraffic ? 'two-lane' : 'legacy',
            waitingEnemyCount: this.combat.enemies.filter((enemy) => enemy.trafficWaiting).length,
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
            bestRemainingHealth: this.bestHealth.bestRemainingHealth,
            resultWasNewRecord: this.resultWasNewRecord,
            resultWasNewHealthRecord: this.resultWasNewHealthRecord,
            soundEnabled: this.sound.isEnabled,
            soundVolumePercent: this.settings.snapshot.volumeStep * 25,
            reducedMotion: this.settings.snapshot.reducedMotion,
            homeSettingsVisible: this.homeSettingsVisible,
            soundReady: this.sound.isReady,
            canStartNextWaveEarly: this.battle.snapshot.phase === 'countdown',
            soundLastCue: soundDiagnostics.lastCue,
            soundCueCount: soundDiagnostics.acceptedCount,
            soundCueCounts: soundDiagnostics.cueCounts,
            soundVoiceCount: soundDiagnostics.activeVoices,
            musicReady: musicDiagnostics.ready,
            musicPlaying: musicDiagnostics.playing,
            musicVoiceCount: musicDiagnostics.voices,
            musicMood: musicDiagnostics.mood,
            musicIntensityActive: musicDiagnostics.intensityActive,
            musicIntensityPending: musicDiagnostics.intensityPending,
            musicPositionSeconds: musicDiagnostics.positionSeconds,
            musicDucked: musicDiagnostics.ducked,
            musicStartCount: musicDiagnostics.starts,
            coreHealth: this.battle.snapshot.coreHealth,
            activeEnemyCount: this.combat.enemies.length,
            runTowerIds: this.runTowers.map(tower=>tower.id),
            enemyDefenseSamples: this.combat.enemies.slice(0,8).map(enemy=>({id:enemy.id,archetype:enemy.archetype.id,
                health:enemy.health,shield:enemy.shield??0,maxShield:enemy.archetype.maxShield??0,armor:enemy.archetype.armorReduction??0})),
            waveSpawnedEnemyCount: waveSpawnProgress.spawned,
            waveTotalEnemyCount: waveSpawnProgress.total,
            infantryGaitFrameLoaded: this.unitSprites?.hasGaitFrame('clockwork-infantry') ?? false,
            infantryDirectionalWalkStatus: this.unitSprites?.directionalWalkStatus ?? 'disabled',
            artBudgetProfile: this.artProfile.id,
            backdropResourcePath: this.backdrop?.loadedResourcePath ?? null,
            infantryDirectionalWalkSamples: this.unitSprites?.directionalWalkSamples ?? [],
            infantryDirectionalCollapseStatus: this.unitSprites?.directionalCollapseStatus ?? 'disabled',
            infantryDirectionalCollapseSamples: this.unitSprites?.directionalCollapseSamples ?? [],
            activeInfantryDirectionalCollapseCount: this.unitSprites?.activeDirectionalCollapseCount ?? 0,
            runnerGaitFrameLoaded: this.unitSprites?.hasGaitFrame('clockwork-runner') ?? false,
            haulerGaitFrameLoaded: this.unitSprites?.hasGaitFrame('iron-canister-hauler') ?? false,
            infantryDeathFrameLoaded: this.unitSprites?.hasDeathFrame('clockwork-infantry') ?? false,
            entryArtLoaded: this.entryArt?.ready ?? false,
            activeInfantryCollapseCount: this.unitSprites?.activeInfantryCollapseCount ?? 0,
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
            lifecycleRecovery: this.pauseOverlay.snapshot.lifecycleRecovery,
            routeFaultCode: this.routeDiagnostics.fault?.code ?? null,
            routeEventCount: this.routeDiagnostics.eventCount,
            routeRetainedEventCount: this.routeDiagnostics.retainedCount,
            inputMode: this.inputMode,
            lastInputPoint: { x: this.pressStart.x, y: this.pressStart.y },
            previewAccepted: this.preview?.accepted ?? null,
            status: this.statusText,
        },
            this.experience.entryMode === 'home'
                ? this.homeSettingsVisible ? '夜城防线游戏设置，声音、音量、减弱动态，返回菜单'
                    : this.campaignMenu.snapshot.screen === 'welcome' ? '夜城防线欢迎页，开始游戏进入关卡地图，炮塔与怪物图鉴，设置'
                    : this.campaignMenu.snapshot.screen === 'codex' ? `夜城图鉴，${this.campaignMenu.snapshot.codex?.category==='towers'?'炮塔':'怪物'}，${codexEntry(this.campaignMenu.snapshot.codex!).label}，等级${this.campaignMenu.snapshot.codex?.level}，上一个，下一个，切换炮塔或怪物，返回`
                    : this.campaignMenu.snapshot.screen === 'loadout' ? `出战配塔，已携带${this.loadout.ids.map(id => towerDefinition(id).label).join('、')}，${this.loadout.warnings.join('，')}，开始布防，返回地图，设置`
                    : `夜城战役关卡地图，${this.campaignEntries.map(stage => `${stage.label}${stage.district}`).join('，')}，已选择${this.campaignEntries[this.campaignMenu.snapshot.selectedIndex]?.label}，进入关卡，炮塔与怪物图鉴，返回欢迎页，设置`
                : result
                ? `${result.title}，${result.summary.replace('\n', '，')}，${result.runDetails.map(({ label, value }) => `${label}${value}`).join('，')}，${result.footnote}，${result.actionLabel}，${result.homeActionLabel}`
                : this.pauseOverlay.snapshot.visible
                ? this.pauseOverlay.hasReason('route-error')
                    ? `夜城防线路线异常，战斗已冻结，诊断已保存，不能继续；重新部署或返回地图，第${this.battle.snapshot.wave}波，地图版本${this.model.mapVersion}`
                    : this.pauseOverlay.hasReason('orientation')
                    ? `夜城防线横屏安全暂停，请转回竖屏，再点继续战斗。第${this.battle.snapshot.wave}波，核心${this.battle.snapshot.coreHealth}`
                    : `夜城防线暂停，${this.pauseOverlay.snapshot.screen === 'menu' ? firstLevelPauseMenuPresentation(this.pauseOverlay.snapshot).actions.join('，') : this.pauseOverlay.snapshot.screen === 'settings' ? '声音、音量、减弱动态、速度设置，返回暂停' : '请确认或取消'}，第${this.battle.snapshot.wave}波，核心${this.battle.snapshot.coreHealth}`
                : `夜城防线${LEVELS[this.levelId].label}游戏画布，${this.model.grid.columns}乘${this.model.grid.rows}，金币${this.model.gold}，路径${pathLength}格，机枪${rivetTowerCount}座，冷凝${frostTowerCount}座，减速中${slowedEnemyCount}名，${this.inputMode === 'idle' ? '未拿起炮塔' : `已拿起${this.selectedTowerLabel()}`}，速度${this.simulationClock.scale}倍，${waveStartAccessibleText}，${saleAccessibleText}${upcomingWave ? `下一波第${upcomingWave.wave}波，${upcomingWave.accessibleLineup}，${upcomingWave.tactic}，` : ''}${guidanceText ? `${guidanceText}，` : ''}${this.statusText}`.replace(/，$/, ''),
        );
    }

    private resultViewModel() {
        return buildBattleResultViewModel(
            this.battle.snapshot,
            this.combat.totals,
            this.model.gold,
            {
                levelLabel: LEVELS[this.levelId].label,
                nextLevelLabel: LEVELS[this.levelId].nextLevel ? LEVELS[LEVELS[this.levelId].nextLevel!].label : undefined,
                initialCoreHealth: this.initialCoreHealth,
                totalWaves: this.waves.totalWaves,
                elapsedSeconds: this.runClock.elapsedSeconds,
                towerCount: this.model.deployments.length,
                upgradeCount: this.model.deployments.reduce((sum, { level }) => sum + (level ?? 1) - 1, 0),
                bestSeconds: this.bestTime.bestSeconds,
                newRecord: this.resultWasNewRecord,
                bestRemainingHealth: this.bestHealth.bestRemainingHealth,
                bestCoreHealthCapacity: FIRST_LEVEL_RECORD_CORE_CAPACITY,
                newHealthRecord: this.resultWasNewHealthRecord,
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
            entry: '入口接入通道，需保持畅通',
            exit: '出口接出通道，需保持畅通',
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
