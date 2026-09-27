const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { replayFirstLevel } = require('./support/first-level-replay.cjs');
const { standardLayout } = require('./support/first-level-strategies.cjs');

const { PHASE_A_GRIDS, PHASE_A_TOWER_COST } = require('../.test-dist/config/PhaseAGrids.js');
const { FIRST_LEVEL_GUIDED_UPGRADES, FIRST_LEVEL_OPENING, FIRST_LEVEL_OPTIONAL_FORTIFICATIONS, FIRST_LEVEL_REINFORCEMENTS, FIRST_LEVEL_STARTING_GOLD, FIRST_LEVEL_SUGGESTED_PATH_DELTA } = require('../.test-dist/config/FirstLevelOpening.js');
const { CLOCKWORK_INFANTRY, CLOCKWORK_RUNNER, FROST_COIL, IRON_CANISTER_HAULER, PHASE_B_TOWERS, PHASE_B_WAVES, PHASE_B_WAVE_ONE, RIVET_GUN } = require('../.test-dist/config/PhaseBCombatConfig.js');
const { cellKey } = require('../.test-dist/core/GridTypes.js');
const { FlowField } = require('../.test-dist/systems/FlowField.js');
const { applyGuidedQaOpening, applyGuidedQaPurchases, canApplyGuidedQaPurchases, shouldHoldQaIntermission } = require('../.test-dist/systems/GuidedQaPlacement.js');
const { PlacementModel } = require('../.test-dist/systems/PlacementModel.js');
const { nextUpgradeCost, towerAtLevel, towerInvestment } = require('../.test-dist/systems/TowerLevelRules.js');
const { simulateNoDamageRoute } = require('../.test-dist/systems/RouteSimulation.js');
const { BattleStateMachine, towerSaleWindow } = require('../.test-dist/systems/BattleStateMachine.js');
const { EconomyLedger } = require('../.test-dist/systems/EconomyLedger.js');
const { BattleRunCheckpoint } = require('../.test-dist/systems/BattleRunCheckpoint.js');
const { PauseOverlayRuntime } = require('../.test-dist/systems/PauseOverlayRuntime.js');
const { isCoarseLandscape } = require('../.test-dist/systems/ViewportSafety.js');
const { BattleRunClock } = require('../.test-dist/systems/BattleRunClock.js');
const { FirstLevelBestTimeStore } = require('../.test-dist/systems/FirstLevelBestTimeStore.js');
const { FirstLevelSoundDirector } = require('../.test-dist/audio/FirstLevelSoundDirector.js');
const { TowerInspection } = require('../.test-dist/input/TowerInspection.js');
const { activePlacementTower } = require('../.test-dist/input/TowerPlacementMode.js');
const { WaveCombatRuntime } = require('../.test-dist/systems/WaveCombatRuntime.js');
const { WaveCatalog } = require('../.test-dist/systems/WaveCatalog.js');
const { WaveRewardRuntime } = require('../.test-dist/systems/WaveRewardRuntime.js');
const { SimulationClock } = require('../.test-dist/systems/SimulationClock.js');
const { buildBattleResultViewModel, formatRunDuration } = require('../.test-dist/presentation/BattleResultViewModel.js');
const { ResultRevealRuntime, resultRevealEase } = require('../.test-dist/presentation/ResultRevealRuntime.js');
const { countCombatFeedback, CombatFeedbackRuntime } = require('../.test-dist/presentation/CombatFeedbackRuntime.js');
const { buildCoreObjectiveState } = require('../.test-dist/presentation/CoreObjectiveState.js');
const { enemyCrowdGroups } = require('../.test-dist/presentation/EnemyCrowdGroups.js');
const { firstLevelGuidance } = require('../.test-dist/presentation/FirstLevelGuidance.js');
const { FirstLevelExperience } = require('../.test-dist/presentation/FirstLevelExperience.js');
const { firstLevelWaveBanner } = require('../.test-dist/presentation/FirstLevelWaveBanner.js');
const { hudEventText, towerInspectionSummary, towerSelectionSummary, towerUpgradeSuccessText, waveClearIncomeText, waveStartButtonViewModel } = require('../.test-dist/presentation/PhaseBHudText.js');
const { enemyDeathFeedbackSeconds, enemyDeathPose, enemyGaitFrame, enemySlowVisualStrength, enemyStridePose, enemyVisualOffset, frostCorePulsePose, towerRecoilPose } = require('../.test-dist/presentation/UnitVisualMotion.js');
const { RouteChangeFeedback, routeChangeText, routeLengthDelta, routePathChanged } = require('../.test-dist/presentation/RouteChangeFeedback.js');
const { routePreviewDiff } = require('../.test-dist/presentation/RoutePreviewDiff.js');
const { upcomingWaveBriefing, waveLineup, waveStartStatus, waveThreatHint } = require('../.test-dist/presentation/WaveBriefing.js');
const {
    PHASE_B_EARLY_WAVE_BUTTON,
    PHASE_B_SPEED_BUTTON,
    PHASE_B_RIVET_BUTTON,
    PHASE_B_FROST_BUTTON,
    PHASE_B_RESULT_RESTART_BUTTON,
    PHASE_B_RESULT_HOME_BUTTON,
    PHASE_B_PAUSE_BUTTONS,
    phaseBPauseButtons,
    PHASE_B_TOWER_BUTTON,
    PHASE_B_SOUND_BUTTON,
    PhaseBLayout,
} = require('../.test-dist/presentation/PhaseBLayout.js');

const fixtures = JSON.parse(readFileSync(resolve(__dirname, '../docs/poc/phase-a-fixtures.json'), 'utf8'));

test('首关 HUD 将重复金币移到独立数值卡，保留建塔与波次事件', () => {
    assert.equal(hudEventText('机枪塔已建造 · 路线 +2 格 · 金币 10'), '机枪塔已建造 · 路线 +2 格');
    assert.equal(hudEventText('第 1 波清场！清场 +20 · 剩余金币 54'), '第 1 波清场！清场 +20');
    assert.equal(hudEventText('核心已失守'), '核心已失守');
    assert.equal(waveClearIncomeText(1, 36, 8), '第 1 波守住 · 本波 +44（清场 +8）');
    assert.equal(waveClearIncomeText(8, 200, 20), '第 8 波守住 · 本波 +220（清场 +20）');
    assert.equal(towerInspectionSummary(RIVET_GUN, 1), '机枪塔 Lv1 · 2.6格 · 伤害7');
    assert.equal(towerInspectionSummary(RIVET_GUN, 2), '机枪塔 Lv2 · 2.8格 · 伤害11');
    assert.equal(towerInspectionSummary(RIVET_GUN, 3), '机枪塔 Lv3 · 3.2格 · 伤害18');
    assert.equal(towerInspectionSummary(FROST_COIL, 1), '冷凝塔 Lv1 · 3格 · 范围减速75%');
    assert.equal(towerInspectionSummary(FROST_COIL, 3), '冷凝塔 Lv3 · 3.5格 · 范围减速89%');
    assert.equal(towerSelectionSummary(FROST_COIL), '已选冷凝塔 · 范围减速75% · 1.2秒');
    assert.equal(towerSelectionSummary(RIVET_GUN), '已选机枪塔 · 稳定单体输出');
    assert.equal(towerUpgradeSuccessText('frost-coil', 2), '冷凝塔升至 Lv2 · 范围减速增强');
    assert.equal(towerUpgradeSuccessText('rivet-gun', 3), '机枪塔升至 Lv3 · 火力与射程提升');
});

test('底栏开波按钮按首波、波间与教学待命状态展示一致的动作', () => {
    assert.deepEqual(waveStartButtonViewModel('preparing', false, false, 0), { label: '第一波\n先布防', active: false });
    assert.deepEqual(waveStartButtonViewModel('preparing', true, false, 0), { label: '开始\n第一波', active: true });
    assert.deepEqual(waveStartButtonViewModel('countdown', false, false, 7.2), { label: '提前开波\n8 秒', active: true });
    assert.deepEqual(waveStartButtonViewModel('paused', false, true, 0), { label: '开始\n下一波', active: true });
    assert.deepEqual(waveStartButtonViewModel('spawning', false, false, 0), { label: '提前开波\n等待中', active: false });
});

test('只有拿起或预览中的塔卡高亮，空闲态记住塔种但不冒充可直接落塔', () => {
    assert.equal(activePlacementTower('rivet-gun', 'idle'), null);
    assert.equal(activePlacementTower('frost-coil', 'idle'), null);
    for (const mode of ['tower-pressed', 'armed', 'dragging', 'click-preview']) {
        assert.equal(activePlacementTower('frost-coil', mode), 'frost-coil');
    }
});

test('同格敌群显示局部人数，单只不添徽标且只读计算不改变敌人位置', () => {
    const close = (progress) => ({ fromCell: { column: 4, row: 0 }, toCell: { column: 4, row: 1 }, progress });
    const enemies = [close(0.1), close(0.2), close(0.8),
        { fromCell: { column: 5, row: 1 }, toCell: { column: 6, row: 1 }, progress: 0.1 }];
    const groups = enemyCrowdGroups(enemies);
    assert.deepEqual(groups.map(({ key, count, column }) => ({ key, count, column })), [{ key: '4,0', count: 2, column: 4 }]);
    assert.ok(Math.abs(groups[0].row - 0.15) < 1e-10);
    assert.deepEqual(enemyCrowdGroups([close(0.1)]), []);
    assert.equal(enemies[0].progress, 0.1);
    assert.deepEqual(enemyCrowdGroups([close(Number.NaN), close(0)]), [{ key: '4,0', count: 2, column: 4, row: 0 }]);
});

test('相邻拥挤格的徽标合为一个人数，远处敌群仍保留独立提示', () => {
    const between = (progress, column = 4) => ({ fromCell: { column, row: 0 }, toCell: { column, row: 1 }, progress });
    const groups = enemyCrowdGroups([between(0.3), between(0.4), between(0.6), between(0.7),
        between(0.2, 7), between(0.3, 7)]);
    assert.deepEqual(groups.map(({ key, count }) => ({ key, count })), [
        { key: '4,0', count: 4 }, { key: '7,0', count: 2 },
    ]);
    assert.ok(Math.abs(groups[0].row - 0.5) < 1e-10);
});

test('QA 推荐夹具复用真实购买事务，八波购买窗口与重复按键保持稳定', () => {
    const economy = new EconomyLedger(FIRST_LEVEL_STARTING_GOLD);
    const model = new PlacementModel(PHASE_A_GRIDS['grid-9x13'], economy, PHASE_B_TOWERS);
    assert.deepEqual(applyGuidedQaOpening(model), { placed: 4, upgraded: 0, gold: 10, pathLength: 16 });
    assert.deepEqual(applyGuidedQaOpening(model), { placed: 0, upgraded: 0, gold: 10, pathLength: 16 });
    const income = [44, 42, 58, 52, 39, 132, 88];
    const expectedGold = [0, 12, 40, 52, 29, 89, 129];
    for (let wave = 1; wave <= 7; wave += 1) {
        economy.credit(income[wave - 1]);
        const applied = applyGuidedQaPurchases(model, wave);
        assert.equal(applied.gold, expectedGold[wave - 1]);
        assert.equal(applied.placed, wave <= 6 ? 1 : 0);
        assert.equal(applied.upgraded, [1, 5, 6, 7].includes(wave) ? 1 : 0);
        assert.deepEqual(applyGuidedQaPurchases(model, wave), {
            placed: 0, upgraded: 0, gold: applied.gold, pathLength: applied.pathLength,
        });
    }
    assert.equal(model.deployments.length, 10);
    assert.equal(model.flowField.distanceAt(model.grid.entry), 20);
    economy.credit(220);
    assert.equal(model.gold, 349);
});

test('QA 自然倒计时只开放波间真实购买，不进入教学强制暂停', () => {
    assert.equal(shouldHoldQaIntermission(true, false), true);
    assert.equal(shouldHoldQaIntermission(true, true), false);
    assert.equal(shouldHoldQaIntermission(false, false), false);
    assert.equal(canApplyGuidedQaPurchases('paused', true, false), true);
    assert.equal(canApplyGuidedQaPurchases('countdown', false, true), true);
    assert.equal(canApplyGuidedQaPurchases('spawning', false, true), false);
    assert.equal(canApplyGuidedQaPurchases('paused', false, true), false);
    assert.equal(canApplyGuidedQaPurchases('countdown', false, false), false);
});

test('波内生成进度区分短暂清屏、真正清场和下一波待命', () => {
    assert.equal(firstLevelWaveBanner({ wave: 0, spawned: 0, total: 0, activeEnemies: 0, phase: 'preparing' }), '第一关 · 守住夜城入口');
    assert.equal(firstLevelWaveBanner({ wave: 3, spawned: 8, total: 10, activeEnemies: 0, phase: 'spawning' }), '第 3 波 · 已来 8/10 · 场上 0');
    assert.equal(firstLevelWaveBanner({ wave: 3, spawned: 10, total: 10, activeEnemies: 2, phase: 'clearing' }), '第 3 波 · 已来 10/10 · 场上 2');
    assert.equal(firstLevelWaveBanner({ wave: 3, spawned: 10, total: 10, activeEnemies: 0, phase: 'paused' }), '第 3 波守住 · 下一波待命');
});

test('同波分组间暂时无敌人时仍提示后续来袭，不提前显示守住', () => {
    const grid = { id: 'grid-9x13', columns: 3, rows: 3, entry: { column: 1, row: 0 }, exit: { column: 1, row: 2 } };
    const enemy = { id: 'clockwork-infantry', maxHealth: 1, speedCellsPerSecond: 1, killReward: 1 };
    const tower = { id: 'rivet-gun', rangeCells: 3, damage: 1, attackIntervalSeconds: 0.3 };
    const runtime = new WaveCombatRuntime(grid, tower);
    const flow = new FlowField(grid, new Set());
    runtime.start({ wave: 3, groups: [
        { enemy, count: 1, spawnIntervalSeconds: 0.9 },
        { enemy, count: 1, spawnIntervalSeconds: 0.9 },
    ] });
    runtime.tick(0, flow, new Set(['0,1']));
    assert.equal(runtime.enemies.length, 0);
    assert.equal(runtime.isSpawningComplete, false);
    assert.equal(firstLevelWaveBanner({ wave: 3, ...runtime.waveSpawnProgress, activeEnemies: runtime.enemies.length, phase: 'spawning' }), '第 3 波 · 已来 1/2 · 场上 0');
});

test('出口核心标识按真实生命显示完整、受损和危急状态', () => {
    assert.deepEqual(buildCoreObjectiveState(10, 10), { health: 10, maxHealth: 10, ratio: 1, tone: 'steady' });
    assert.deepEqual(buildCoreObjectiveState(8, 10), { health: 8, maxHealth: 10, ratio: 0.8, tone: 'steady' });
    assert.deepEqual(buildCoreObjectiveState(4, 10), { health: 4, maxHealth: 10, ratio: 0.4, tone: 'strained' });
    assert.deepEqual(buildCoreObjectiveState(2, 10), { health: 2, maxHealth: 10, ratio: 0.2, tone: 'critical' });
    assert.deepEqual(buildCoreObjectiveState(0, 10), { health: 0, maxHealth: 10, ratio: 0, tone: 'empty' });
    assert.deepEqual(buildCoreObjectiveState(2, 2), { health: 2, maxHealth: 2, ratio: 1, tone: 'steady' });
    assert.throws(() => buildCoreObjectiveState(2, 0), /上限为正数/);
});

test('首关提示跟随真实布塔门槛，预览与战斗阶段优先级明确', () => {
    const base = { preparing: true, towerCount: 0, pathDelta: 0, previewAccepted: null, selectedTowerId: 'rivet-gun' };
    assert.match(firstLevelGuidance(base), /拖动机枪塔/);
    assert.match(firstLevelGuidance({ ...base, towerCount: 1 }), /再建一座塔/);
    assert.match(firstLevelGuidance({ ...base, towerCount: 2, pathDelta: 1 }), /延长 1 格/);
    assert.match(firstLevelGuidance({ ...base, towerCount: 2, pathDelta: 2 }), /点开始迎敌/);
    assert.match(firstLevelGuidance({ ...base, previewAccepted: false }), /不能建造/);
    assert.match(firstLevelGuidance({ ...base, previewAccepted: true }), /再点一次确认/);
    assert.match(firstLevelGuidance({ ...base, preparing: false }), /战斗中仍可布塔/);
});

test('首关入场卡独立于战斗，教学随真实布塔状态推进且可跳过', () => {
    const flow = new FirstLevelExperience(false);
    const context = { preparing: true, towerCount: 0, pathDelta: 0, previewAccepted: null, inputMode: 'idle', gold: 140, phase: 'preparing', wave: 0, occupiedCells: new Set(), towerLevelsByCell: new Map(), guidedIntermissionHeld: false };
    assert.equal(flow.snapshot(context).mode, 'home');
    flow.begin();
    assert.equal(flow.shouldHoldIntermission(1, 8), true);
    assert.equal(flow.shouldHoldIntermission(7, 8), true);
    assert.equal(flow.shouldHoldIntermission(8, 8), false);
    assert.equal(flow.snapshot(context).step, 'select');
    assert.deepEqual(flow.snapshot(context).suggestedCell, { column: 3, row: 2 });
    assert.equal(flow.snapshot({ ...context, inputMode: 'armed' }).step, 'place');
    assert.match(flow.snapshot({ ...context, inputMode: 'click-preview', previewAccepted: false }).guidanceText, /红色/);
    assert.match(flow.snapshot({ ...context, towerCount: 1, previewAccepted: true }).guidanceText, /布防 2\/4/);
    assert.equal(flow.snapshot({ ...context, towerCount: 1, pathDelta: 2 }).suggestedTowerId, 'frost-coil');
    assert.deepEqual(flow.snapshot({ ...context, towerCount: 1, occupiedCells: new Set(['3,2']) }).suggestedCell, { column: 2, row: 2 });
    assert.equal(flow.snapshot({ ...context, towerCount: 1, inputMode: 'armed' }).step, 'place');
    assert.equal(flow.snapshot({ ...context, towerCount: 2, pathDelta: 2 }).step, 'shape');
    assert.equal(flow.snapshot({ ...context, towerCount: 2, pathDelta: 2 }).canStartFirstWave, true);
    assert.match(flow.snapshot({ ...context, towerCount: 2, pathDelta: 2 }).guidanceText, /可提前开波.*两塔火力薄弱.*点 ▶ 挑战/s);
    assert.match(flow.snapshot({ ...context, towerCount: 2, pathDelta: 2, previewAccepted: true }).guidanceText, /可提前开波/);
    assert.equal(flow.snapshot({ ...context, towerCount: 4, pathDelta: 2 }).step, 'ready');
    assert.match(flow.snapshot({ ...context, towerCount: 4, pathDelta: 2 }).guidanceText, /绕路仅 \+2 格.*推荐 \+4 格更稳/s);
    assert.equal(flow.snapshot({ ...context, towerCount: 4, pathDelta: 0 }).step, 'route');
    assert.match(flow.snapshot({ ...context, towerCount: 4, pathDelta: 0 }).guidanceText, /开波路线还差 2 格/);
    assert.equal(flow.snapshot({ ...context, towerCount: 4, pathDelta: 4 }).step, 'ready');
    assert.match(flow.snapshot({ ...context, towerCount: 4, pathDelta: 4 }).guidanceText, /绕路 \+4 格\n点 ▶/);
    const misplaced = flow.snapshot({ ...context, towerCount: 4, pathDelta: 0,
        occupiedCells: new Set(['8,4', '2,2', '3,2', '4,2']) });
    assert.deepEqual(misplaced.suggestedCell, { column: 8, row: 4 });
    assert.match(misplaced.guidanceText, /点高亮塔，再点下方撤销/);
    assert.equal(flow.snapshot({ ...context, towerCount: 3, gold: 10 }).step, 'route');
    assert.equal(flow.snapshot({ ...context, towerCount: 3, pathDelta: 2, gold: 10 }).step, 'ready');
    assert.match(flow.snapshot({ ...context, towerCount: 3, pathDelta: 2, gold: 10 }).guidanceText, /防线未补齐/);
    assert.equal(flow.snapshot({ ...context, preparing: false, phase: 'countdown', wave: 1, gold: 54 }).step, 'reinforce');
    const upgradeCoach = { ...context, preparing: false, phase: 'paused', wave: 1, gold: 54,
        guidedIntermissionHeld: true, occupiedCells: new Set(['3,2']), towerLevelsByCell: new Map([['3,2', 1]]) };
    assert.equal(flow.snapshot(upgradeCoach).step, 'upgrade');
    assert.deepEqual(flow.snapshot(upgradeCoach).suggestedCell, { column: 3, row: 2 });
    assert.equal(flow.snapshot({ ...upgradeCoach, gold: 30, towerLevelsByCell: new Map([['3,2', 2]]) }).step, 'reinforce');
    assert.match(flow.snapshot({ ...context, preparing: false, phase: 'paused', wave: 1, gold: 54, guidedIntermissionHeld: true }).guidanceText, /补机枪延长路线，再点 ▶/);
    assert.match(flow.snapshot({ ...context, preparing: false, phase: 'paused', wave: 1, gold: 24, guidedIntermissionHeld: true,
        occupiedCells: new Set([cellKey(FIRST_LEVEL_REINFORCEMENTS[0].cell)]) }).guidanceText, /本轮布防完成/);
    assert.equal(flow.snapshot({ ...context, preparing: false, phase: 'paused', wave: 1, gold: 24, guidedIntermissionHeld: true }).step, 'ready');
    assert.equal(flow.snapshot({ ...context, preparing: false, phase: 'paused', wave: 4, gold: 44, guidedIntermissionHeld: true, occupiedCells: new Set(FIRST_LEVEL_REINFORCEMENTS.slice(0, 3).map(({ cell }) => cellKey(cell))) }).suggestedTowerId, 'frost-coil');
    assert.match(flow.snapshot({ ...context, preparing: false, phase: 'paused', wave: 4, gold: 38, guidedIntermissionHeld: true, occupiedCells: new Set(FIRST_LEVEL_REINFORCEMENTS.slice(0, 3).map(({ cell }) => cellKey(cell))) }).guidanceText, /暂缺金币/);
    const lateOccupied = new Set([...FIRST_LEVEL_OPENING, ...FIRST_LEVEL_REINFORCEMENTS].map(({ cell }) => cellKey(cell)));
    const levelTwo = new Map([['3,2', 2], ['7,8', 2]]);
    assert.deepEqual(flow.snapshot({ ...context, preparing: false, phase: 'paused', wave: 5, gold: 80,
        guidedIntermissionHeld: true, occupiedCells: lateOccupied,
        towerLevelsByCell: new Map([['3,2', 2], ['7,8', 1]]) }).suggestedCell, { column: 7, row: 8 });
    assert.deepEqual(flow.snapshot({ ...context, preparing: false, phase: 'paused', wave: 6, gold: 82,
        guidedIntermissionHeld: true, occupiedCells: lateOccupied, towerLevelsByCell: levelTwo }).suggestedCell, { column: 3, row: 2 });
    assert.deepEqual(flow.snapshot({ ...context, preparing: false, phase: 'paused', wave: 7, gold: 82,
        guidedIntermissionHeld: true, occupiedCells: lateOccupied,
        towerLevelsByCell: new Map([['3,2', 3], ['7,8', 2]]) }).suggestedCell, { column: 7, row: 8 });
    assert.match(flow.snapshot({ ...context, preparing: false, phase: 'paused', wave: 7, gold: 82,
        guidedIntermissionHeld: true, occupiedCells: lateOccupied,
        towerLevelsByCell: new Map([['3,2', 3], ['7,8', 3]]) }).guidanceText, /可自由加固/);
    assert.equal(flow.snapshot({ ...context, preparing: false, phase: 'paused', wave: 1, gold: 54 }).step, 'combat');
    assert.equal(flow.snapshot({ ...context, preparing: false }).step, 'combat');
    flow.skip();
    assert.equal(flow.shouldHoldIntermission(1, 8), false);
    assert.equal(flow.snapshot(context).mode, 'free');
    assert.equal(flow.snapshot(context).guidanceText, null);
    flow.returnHome();
    assert.equal(flow.snapshot(context).mode, 'home');
    flow.begin();
    assert.equal(flow.snapshot(context).step, 'select');
    assert.equal(new FirstLevelExperience(true).snapshot(context).mode, 'free');
});

test('首关教学推荐横墙可由起始金币建成，并为第一波与波间补塔留下空间', () => {
    const grid = PHASE_A_GRIDS['grid-9x13'];
    const economy = new EconomyLedger(FIRST_LEVEL_STARTING_GOLD);
    const model = new PlacementModel(grid, economy, PHASE_B_TOWERS);
    for (const { cell, towerId } of FIRST_LEVEL_OPENING) {
        assert.equal(model.commit(model.preview(cell, [], towerId), []).accepted, true);
    }
    assert.equal(model.gold, 10);
    assert.equal(model.flowField.distanceAt(grid.entry) - 12, FIRST_LEVEL_SUGGESTED_PATH_DELTA);
    const combat = new WaveCombatRuntime(grid, PHASE_B_TOWERS);
    combat.start(PHASE_B_WAVE_ONE);
    for (let elapsed = 0; elapsed < 40 && (!combat.isSpawningComplete || combat.enemies.length > 0); elapsed += 1 / 30) {
        const result = combat.tick(1 / 30, model.flowField, model.deployments);
        result.killed.forEach((enemy) => economy.credit(enemy.archetype.killReward));
    }
    assert.deepEqual(combat.totals, { spawned: 9, killed: 9, leaked: 0 });
    const rewards = new WaveRewardRuntime();
    assert.equal(rewards.settle(PHASE_B_WAVE_ONE, economy).gold, 54);
    assert.equal(model.preview(FIRST_LEVEL_REINFORCEMENTS[0].cell, [], 'rivet-gun').accepted, true);
});

test('布塔预览、提交与撤销使用同一流场计算路线变化，提示按真实时间衰减', () => {
    const grid = PHASE_A_GRIDS['grid-9x13'];
    const model = new PlacementModel(grid, FIRST_LEVEL_STARTING_GOLD, PHASE_B_TOWERS);
    const routeFeedback = new RouteChangeFeedback();
    const cell = { column: 4, row: 2 };
    const before = model.flowField.distanceAt(grid.entry);
    const preview = model.preview(cell, [], 'rivet-gun');
    assert.equal(preview.accepted, true);
    const previewDelta = routeLengthDelta(before, preview.path.length - 1);
    assert.ok(previewDelta > 0);
    const originalPath = model.flowField.pathFrom(grid.entry);
    const difference = routePreviewDiff(originalPath, preview.path);
    assert.ok(difference.abandoned.length > 0);
    assert.ok(difference.added.length > 0);
    assert.equal(difference.abandoned.some((candidate) => cellKey(candidate) === cellKey(cell)), true);
    assert.deepEqual(routePreviewDiff(originalPath, originalPath), { abandoned: [], added: [] });
    assert.match(routeChangeText(previewDelta), /路线 \+\d+ 格/);
    assert.equal(model.commit(preview, []).accepted, true);
    const placed = routeFeedback.record(cell, originalPath, model.flowField.pathFrom(grid.entry));
    assert.equal(placed.delta, previewDelta);
    assert.equal(placed.changed, true);
    const equalLengthPreview = model.preview({ column: 5, row: 2 }, [], 'rivet-gun');
    assert.equal(equalLengthPreview.accepted, true);
    const currentPath = model.flowField.pathFrom(grid.entry);
    assert.equal(equalLengthPreview.path.length, currentPath.length);
    const equalLengthDifference = routePreviewDiff(currentPath, equalLengthPreview.path);
    assert.ok(equalLengthDifference.abandoned.length > 0 && equalLengthDifference.added.length > 0);
    assert.equal(routePathChanged(currentPath, equalLengthPreview.path), true);
    const redirected = routeFeedback.record({ column: 5, row: 2 }, currentPath, equalLengthPreview.path);
    assert.equal(redirected.delta, 0);
    assert.equal(redirected.changed, true);
    assert.equal(routeChangeText(redirected.delta, redirected.changed), '路线改道 · 长度不变');
    assert.equal(routePathChanged(currentPath, currentPath), false);
    assert.equal(routeChangeText(0, false), '路线不变');
    routeFeedback.advance(0.45);
    assert.ok(routeFeedback.snapshot.remainingSeconds > 0);
    const beforeSell = model.flowField.pathFrom(grid.entry);
    assert.equal(model.sell(cell, 'opening'), true);
    const removed = routeFeedback.record(cell, beforeSell, model.flowField.pathFrom(grid.entry));
    assert.equal(removed.delta, -previewDelta);
    assert.match(routeChangeText(removed.delta), /路线缩短/);
    routeFeedback.advance(1);
    assert.equal(routeFeedback.snapshot, null);
    assert.throws(() => routeLengthDelta(-1, 2), /非负整数/);
});

test('首关音效对连续攻击限频，静音与恢复只影响声音不影响事件', () => {
    const played = [];
    const calls = [];
    const sink = {
        ready: true,
        unlock: () => calls.push('unlock'),
        play: (cue) => played.push(cue),
        setMuted: (muted) => calls.push(`muted:${muted}`),
        suspend: () => calls.push('suspend'),
        close: () => calls.push('close'),
    };
    const sound = new FirstLevelSoundDirector(sink);
    sound.unlockFromGesture();
    assert.equal(sound.play('rivet-shot', 1000), true);
    assert.equal(sound.play('rivet-shot', 1050), false);
    assert.equal(sound.play('rivet-shot', 1095), true);
    assert.equal(sound.play('frost-shot', 1100), true);
    assert.equal(sound.toggle(), false);
    assert.equal(sound.isReady, false);
    assert.equal(sound.play('core-hit', 1200), false);
    assert.equal(sound.toggle(), true);
    assert.equal(sound.play('core-hit', 1200), true);
    sound.suspend();
    sound.close();
    assert.deepEqual(played, ['rivet-shot', 'rivet-shot', 'frost-shot', 'core-hit']);
    assert.deepEqual(calls, ['unlock', 'muted:true', 'muted:false', 'unlock', 'suspend', 'close']);
});

test('已建塔重复点击只关闭查看，出售交给明确按钮', () => {
    const inspection = new TowerInspection();
    const first = { column: 3, row: 2 };
    const second = { column: 4, row: 2 };
    assert.equal(inspection.tap(first), 'inspect');
    assert.deepEqual(inspection.cell, first);
    assert.equal(inspection.tap(second), 'inspect');
    assert.deepEqual(inspection.cell, second);
    assert.equal(inspection.tap(second), 'dismiss');
    assert.equal(inspection.cell, null);
    assert.equal(inspection.tap(first), 'inspect');
    assert.equal(inspection.tap(first), 'dismiss');
    assert.equal(inspection.cell, null);
    inspection.tap(first);
    inspection.clear();
    assert.equal(inspection.cell, null);
});

function toCells(pairs) {
    return pairs.map(([column, row]) => ({ column, row }));
}

test('战场布局让绘制中心点与输入命中使用同一套网格换算', () => {
    const layout = new PhaseBLayout();
    const grid = PHASE_A_GRIDS['grid-9x13'];
    const metrics = layout.boardMetrics(grid);
    assert.deepEqual(metrics, { cellSize: 85, width: 765, height: 1105, left: -382.5, bottom: -495 });
    for (let row = 0; row < grid.rows; row += 1) {
        for (let column = 0; column < grid.columns; column += 1) {
            const center = layout.gridPointCenter({ column, row }, grid);
            assert.deepEqual(layout.pointToCell(center, grid), { column, row });
        }
    }
    assert.equal(layout.pointToCell({ x: metrics.left - 0.01, y: 0 }, grid), null);
    assert.equal(layout.pointToCell({ x: 0, y: metrics.bottom - 0.01 }, grid), null);
    assert.equal(layout.insideRect({ x: -340, y: -812 }, PHASE_B_SPEED_BUTTON), true);
    assert.equal(layout.insideRect({ x: 340, y: -812 }, PHASE_B_EARLY_WAVE_BUTTON), true);
    assert.equal(layout.insideRect({ x: 0, y: -812 }, PHASE_B_TOWER_BUTTON), true);
    assert.equal(layout.insideRect({ x: -89, y: -812 }, PHASE_B_RIVET_BUTTON), true);
    assert.equal(layout.insideRect({ x: 395, y: 845 }, PHASE_B_SOUND_BUTTON), true);
    assert.equal(layout.insideRect({ x: 89, y: -812 }, PHASE_B_FROST_BUTTON), true);
    assert.equal(layout.insideRect({ x: 0, y: -812 }, PHASE_B_SPEED_BUTTON), false);
    assert.equal(layout.insideRect({ x: 0, y: -812 }, PHASE_B_EARLY_WAVE_BUTTON), false);
});

test('360×780 等竖屏视口的 HUD 和侧边按钮落在可见安全宽度内', () => {
    const layout = new PhaseBLayout();
    const grid = PHASE_A_GRIDS['grid-9x13'];
    for (const [width, height] of [[360, 780], [390, 844], [430, 932], [1080, 1920]]) {
        layout.setVisibleWidth(1920 * width / height);
        const safeHalf = layout.safeHalfWidth;
        assert.ok(safeHalf > layout.boardMetrics(grid).width / 2, `${width}×${height} 下地图被安全区裁切`);
        const cards = layout.hudCardRects();
        assert.equal(cards.length, 4);
        assert.ok(cards[0].left >= -safeHalf && cards[3].right <= safeHalf);
        const resultPanel = layout.resultPanelRect();
        const resultStats = layout.resultStatRects();
        const resultDetails = layout.resultDetailRects();
        assert.equal(resultStats.length, 4);
        assert.equal(resultDetails.length, 3);
        assert.ok(resultPanel.left >= -safeHalf && resultPanel.right <= safeHalf);
        for (const rect of [...resultStats, ...resultDetails]) {
            assert.ok(rect.left >= resultPanel.left && rect.right <= resultPanel.right);
            assert.ok(rect.bottom > PHASE_B_RESULT_RESTART_BUTTON.top && rect.bottom > PHASE_B_RESULT_HOME_BUTTON.top);
        }
        for (const rect of [PHASE_B_RESULT_RESTART_BUTTON, PHASE_B_RESULT_HOME_BUTTON]) {
            assert.ok(rect.left >= -safeHalf && rect.right <= safeHalf);
            assert.ok(rect.right - rect.left >= 100 && rect.top - rect.bottom >= 100);
            assert.ok(rect.bottom >= resultPanel.bottom && rect.top <= resultPanel.top);
        }
        for (const screen of ['menu', 'settings', 'confirm-restart', 'confirm-home']) {
            const pausePanel = layout.pausePanelRect(screen);
            assert.ok(pausePanel.left >= -safeHalf && pausePanel.right <= safeHalf);
            for (const button of phaseBPauseButtons(screen)) {
                const rect = layout.safeRect(button);
                assert.ok(rect.left >= pausePanel.left && rect.right <= pausePanel.right);
                assert.ok(rect.right - rect.left >= 100 && rect.top - rect.bottom >= 100);
                assert.ok(rect.bottom >= pausePanel.bottom && rect.top <= pausePanel.top);
            }
        }
        for (const rect of [PHASE_B_SOUND_BUTTON, PHASE_B_SPEED_BUTTON, PHASE_B_EARLY_WAVE_BUTTON]) {
            const safeRect = layout.safeRect(rect);
            assert.ok(safeRect.left >= -safeHalf && safeRect.right <= safeHalf);
            assert.ok(safeRect.right - safeRect.left >= 100, `${width}×${height} 下按钮横向热区不足`);
            assert.ok(layout.insideRect({ x: (safeRect.left + safeRect.right) / 2, y: (safeRect.bottom + safeRect.top) / 2 }, safeRect));
        }
    }
    layout.setVisibleWidth(1080);
    assert.equal(layout.safeRect(PHASE_B_SOUND_BUTTON).right, PHASE_B_SOUND_BUTTON.right);
    assert.equal(phaseBPauseButtons('menu'), PHASE_B_PAUSE_BUTTONS);
    layout.setVisibleWidth(1920 * 844 / 390);
    const orientationPanel = layout.orientationPanelRect();
    assert.ok(orientationPanel.left >= -layout.visibleDesignWidth / 2);
    assert.ok(orientationPanel.right <= layout.visibleDesignWidth / 2);
    assert.ok(orientationPanel.right - orientationPanel.left > layout.pausePanelRect().right - layout.pausePanelRect().left);
});

test('步兵视觉错位稳定且不超过单格范围，循环后不会累计漂移', () => {
    assert.deepEqual(enemyVisualOffset(1, 100), { x: -17, y: -8 });
    assert.deepEqual(enemyVisualOffset(2, 100), { x: 17, y: 8 });
    assert.deepEqual(enemyVisualOffset(5, 100), enemyVisualOffset(1, 100));
    for (let order = 1; order <= 90; order += 1) {
        const offset = enemyVisualOffset(order, 85);
        assert.ok(Math.abs(offset.x) < 85 / 4);
        assert.ok(Math.abs(offset.y) < 85 / 4);
    }
});

test('敌人步伐在格间交接和暂停快照中连续，疾行机节奏更快', () => {
    for (const archetype of ['clockwork-infantry', 'clockwork-runner']) {
        const before = enemyStridePose(archetype, 1, 3);
        const after = enemyStridePose(archetype, 0, 3);
        assert.ok(Math.abs(before.y - after.y) < 1e-10);
        assert.ok(Math.abs(before.scaleX - after.scaleX) < 1e-10);
        assert.deepEqual(enemyStridePose(archetype, 0.375, 3), enemyStridePose(archetype, 0.375, 3));
    }
    assert.ok(enemyStridePose('clockwork-runner', 1 / 12, 4).y > enemyStridePose('clockwork-infantry', 1 / 12, 4).y);
});

test('两种敌人的候选步态帧随格内位置交替，暂停重渲染和格间交接不跳帧', () => {
    for (const archetype of ['clockwork-infantry', 'clockwork-runner']) {
        for (let order = 1; order <= 4; order += 1) {
            assert.equal(enemyGaitFrame(archetype, 1, order), enemyGaitFrame(archetype, 0, order));
        }
        assert.equal(enemyGaitFrame(archetype, 0, 4), 0);
        assert.equal(enemyGaitFrame(archetype, archetype === 'clockwork-runner' ? 1 / 6 : 1 / 4, 4), 1);
        assert.equal(enemyGaitFrame(archetype, 0.37, 3), enemyGaitFrame(archetype, 0.37, 3));
    }
});

test('炮塔开火后坐力随事件衰减并回到原位，方向只影响视觉偏移', () => {
    const direction = { x: 1, y: 0 };
    const fresh = towerRecoilPose('rivet-gun', 0.1, 0.1, direction);
    const fading = towerRecoilPose('rivet-gun', 0.05, 0.1, direction);
    assert.ok(fresh.x < fading.x && fading.x < 0);
    assert.deepEqual(towerRecoilPose('rivet-gun', 0, 0.1, direction), { x: 0, y: 0, scaleX: 1, scaleY: 1, angle: 0 });
    assert.ok(towerRecoilPose('frost-coil', 0.1, 0.1, direction).x > fresh.x);
});

test('冷凝能量芯脉冲只影响视觉比例并在事件消失后回到原位', () => {
    const fresh = frostCorePulsePose(0.1, 0.1);
    const fading = frostCorePulsePose(0.05, 0.1);
    assert.ok(fresh.scaleX > fading.scaleX && fading.scaleX > 1);
    assert.ok(fresh.scaleY > fading.scaleY && fading.scaleY > 1);
    assert.deepEqual(frostCorePulsePose(0, 0.1), { x: 0, y: 0, scaleX: 1, scaleY: 1, angle: 0 });
});

test('敌人减速外观随真实剩余时间衰减，过期与异常时长归零', () => {
    assert.equal(enemySlowVisualStrength(1.2, 1.2), 1);
    assert.equal(enemySlowVisualStrength(0.6, 1.2), 0.5);
    assert.equal(enemySlowVisualStrength(2, 1.2), 1);
    assert.equal(enemySlowVisualStrength(0, 1.2), 0);
    assert.equal(enemySlowVisualStrength(0.5, 0), 0);
    assert.equal(enemySlowVisualStrength(Number.NaN, 1.2), 0);
});

test('八波目录连续可索引且保留第一波冻结配置', () => {
    const catalog = new WaveCatalog(PHASE_B_WAVES);
    assert.equal(catalog.totalWaves, 8);
    assert.equal(catalog.get(1), PHASE_B_WAVE_ONE);
    assert.deepEqual(PHASE_B_WAVE_ONE.groups.map(({ count, spawnIntervalSeconds }) => ({ count, spawnIntervalSeconds })), [
        { count: 9, spawnIntervalSeconds: 0.8 },
    ]);
    assert.deepEqual(PHASE_B_WAVES.map(({ clearReward }) => clearReward), [8, 6, 12, 24, 12, 12, 14, 20]);
    assert.deepEqual(PHASE_B_WAVES.map(({ clearReward, groups }) => clearReward
        + groups.reduce((sum, { enemy, count }) => sum + enemy.killReward * count, 0)),
    [44, 42, 58, 52, 39, 132, 88, 220], '前四波教学回款不变，后四波赏金按购买窗口收敛');
    assert.throws(() => new WaveCatalog([PHASE_B_WAVES[1]]), /连续编号/);
    assert.throws(
        () => new WaveCatalog([{ wave: 1, clearReward: -1, groups: PHASE_B_WAVE_ONE.groups }]),
        /清场奖励必须为非负整数/,
    );
    assert.throws(() => catalog.get(9), /不存在第 9 波/);
});

test('疾行机由第三波少量出现，波前预告和总敌数都跟随配置', () => {
    assert.equal(PHASE_B_WAVES.slice(0, 2).every(({ groups }) => groups.every(({ enemy }) => enemy.id === CLOCKWORK_INFANTRY.id)), true);
    assert.deepEqual(PHASE_B_WAVES[2].groups.map(({ enemy, count }) => [enemy.id, count]), [
        ['clockwork-infantry', 11], ['clockwork-runner', 2],
    ]);
    assert.equal(PHASE_B_WAVES.flatMap(({ groups }) => groups).reduce((total, group) => total + group.count, 0), 213);
    assert.equal(waveLineup(PHASE_B_WAVES[2]), '发条步兵×11 · 疾行机×2');
    assert.equal(waveStartStatus(PHASE_B_WAVES[4]), '第 5 波 · 铁罐搬运者×9进场');
    assert.equal(waveStartStatus(PHASE_B_WAVES[7]), '第 8 波 · 发条步兵先行，后续混编来袭');
    assert.equal(waveThreatHint(PHASE_B_WAVES[1]), '机枪守线 · 留意改路');
    assert.match(waveThreatHint(PHASE_B_WAVES[2]), /疾行.*冷凝/);
    assert.equal(PHASE_B_WAVES.slice(0, 4).every(({ groups }) => groups.every(({ enemy }) => enemy.id !== IRON_CANISTER_HAULER.id)), true);
    assert.deepEqual(PHASE_B_WAVES[4].groups.map(({ enemy, count }) => [enemy.id, count]), [['iron-canister-hauler', 9]]);
    assert.match(waveThreatHint(PHASE_B_WAVES[4]), /冷凝.*集火/);
    assert.match(waveThreatHint(PHASE_B_WAVES[6]), /疾行控速.*重装集火/);
    assert.deepEqual(upcomingWaveBriefing(PHASE_B_WAVES[2]), {
        wave: 3, lineup: '步兵×11 · 疾行×2', tactic: '疾行更快 · 冷凝压速',
        accessibleLineup: '发条步兵×11 · 疾行机×2',
    });
    assert.equal(upcomingWaveBriefing(PHASE_B_WAVES[7]).lineup, '步兵×31 · 疾行×22 · 重装×18');
});

test('五张单位图均导入为 SpriteFrame，避免新增纹理让整层切图降级', () => {
    for (const id of ['rivet-gun', 'frost-coil', 'clockwork-infantry', 'clockwork-runner', 'iron-canister-hauler']) {
        const asset = resolve(__dirname, `../assets/resources/level-one/units/${id}.png`);
        const meta = JSON.parse(readFileSync(`${asset}.meta`, 'utf8'));
        assert.equal(meta.userData.type, 'sprite-frame', id);
        assert.equal(meta.subMetas.f9941.importer, 'sprite-frame', id);
        assert.ok(readFileSync(asset).length < 32 * 1024, `${id} 的运行时图片超过 32 KiB`);
    }
});

test('重装敌人切图保持 128 方形透明画布与低体积', () => {
    const png = readFileSync(resolve(__dirname, '../assets/resources/level-one/units/iron-canister-hauler.png'));
    assert.equal(png.readUInt32BE(16), 128);
    assert.equal(png.readUInt32BE(20), 128);
    assert.equal(png[25], 6, '重装敌人必须是 RGBA PNG');
    assert.ok(png.length < 32 * 1024);
});

test('机枪塔两张分层切图以 SpriteFrame 导入且保留 128 方形透明画布', () => {
    for (const id of ['rivet-gun-base-v2', 'rivet-gun-head-v2']) {
        const asset = resolve(__dirname, `../assets/resources/level-one/units/${id}.png`);
        const png = readFileSync(asset);
        const meta = JSON.parse(readFileSync(`${asset}.meta`, 'utf8'));
        assert.equal(png.readUInt32BE(16), 128, id);
        assert.equal(png.readUInt32BE(20), 128, id);
        assert.equal(png[25], 6, `${id} 应为 RGBA PNG`);
        assert.equal(meta.userData.type, 'sprite-frame', id);
        assert.ok(meta.subMetas.f9941, id);
    }
});

test('冷凝塔两张分层切图以 SpriteFrame 导入且保留 128 方形透明画布', () => {
    for (const id of ['frost-coil-base-v2', 'frost-coil-core-v2']) {
        const asset = resolve(__dirname, `../assets/resources/level-one/units/${id}.png`);
        const png = readFileSync(asset);
        const meta = JSON.parse(readFileSync(`${asset}.meta`, 'utf8'));
        assert.equal(png.readUInt32BE(16), 128, id);
        assert.equal(png.readUInt32BE(20), 128, id);
        assert.equal(png[25], 6, `${id} 应为 RGBA PNG`);
        assert.equal(meta.userData.type, 'sprite-frame', id);
        assert.ok(meta.subMetas.f9941, id);
    }
});

test('两种敌人的备用步态帧以 SpriteFrame 导入且保持 128 方形透明画布', () => {
    for (const id of ['clockwork-infantry-step-b-v2', 'clockwork-runner-step-b-v2']) {
        const asset = resolve(__dirname, `../assets/resources/level-one/units/${id}.png`);
        const png = readFileSync(asset);
        const meta = JSON.parse(readFileSync(`${asset}.meta`, 'utf8'));
        assert.equal(png.readUInt32BE(16), 128, id);
        assert.equal(png.readUInt32BE(20), 128, id);
        assert.equal(png[25], 6, `${id} 应为 RGBA PNG`);
        assert.ok(png.length < 32 * 1024, `${id} 运行时资源超过 32 KiB`);
        assert.equal(meta.userData.type, 'sprite-frame', id);
        assert.ok(meta.subMetas.f9941, id);
    }
});

test('疾行机移动更快但接受冷凝减速，移动与外观提示不依赖波次编号', () => {
    const grid = PHASE_A_GRIDS['grid-9x13'];
    const flow = new FlowField(grid, new Set());
    const distanceAfterHalfSecond = (archetype) => {
        const runtime = new WaveCombatRuntime(grid, PHASE_B_TOWERS);
        runtime.start({ wave: 1, clearReward: 0, groups: [{ enemy: archetype, count: 1, spawnIntervalSeconds: 1 }] });
        runtime.tick(0.5, flow, []);
        return runtime.enemies[0].progress;
    };
    assert.ok(distanceAfterHalfSecond(CLOCKWORK_RUNNER) > distanceAfterHalfSecond(CLOCKWORK_INFANTRY));
    const frostCell = { column: 3, row: 1 };
    const slowedFlow = new FlowField(grid, new Set([cellKey(frostCell)]));
    const slowedRuntime = new WaveCombatRuntime(grid, PHASE_B_TOWERS);
    slowedRuntime.start({ wave: 1, clearReward: 0, groups: [{ enemy: CLOCKWORK_RUNNER, count: 1, spawnIntervalSeconds: 1 }] });
    const firstTick = slowedRuntime.tick(1 / 30, slowedFlow, [{ cell: frostCell, towerId: 'frost-coil' }]);
    assert.equal(firstTick.shots[0].appliedSlow, true);
    assert.equal(slowedRuntime.enemies[0].slowMultiplier, FROST_COIL.effect.speedMultiplier);
});

test('铁罐搬运者复用流场与减速规则，保持高生命低速度', () => {
    assert.equal(IRON_CANISTER_HAULER.maxHealth, 320);
    assert.equal(IRON_CANISTER_HAULER.speedCellsPerSecond, 0.62);
    const grid = PHASE_A_GRIDS['grid-9x13'];
    const runtime = new WaveCombatRuntime(grid, PHASE_B_TOWERS);
    runtime.start({ wave: 5, clearReward: 0, groups: [{ enemy: IRON_CANISTER_HAULER, count: 1, spawnIntervalSeconds: 1 }] });
    const result = runtime.tick(0, new FlowField(grid, new Set()), [{ cell: grid.entry, towerId: 'frost-coil' }]);
    assert.equal(result.shots[0].appliedSlow, true);
    assert.equal(runtime.enemies[0].health, 316);
    assert.equal(runtime.enemies[0].slowMultiplier, 0.25);
    assert.ok(runtime.enemies[0].slowRemainingSeconds > 0);
    assert.equal(runtime.enemies[0].archetype.killReward, 3);
});

test('模拟时钟统一限制长帧并在 1x 与 2x 间循环', () => {
    const clock = new SimulationClock();
    assert.equal(clock.scale, 1);
    assert.equal(clock.gameDeltaSeconds(0.02), 0.02);
    assert.equal(clock.cycleScale(), 2);
    assert.equal(clock.gameDeltaSeconds(0.02), 0.04);
    assert.equal(clock.gameDeltaSeconds(3), 0.1);
    assert.equal(clock.cycleScale(), 1);
    assert.throws(() => clock.gameDeltaSeconds(-1), /不能为负数/);
    assert.throws(() => new SimulationClock({ supportedScales: [] }), /正数倍率/);
    assert.throws(() => new SimulationClock({ fixedStepSeconds: 0 }), /正数/);
    const stepped = new SimulationClock();
    let total = 0;
    assert.equal(stepped.advance(1 / 30, (delta) => { total += delta; }), 2);
    assert.ok(Math.abs(total - 1 / 30) < 1e-9);
    assert.equal(stepped.advance(1 / 120, (delta) => { total += delta; }), 0);
    assert.equal(stepped.advance(1 / 120, (delta) => { total += delta; }), 1);
    stepped.reset();
    assert.equal(stepped.advance(1 / 120, () => {}), 0);
    stepped.cycleScale();
    assert.equal(stepped.advance(1 / 30, () => {}), 4);
    stepped.reset();
    assert.equal(stepped.advance(3, () => {}), 6, '后台恢复的长帧最多只补 0.05 秒真实时间');
});

test('三种候选网格的初始、短折线和长蛇形 fixture 与冻结值一致', () => {
    for (const fixture of fixtures.fixtures) {
        const grid = PHASE_A_GRIDS[fixture.gridId];
        assert.ok(grid, `未知网格 ${fixture.gridId}`);

        const initial = simulateNoDamageRoute(new FlowField(grid, new Set()), 1);
        assert.equal(initial.pathLength, fixture.initialPathLength);

        for (const fixtureName of ['shortFold', 'longSnake']) {
            const routeFixture = fixture[fixtureName];
            const blocked = new Set(toCells(routeFixture.towerCells).map(cellKey));
            const result = simulateNoDamageRoute(new FlowField(grid, blocked), 1);
            assert.equal(result.pathLength, routeFixture.expectedPathLength, `${fixture.gridId}/${fixtureName}`);
            assert.ok(result.reachedExit);
            assert.ok(routeFixture.towerCells.length * fixtures.towerCost <= routeFixture.budget);
        }

        assert.ok(fixture.shortFold.expectedPathLength - fixture.initialPathLength >= 4);
        assert.ok(
            (fixture.longSnake.expectedPathLength - fixture.initialPathLength) / fixture.initialPathLength >= 0.8,
            `${fixture.gridId} 长蛇形未达到 80%`,
        );
    }
});

test('非法封路提交不扣金币、不占格、不更新地图版本', () => {
    const grid = {
        id: 'grid-8x13',
        columns: 3,
        rows: 3,
        entry: { column: 1, row: 0 },
        exit: { column: 1, row: 2 },
    };
    const model = new PlacementModel(grid, 300, 30);
    assert.ok(model.commit(model.preview({ column: 0, row: 1 }, []), []).accepted);
    assert.ok(model.commit(model.preview({ column: 2, row: 1 }, []), []).accepted);
    const before = { gold: model.gold, version: model.mapVersion, towers: model.towers.size };
    const preview = model.preview({ column: 1, row: 1 }, []);
    assert.equal(preview.accepted, false);
    assert.equal(preview.reason, 'would-block-path');
    const commit = model.commit(preview, []);
    assert.equal(commit.accepted, false);
    assert.deepEqual(
        { gold: model.gold, version: model.mapVersion, towers: model.towers.size },
        before,
    );
});

test('格间敌人的 fromCell 与 toCell 都受保护', () => {
    const grid = PHASE_A_GRIDS['grid-9x13'];
    const model = new PlacementModel(grid, 120, 30);
    const enemy = [{
        id: 'enemy-1',
        fromCell: { column: 4, row: 3 },
        toCell: { column: 4, row: 4 },
        progress: 0.5,
    }];
    assert.equal(model.preview(enemy[0].fromCell, enemy).reason, 'enemy-current-cell');
    assert.equal(model.preview(enemy[0].toCell, enemy).reason, 'enemy-committed-cell');
});

test('等长最短路优先保持当前朝向，前方失效后再使用固定方向序', () => {
    const grid = {
        id: 'grid-9x13',
        columns: 5,
        rows: 5,
        entry: { column: 2, row: 0 },
        exit: { column: 4, row: 4 },
    };
    const open = new FlowField(grid, new Set());
    assert.deepEqual(
        open.nextCell({ column: 2, row: 2 }, { column: 1, row: 2 }),
        { column: 3, row: 2 },
        '向右前进后，前方仍是最短路时应继续向右',
    );

    const blocked = new FlowField(grid, new Set([cellKey({ column: 3, row: 2 })]));
    assert.deepEqual(
        blocked.nextCell({ column: 2, row: 2 }, { column: 1, row: 2 }),
        { column: 2, row: 3 },
        '前方不可走时应回落到固定方向序',
    );
});

test('候选建造若让敌人抵达承诺格后只能回头，必须原子拒绝', () => {
    const grid = {
        id: 'grid-9x13',
        columns: 5,
        rows: 7,
        entry: { column: 2, row: 0 },
        exit: { column: 2, row: 6 },
    };
    const model = new PlacementModel(grid, 300, 30);
    for (const cell of [{ column: 1, row: 3 }, { column: 3, row: 3 }]) {
        const commit = model.commit(model.preview(cell, []), []);
        assert.ok(commit.accepted);
    }
    const enemy = [{
        id: 'enemy-mid-cell',
        fromCell: { column: 2, row: 2 },
        toCell: { column: 2, row: 3 },
        progress: 0.4,
    }];
    const before = { gold: model.gold, version: model.mapVersion, towers: model.towers.size };
    const preview = model.preview({ column: 2, row: 4 }, enemy);
    assert.equal(preview.accepted, false);
    assert.equal(preview.reason, 'would-force-backtrack');
    assert.deepEqual({ gold: model.gold, version: model.mapVersion, towers: model.towers.size }, before);
});

test('过期预览不会重复扣费或覆盖较新的地图', () => {
    const model = new PlacementModel(PHASE_A_GRIDS['grid-9x13'], 120, 30);
    const stale = model.preview({ column: 2, row: 2 }, []);
    assert.ok(model.commit(model.preview({ column: 3, row: 2 }, []), []).accepted);
    const beforeGold = model.gold;
    const result = model.commit(stale, []);
    assert.equal(result.reason, 'stale-preview');
    assert.equal(model.gold, beforeGold);
});

test('开局全额撤销、波间七成返还且锁定阶段不改金币与流场', () => {
    const model = new PlacementModel(PHASE_A_GRIDS['grid-8x13'], 120, 30);
    const cell = { column: 1, row: 2 };
    assert.ok(model.commit(model.preview(cell, []), []).accepted);
    assert.equal(model.saleQuote(cell, 'locked'), null);
    assert.equal(model.sell(cell, 'locked'), false);
    assert.equal(model.saleQuote(cell, 'opening'), 30);
    assert.equal(model.sell(cell, 'opening'), true);
    assert.equal(model.gold, 120);
    assert.equal(model.flowField.distanceAt(model.grid.entry), 12);
    assert.ok(model.commit(model.preview(cell, []), []).accepted);
    assert.equal(model.saleQuote(cell, 'intermission'), 21);
    assert.equal(model.sell(cell, 'intermission'), true);
    assert.equal(model.gold, 111);
    assert.equal(model.flowField.distanceAt(model.grid.entry), 12);
    assert.equal(model.sell(cell, 'intermission'), false);
});

test('出售窗口只在开局与清场波间开放，用户暂停不能绕过战斗锁', () => {
    assert.equal(towerSaleWindow(true, 'preparing', false), 'opening');
    assert.equal(towerSaleWindow(false, 'spawning', false), 'locked');
    assert.equal(towerSaleWindow(false, 'clearing', false), 'locked');
    assert.equal(towerSaleWindow(false, 'countdown', false), 'intermission');
    assert.equal(towerSaleWindow(false, 'paused', true), 'intermission');
    assert.equal(towerSaleWindow(false, 'paused', false), 'locked');
    assert.equal(towerSaleWindow(false, 'victory', false), 'locked');
});

test('波间倒计时归零后出售请求被锁定，不能跨波拿回金币', () => {
    const model = new PlacementModel(PHASE_A_GRIDS['grid-9x13'], 120, 30);
    const cell = { column: 2, row: 2 };
    assert.equal(model.commit(model.preview(cell, []), []).accepted, true);
    const battle = new BattleStateMachine(2, 10, 0);
    assert.equal(battle.startFirstWave(2, 2).accepted, true);
    battle.markSpawningComplete(0);
    assert.equal(towerSaleWindow(false, battle.snapshot.phase, false), 'intermission');
    battle.advance(0);
    const before = { gold: model.gold, version: model.mapVersion };
    assert.equal(towerSaleWindow(false, battle.snapshot.phase, false), 'locked');
    assert.equal(model.sell(cell, towerSaleWindow(false, battle.snapshot.phase, false)), false);
    assert.deepEqual({ gold: model.gold, version: model.mapVersion }, before);
});

test('升级后的出售按累计投入七成取整，报价和真实到账一致', () => {
    const model = new PlacementModel(PHASE_A_GRIDS['grid-9x13'], 100, PHASE_B_TOWERS);
    const cell = { column: 2, row: 2 };
    assert.equal(model.commit(model.preview(cell, [], 'frost-coil'), []).accepted, true);
    assert.equal(model.upgrade(cell).accepted, true);
    const before = model.gold;
    assert.equal(model.saleQuote(cell, 'intermission'), 50);
    assert.equal(model.sell(cell, 'intermission'), true);
    assert.equal(model.gold, before + 50);
    assert.equal(model.saleQuote(cell, 'intermission'), null);
});

test('第一波同时要求两座塔和至少 2 格路径增量', () => {
    const battle = new BattleStateMachine();
    assert.deepEqual(battle.startFirstWave(1, 2), { accepted: false, reason: 'needs-two-towers' });
    assert.deepEqual(battle.startFirstWave(2, 1), { accepted: false, reason: 'needs-path-delta' });
    assert.deepEqual(battle.startFirstWave(2, 2), { accepted: true });
    assert.deepEqual(battle.snapshot, { phase: 'spawning', wave: 1, coreHealth: 10, countdownSeconds: 0 });
});

test('波次不重叠，清场后完整保留 8 秒倒计时', () => {
    const battle = new BattleStateMachine();
    battle.startFirstWave(2, 2);
    battle.markSpawningComplete(1);
    battle.resolveEnemyKilled(0);
    assert.deepEqual(battle.snapshot, { phase: 'countdown', wave: 1, coreHealth: 10, countdownSeconds: 8 });
    battle.advance(3.25);
    assert.equal(battle.snapshot.countdownSeconds, 4.75);
    battle.advance(4.75);
    assert.deepEqual(battle.snapshot, { phase: 'spawning', wave: 2, coreHealth: 10, countdownSeconds: 0 });
});

test('倒计时允许提前开下一波且不能在其他阶段误触发', () => {
    const battle = new BattleStateMachine();
    assert.equal(battle.startNextWaveEarly(), false);
    battle.startFirstWave(2, 2);
    battle.markSpawningComplete(0);
    assert.equal(battle.startNextWaveEarly(), true);
    assert.deepEqual(battle.snapshot, { phase: 'spawning', wave: 2, coreHealth: 10, countdownSeconds: 0 });
    assert.equal(battle.startNextWaveEarly(), false);
});

test('教学波间只需一次继续就开下一波，普通暂停仍保留倒计时', () => {
    const guided = new BattleStateMachine();
    assert.equal(guided.startNextWaveFromHeldIntermission(), false);
    guided.startFirstWave(2, 2);
    guided.markSpawningComplete(0);
    assert.equal(guided.pause(), true);
    guided.advance(20);
    assert.equal(guided.startNextWaveFromHeldIntermission(), true);
    assert.deepEqual(guided.snapshot, { phase: 'spawning', wave: 2, coreHealth: 10, countdownSeconds: 0 });
    assert.equal(guided.startNextWaveFromHeldIntermission(), false);

    const ordinaryPause = new BattleStateMachine();
    ordinaryPause.startFirstWave(2, 2);
    assert.equal(ordinaryPause.pause(), true);
    assert.equal(ordinaryPause.startNextWaveFromHeldIntermission(), false);
    assert.equal(ordinaryPause.resume(), true);
    assert.equal(ordinaryPause.snapshot.phase, 'spawning');
});

test('暂停恢复原阶段和剩余倒计时', () => {
    const battle = new BattleStateMachine();
    battle.startFirstWave(2, 2);
    battle.markSpawningComplete(0);
    battle.advance(2);
    assert.equal(battle.pause(), true);
    battle.advance(20);
    assert.deepEqual(battle.snapshot, { phase: 'paused', wave: 1, coreHealth: 10, countdownSeconds: 6 });
    assert.equal(battle.resume(), true);
    assert.deepEqual(battle.snapshot, { phase: 'countdown', wave: 1, coreHealth: 10, countdownSeconds: 6 });
});

test('核心生命归零立即失败，第八波清场才胜利', () => {
    const defeat = new BattleStateMachine(8, 1);
    defeat.startFirstWave(2, 2);
    defeat.resolveEnemyLeak(3);
    assert.equal(defeat.snapshot.phase, 'defeat');

    const victory = new BattleStateMachine(1);
    victory.startFirstWave(2, 2);
    victory.markSpawningComplete(1);
    assert.equal(victory.snapshot.phase, 'clearing');
    victory.resolveEnemyKilled(0);
    assert.equal(victory.snapshot.phase, 'victory');
});

test('建造与击杀共用独立经济账本', () => {
    const ledger = new EconomyLedger(120);
    const model = new PlacementModel(PHASE_A_GRIDS['grid-9x13'], ledger, 30);
    assert.ok(model.commit(model.preview({ column: 2, row: 2 }, []), []).accepted);
    assert.equal(ledger.balance, 90);
    ledger.credit(4);
    assert.equal(model.gold, 94);
});

test('清场奖励连续且幂等，不会因重复清场帧重复发钱', () => {
    const economy = new EconomyLedger(10);
    const rewards = new WaveRewardRuntime();
    const first = rewards.settle(PHASE_B_WAVES[0], economy);
    assert.deepEqual(first, { credited: true, wave: 1, amount: 8, totalAwarded: 8, gold: 18 });
    assert.deepEqual(rewards.settle(PHASE_B_WAVES[0], economy), {
        credited: false, wave: 1, amount: 0, totalAwarded: 8, gold: 18,
    });
    assert.throws(() => rewards.settle(PHASE_B_WAVES[2], economy), /必须连续结算/);
    assert.equal(rewards.settle(PHASE_B_WAVES[1], economy).gold, 24);
});

test('塔种价格绑定在预览事务中，出售按各自造价全额返还', () => {
    const model = new PlacementModel(PHASE_A_GRIDS['grid-9x13'], 100, PHASE_B_TOWERS);
    const rivetCell = { column: 2, row: 2 };
    const frostCell = { column: 3, row: 2 };
    const frostPreview = model.preview(frostCell, [], 'frost-coil');
    assert.deepEqual({ towerId: frostPreview.towerId, cost: frostPreview.cost }, { towerId: 'frost-coil', cost: 40 });
    assert.equal(model.commit(model.preview(rivetCell, [], 'rivet-gun'), []).accepted, true);
    assert.equal(model.commit(frostPreview, []).reason, 'stale-preview');
    assert.equal(model.commit(model.preview(frostCell, [], 'frost-coil'), []).accepted, true);
    assert.equal(model.gold, 30);
    assert.deepEqual(model.deployments.map(({ towerId }) => towerId), ['rivet-gun', 'frost-coil']);
    assert.equal(model.sell(frostCell, 'opening'), true);
    assert.equal(model.gold, 70);
});

test('升级扣费原子化，满级与金币不足不改变等级，准备态撤销返还全部投入', () => {
    const cell = { column: 2, row: 2 };
    const model = new PlacementModel(PHASE_A_GRIDS['grid-9x13'], 50, PHASE_B_TOWERS);
    assert.equal(model.upgrade(cell).reason, 'not-found');
    assert.equal(model.commit(model.preview(cell, [], 'rivet-gun'), []).accepted, true);
    const version = model.mapVersion;
    assert.equal(model.upgrade(cell).reason, 'insufficient-gold');
    assert.equal(model.deployments[0].level, 1);
    assert.equal(model.gold, 20);
    model.sell(cell, 'opening');
    assert.equal(model.gold, 50);
    const funded = new PlacementModel(PHASE_A_GRIDS['grid-9x13'], 60, PHASE_B_TOWERS);
    assert.equal(funded.commit(funded.preview(cell, [], 'rivet-gun'), []).accepted, true);
    assert.deepEqual(funded.upgrade(cell), { accepted: true, level: 2, gold: 6 });
    assert.equal(funded.mapVersion, version);
    assert.equal(funded.upgrade(cell).reason, 'insufficient-gold');
    assert.equal(funded.sell(cell, 'locked'), false);
    assert.equal(funded.sell(cell, 'opening'), true);
    assert.equal(funded.gold, 60);
    assert.equal(nextUpgradeCost(RIVET_GUN, 2), 42);
    assert.equal(nextUpgradeCost(RIVET_GUN, 3), null);
    assert.equal(towerAtLevel(RIVET_GUN, 2).damage, 11);
    assert.equal(towerAtLevel(RIVET_GUN, 3).damage, 18);
    assert.equal(towerInvestment(RIVET_GUN, 3), 96);
    assert.equal(nextUpgradeCost(FROST_COIL, 1), 32);
    assert.equal(towerAtLevel(FROST_COIL, 2).effect.speedMultiplier, 0.18);
    assert.equal(towerInvestment(FROST_COIL, 3), 120);
});

test('三级塔升级、满级与检查点恢复使用同一累计投入', () => {
    const cell = { column: 2, row: 2 };
    for (const tower of [RIVET_GUN, FROST_COIL]) {
        const model = new PlacementModel(PHASE_A_GRIDS['grid-9x13'], towerInvestment(tower, 3) + 7, PHASE_B_TOWERS);
        assert.equal(model.commit(model.preview(cell, [], tower.id), []).accepted, true);
        assert.equal(model.upgrade(cell).level, 2);
        assert.equal(model.upgrade(cell).level, 3);
        assert.equal(model.upgrade(cell).reason, 'max-level');
        assert.equal(model.gold, 7);
        const restored = BattleRunCheckpoint.capture(model).restore().model;
        assert.deepEqual(restored.deployments, model.deployments);
        assert.equal(restored.gold, 7);
        assert.equal(restored.sell(cell, 'opening'), true);
        assert.equal(restored.gold, towerInvestment(tower, 3) + 7);
    }
});

test('三级塔的最终伤害与减速进入真实战斗结算', () => {
    const grid = PHASE_A_GRIDS['grid-9x13'];
    const flow = new FlowField(grid, new Set());
    for (const tower of [RIVET_GUN, FROST_COIL]) {
        const combat = new WaveCombatRuntime(grid, PHASE_B_TOWERS);
        combat.start({ wave: 1, clearReward: 0, groups: [{ enemy: CLOCKWORK_INFANTRY, count: 1, spawnIntervalSeconds: 1 }] });
        const shot = combat.tick(0, flow, [{ cell: grid.entry, towerId: tower.id, level: 3 }]).shots[0];
        assert.equal(shot.damage, tower.finalUpgrade.damage);
        assert.equal(shot.appliedSlow, tower.id === 'frost-coil');
    }
});

test('检查点保留升级等级与剩余金币，升级后的伤害进入战斗结算', () => {
    const grid = PHASE_A_GRIDS['grid-9x13'];
    const cell = { column: 2, row: 2 };
    const model = new PlacementModel(grid, 80, PHASE_B_TOWERS);
    assert.equal(model.commit(model.preview(cell, [], 'rivet-gun'), []).accepted, true);
    assert.equal(model.upgrade(cell).accepted, true);
    const checkpoint = BattleRunCheckpoint.capture(model);
    const restored = checkpoint.restore().model;
    assert.equal(restored.gold, 26);
    assert.deepEqual(restored.deployments, model.deployments);
    const wave = { wave: 1, clearReward: 0, groups: [{ enemy: CLOCKWORK_INFANTRY, count: 1, spawnIntervalSeconds: 1 }] };
    const flow = restored.flowField;
    const upgraded = new WaveCombatRuntime(grid, PHASE_B_TOWERS);
    const base = new WaveCombatRuntime(grid, PHASE_B_TOWERS);
    upgraded.start(wave);
    base.start(wave);
    const upgradedShots = upgraded.tick(0, flow, [{ cell: grid.entry, towerId: 'rivet-gun', level: 2 }]).shots;
    const baseShots = base.tick(0, flow, [{ cell: grid.entry, towerId: 'rivet-gun', level: 1 }]).shots;
    assert.equal(upgradedShots[0].damage, 11);
    assert.equal(baseShots[0].damage, 7);
});

test('重新部署从开战检查点恢复塔位与当时金币，不带回击杀收益', () => {
    const grid = PHASE_A_GRIDS['grid-9x13'];
    const ledger = new EconomyLedger(120);
    const model = new PlacementModel(grid, ledger, PHASE_A_TOWER_COST);
    for (const cell of [{ column: 2, row: 2 }, { column: 3, row: 2 }, { column: 4, row: 2 }, { column: 5, row: 2 }]) {
        assert.equal(model.commit(model.preview(cell, []), []).accepted, true);
    }
    const checkpoint = BattleRunCheckpoint.capture(model, PHASE_A_TOWER_COST);
    ledger.credit(24);
    const restored = checkpoint.restore();
    assert.equal(restored.model.gold, 0);
    assert.deepEqual([...restored.model.towers], [...model.towers]);
    assert.equal(restored.model.flowField.distanceAt(grid.entry), 16);
});

test('重新部署检查点保留混合塔种与不同造价', () => {
    const grid = PHASE_A_GRIDS['grid-9x13'];
    const model = new PlacementModel(grid, 100, PHASE_B_TOWERS);
    assert.equal(model.commit(model.preview({ column: 2, row: 2 }, [], 'rivet-gun'), []).accepted, true);
    assert.equal(model.commit(model.preview({ column: 3, row: 2 }, [], 'frost-coil'), []).accepted, true);
    const restored = BattleRunCheckpoint.capture(model).restore().model;
    assert.equal(restored.gold, 30);
    assert.deepEqual(restored.deployments, model.deployments);
});

test('结算视图模型只在终局生成，并区分胜利与失败', () => {
    const totals = { spawned: 8, killed: 6, leaked: 2 };
    const context = { initialCoreHealth: 10, totalWaves: 8, elapsedSeconds: 414.7, towerCount: 10, upgradeCount: 6, bestSeconds: 414.7, newRecord: true };
    assert.equal(buildBattleResultViewModel({ phase: 'clearing', wave: 1, coreHealth: 8, countdownSeconds: 0 }, totals, 24, context), null);
    const victory = buildBattleResultViewModel({ phase: 'victory', wave: 1, coreHealth: 8, countdownSeconds: 0 }, totals, 24, context);
    assert.equal(victory.kind, 'victory');
    assert.match(victory.summary, /击毁 6\/8/);
    assert.match(victory.subtitle, /1\/8 波守住/);
    assert.deepEqual(victory.stats.map(({ label, value }) => [label, value]), [
        ['击毁', '6/8'], ['漏怪', '2'], ['核心', '8/10'], ['金币', '24'],
    ]);
    assert.deepEqual(victory.runDetails.map(({ label, value }) => [label, value]), [
        ['局内用时', '06:54'], ['建塔', '10'], ['升级', '6'],
    ]);
    assert.match(victory.footnote, /新最快纪录/);
    assert.equal(victory.homeActionLabel, '返回首页');
    const defeat = buildBattleResultViewModel({ phase: 'defeat', wave: 1, coreHealth: 0, countdownSeconds: 0 }, totals, 24,
        { ...context, initialCoreHealth: 2, elapsedSeconds: 100, newRecord: false });
    assert.equal(defeat.kind, 'defeat');
    assert.match(defeat.summary, /核心 0\/2/);
    assert.match(defeat.subtitle, /止步第 1\/8 波/);
    assert.equal(defeat.stats[2].tone, 'danger');
    assert.equal(defeat.runDetails[0].value, '01:40');
    assert.match(defeat.footnote, /本机最快/);
    assert.equal(formatRunDuration(3599.9), '59:59');
});

test('局内计时只累计战斗与自然波间，暂停、教学等待和重开清零', () => {
    const clock = new BattleRunClock();
    clock.advance(3, 'spawning');
    assert.equal(clock.elapsedSeconds, 0);
    clock.start();
    clock.advance(2, 'spawning');
    clock.advance(8, 'countdown');
    clock.advance(3, 'paused');
    clock.advance(1, 'clearing');
    clock.advance(1, 'victory');
    assert.equal(clock.elapsedSeconds, 11);
    clock.reset();
    assert.equal(clock.elapsedSeconds, 0);
    assert.throws(() => clock.advance(-1, 'spawning'), RangeError);
});

test('暂停来源叠加、设置子页和后台恢复都要求玩家显式继续', () => {
    const pause = new PauseOverlayRuntime();
    assert.equal(pause.snapshot.visible, false);
    assert.equal(pause.enterUser(), true);
    assert.equal(pause.enterUser(), false);
    pause.show('settings');
    assert.equal(pause.snapshot.screen, 'settings');
    assert.equal(pause.enterLifecycle(), false);
    assert.equal(pause.snapshot.reason, 'lifecycle');
    assert.equal(pause.snapshot.canContinue, false);
    assert.equal(pause.continue(), false);
    pause.leaveLifecycle();
    assert.equal(pause.snapshot.visible, true);
    assert.equal(pause.snapshot.reason, 'user');
    assert.equal(pause.continue(), true);
    assert.equal(pause.snapshot.visible, false);
    assert.equal(pause.enterLifecycle(), true);
    pause.leaveLifecycle();
    assert.equal(pause.snapshot.visible, true);
    assert.equal(pause.snapshot.canContinue, true);
    assert.equal(pause.continue(), true);
    assert.equal(pause.snapshot.visible, false);
});

test('触控横屏先冻结、转回竖屏后仍显式继续，且与后台/用户暂停可叠加', () => {
    assert.equal(isCoarseLandscape({ width: 844, height: 390, coarsePointer: true }), true);
    assert.equal(isCoarseLandscape({ width: 390, height: 844, coarsePointer: true }), false);
    assert.equal(isCoarseLandscape({ width: 1280, height: 720, coarsePointer: false }), false);
    assert.equal(isCoarseLandscape({ width: 0, height: 390, coarsePointer: true }), false);
    const pause = new PauseOverlayRuntime();
    assert.equal(pause.enterUser(), true);
    assert.equal(pause.enterOrientation(), false);
    assert.equal(pause.snapshot.reason, 'orientation');
    assert.equal(pause.snapshot.canContinue, false);
    assert.equal(pause.continue(), false);
    assert.equal(pause.hasReason('user'), true, '横屏点击继续不应提前丢失用户暂停来源');
    pause.enterLifecycle();
    assert.equal(pause.snapshot.reason, 'lifecycle');
    pause.leaveLifecycle();
    assert.equal(pause.snapshot.reason, 'orientation');
    pause.leaveOrientation();
    assert.equal(pause.snapshot.visible, true);
    assert.equal(pause.snapshot.reason, 'user');
    assert.equal(pause.continue(), true);
    assert.equal(pause.snapshot.visible, false);
    assert.equal(pause.enterOrientation(), true);
    pause.leaveOrientation();
    assert.equal(pause.snapshot.canContinue, true);
    assert.equal(pause.continue(), true);
    assert.equal(pause.snapshot.visible, false);
});

test('返回首页时重置速度，重部署仍可保留玩家当前速度', () => {
    const clock = new SimulationClock();
    assert.equal(clock.cycleScale(), 2);
    clock.reset();
    assert.equal(clock.scale, 2);
    clock.resetToDefaultSpeed();
    assert.equal(clock.scale, 1);
});

test('最快纪录校验版本与数值，QA 与玩家隔离且存储失败不阻断胜利', () => {
    const values = new Map();
    const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
    const player = new FirstLevelBestTimeStore(false, () => storage);
    const qa = new FirstLevelBestTimeStore(true, () => storage);
    assert.equal(player.bestSeconds, null);
    assert.equal(player.recordVictory(420), true);
    assert.equal(player.recordVictory(440), false);
    assert.equal(player.recordVictory(420.00000000001), false);
    assert.equal(qa.bestSeconds, null);
    assert.equal(qa.recordVictory(390), true);
    assert.equal(new FirstLevelBestTimeStore(false, () => storage).bestSeconds, 420);
    assert.equal(new FirstLevelBestTimeStore(true, () => storage).bestSeconds, 390);
    assert.equal(qa.recordVictory(358.70000000000243), true);
    assert.equal(qa.recordVictory(358.6999999999999), false);
    assert.equal(new FirstLevelBestTimeStore(true, () => storage).bestSeconds, 358.7);
    values.set('nightwatch:first-level:best-time:player:v1', '{bad');
    assert.equal(new FirstLevelBestTimeStore(false, () => storage).bestSeconds, null);
    const denied = new FirstLevelBestTimeStore(false, () => { throw new Error('blocked'); });
    assert.equal(denied.recordVictory(300), true);
    assert.equal(denied.bestSeconds, 300);
    assert.throws(() => denied.recordVictory(0), RangeError);
});

test('结算反馈按真实时间收敛，暂停和 2 倍速不会改变展示时窗', () => {
    const reveal = new ResultRevealRuntime();
    assert.equal(reveal.progress, 1);
    reveal.begin();
    assert.equal(reveal.progress, 0);
    reveal.advance(0.275);
    assert.ok(Math.abs(reveal.progress - 0.5) < 1e-10);
    assert.equal(resultRevealEase(0.5), 0.875);
    reveal.advance(1);
    assert.equal(reveal.progress, 1);
    reveal.begin();
    reveal.clear();
    assert.equal(reveal.progress, 1);
    assert.throws(() => reveal.advance(-0.1), RangeError);
});

test('波次运行时按冻结间隔生成，塔优先攻击接近出口的敌人', () => {
    const grid = {
        id: 'grid-9x13', columns: 5, rows: 5,
        entry: { column: 2, row: 0 }, exit: { column: 2, row: 4 },
    };
    const enemy = { id: 'clockwork-infantry', maxHealth: 55, speedCellsPerSecond: 0.01, killReward: 4 };
    const tower = { id: 'rivet-gun', rangeCells: 10, damage: 55, attackIntervalSeconds: 0.3 };
    const wave = { wave: 1, groups: [{ enemy, count: 2, spawnIntervalSeconds: 0.9 }] };
    const runtime = new WaveCombatRuntime(grid, tower);
    const flow = new FlowField(grid, new Set());
    const towers = new Set([cellKey({ column: 1, row: 1 })]);
    runtime.start(wave);
    assert.deepEqual(runtime.waveSpawnProgress, { spawned: 0, total: 2 });
    const first = runtime.tick(0, flow, towers);
    assert.deepEqual(runtime.waveSpawnProgress, { spawned: 1, total: 2 });
    assert.equal(first.killed.length, 1);
    assert.equal(first.spawningCompleted, false);
    const second = runtime.tick(0.9, flow, towers);
    assert.equal(second.killed.length, 1);
    assert.equal(second.spawningCompleted, true);
    assert.equal(runtime.enemies.length, 0);
    assert.deepEqual(runtime.waveSpawnProgress, { spawned: 2, total: 2 });
    assert.deepEqual(runtime.totals, { spawned: 2, killed: 2, leaked: 0 });
    runtime.completeWave();
    assert.deepEqual(runtime.waveSpawnProgress, { spawned: 2, total: 2 });
    runtime.start({ wave: 2, groups: [{ enemy, count: 1, spawnIntervalSeconds: 0.9 }] });
    assert.deepEqual(runtime.waveSpawnProgress, { spawned: 0, total: 1 });
    runtime.tick(0, flow, towers);
    assert.deepEqual(runtime.waveSpawnProgress, { spawned: 1, total: 1 });
    assert.deepEqual(runtime.totals, { spawned: 3, killed: 3, leaked: 0 });
});

test('长帧内分批刷出的敌人只移动出生后的剩余时间', () => {
    const grid = { id: 'spawn-remainder', columns: 3, rows: 10,
        entry: { column: 1, row: 0 }, exit: { column: 1, row: 9 } };
    const flow = new FlowField(grid, new Set());
    const runtime = new WaveCombatRuntime(grid, RIVET_GUN);
    runtime.start({ wave: 1, groups: [
        { enemy: CLOCKWORK_INFANTRY, count: 1, spawnIntervalSeconds: 0.5 },
        { enemy: CLOCKWORK_RUNNER, count: 1, spawnIntervalSeconds: 0.5 },
    ] });
    runtime.tick(2.25, flow, []);
    assert.deepEqual(runtime.waveSpawnProgress, { spawned: 2, total: 2 });
    const [infantry, runner] = runtime.enemies;
    assert.equal(infantry.fromCell.row, 2);
    assert.ok(Math.abs(infantry.progress - 0.25) < 1e-9);
    // 第二组要等首组间隔和 1.5 秒组间停顿，2 秒时才出生；此帧只应行进 0.25 秒。
    assert.equal(runner.fromCell.row, 0);
    assert.ok(Math.abs(runner.progress - 0.4) < 1e-9);
});

test('敌人到达出口只上报漏怪，不在运行时内直接修改核心生命', () => {
    const grid = {
        id: 'grid-9x13', columns: 3, rows: 2,
        entry: { column: 1, row: 0 }, exit: { column: 1, row: 1 },
    };
    const enemy = { id: 'clockwork-infantry', maxHealth: 55, speedCellsPerSecond: 1, killReward: 4 };
    const tower = { id: 'rivet-gun', rangeCells: 2.6, damage: 8, attackIntervalSeconds: 0.3 };
    const runtime = new WaveCombatRuntime(grid, tower);
    runtime.start({ wave: 1, groups: [{ enemy, count: 1, spawnIntervalSeconds: 0.9 }] });
    const flow = new FlowField(grid, new Set());
    runtime.tick(0, flow, new Set());
    const result = runtime.tick(1.1, flow, new Set());
    assert.equal(result.leaked.length, 1);
    assert.equal(runtime.enemies.length, 0);
    assert.deepEqual(runtime.totals, { spawned: 1, killed: 0, leaked: 1 });
});

test('冷凝优先压制后到的疾行机，机枪仍优先攻击更接近出口的步兵', () => {
    const grid = { id: 'target-priority', columns: 3, rows: 5,
        entry: { column: 1, row: 0 }, exit: { column: 1, row: 4 } };
    const flow = new FlowField(grid, new Set());
    const wave = { wave: 1, groups: [
        { enemy: CLOCKWORK_INFANTRY, count: 1, spawnIntervalSeconds: 0.2 },
        { enemy: CLOCKWORK_RUNNER, count: 1, spawnIntervalSeconds: 0.2 },
    ] };
    const cell = { column: 0, row: 1 };
    const targetOf = (tower) => {
        const runtime = new WaveCombatRuntime(grid, [tower]);
        runtime.start(wave);
        // 分帧经过分组间隙，让前排步兵走近出口，再放出后到的疾行机。
        runtime.tick(0, flow, []);
        for (let frame = 0; frame < 18; frame += 1) runtime.tick(0.1, flow, []);
        assert.equal(runtime.enemies.length, 2);
        return runtime.tick(0, flow, [{ cell, towerId: tower.id }]).shots[0].targetId;
    };
    assert.equal(targetOf(FROST_COIL), 'enemy-2');
    assert.equal(targetOf(RIVET_GUN), 'enemy-1');
});

test('冷凝塔命中后按持续时间减速，重复命中刷新而不叠乘', () => {
    const grid = {
        id: 'grid-9x13', columns: 3, rows: 5,
        entry: { column: 1, row: 0 }, exit: { column: 1, row: 4 },
    };
    const enemy = { id: 'clockwork-infantry', maxHealth: 100, speedCellsPerSecond: 1, killReward: 4 };
    const runtime = new WaveCombatRuntime(grid, PHASE_B_TOWERS);
    const flow = new FlowField(grid, new Set());
    const towers = [{ cell: { column: 0, row: 1 }, towerId: 'frost-coil' }];
    runtime.start({ wave: 1, groups: [{ enemy, count: 1, spawnIntervalSeconds: 1 }] });
    const first = runtime.tick(0, flow, towers);
    assert.equal(first.shots[0].towerId, 'frost-coil');
    assert.equal(first.shots[0].appliedSlow, true);
    assert.equal(runtime.enemies[0].slowMultiplier, FROST_COIL.effect.speedMultiplier);
    runtime.tick(1, flow, towers);
    assert.ok(Math.abs(runtime.enemies[0].progress - 0.25) < 1e-9);
    assert.equal(runtime.enemies[0].slowMultiplier, 0.25);
    assert.equal(runtime.enemies[0].slowRemainingSeconds, 1.2);
});

test('冷凝脉冲只伤主目标，并控制半径内其他存活敌人', () => {
    const grid = { id: 'pulse', columns: 3, rows: 6,
        entry: { column: 1, row: 0 }, exit: { column: 1, row: 5 } };
    const enemy = { id: 'clockwork-infantry', maxHealth: 100, speedCellsPerSecond: 0, killReward: 4 };
    const flow = new FlowField(grid, new Set());
    const wave = { wave: 1, groups: [{ enemy, count: 3, spawnIntervalSeconds: 0.1 }] };
    const fire = (radius) => {
        const frost = { ...FROST_COIL, effect: { ...FROST_COIL.effect, pulseRadiusCells: radius } };
        const runtime = new WaveCombatRuntime(grid, frost);
        runtime.start(wave);
        runtime.tick(0.21, flow, []);
        // 第三只放在脉冲外，验证同帧存活目标才会被减速。
        runtime.enemies[2].fromCell = { column: 1, row: 4 };
        runtime.enemies[2].toCell = { column: 1, row: 5 };
        const shot = runtime.tick(0, flow, [{ cell: { column: 0, row: 0 }, towerId: 'frost-coil' }]).shots[0];
        return { shot, enemies: runtime.enemies };
    };
    const pulse = fire(1.5);
    assert.deepEqual(pulse.shot.slowedEnemyIds, ['enemy-1', 'enemy-2']);
    assert.deepEqual(pulse.enemies.map(({ health }) => health), [96, 100, 100]);
    assert.deepEqual(pulse.enemies.map(({ slowMultiplier }) => slowMultiplier), [0.25, 0.25, 1]);
    const single = fire(0);
    assert.deepEqual(single.shot.slowedEnemyIds, ['enemy-1']);
    assert.deepEqual(single.enemies.map(({ slowMultiplier }) => slowMultiplier), [0.25, 1, 1]);
});

test('两套不同路线的标准布局中，冷凝近等预算下均减少后四波漏怪', () => {
    const routes = [];
    for (const row of [2, 3]) {
        const layout = standardLayout(row);
        const mixed = replayFirstLevel(layout.mixed);
        const pure = replayFirstLevel(layout.pure);
        const mixedLeaks = mixed.waveResults.slice(4).reduce((sum, wave) => sum + wave.leaked, 0);
        const pureLeaks = pure.waveResults.slice(4).reduce((sum, wave) => sum + wave.leaked, 0);
        assert.equal(mixed.waveResults.at(-1).wave, 8);
        assert.equal(pure.waveResults.at(-1).wave, 8);
        assert.ok(Math.abs(mixed.telemetry.at(-1).towerInvestment - pure.telemetry.at(-1).towerInvestment) <= 4);
        assert.ok(pureLeaks >= 5, `第 ${row} 行纯机枪对照未形成有效压力`);
        assert.ok(mixedLeaks <= pureLeaks * 0.8, `第 ${row} 行冷凝收益不足 20%`);
        assert.equal(mixed.coreHealth, 10);
        routes.push(mixed.pathCells);
    }
    assert.notDeepEqual(routes[0], routes[1], '两套布局不能只是改塔名，必须真的改路');
});

test('战斗反馈消费只读事件，并在独立时间轴上自动回收', () => {
    const feedback = new CombatFeedbackRuntime();
    const enemy = {
        id: 'enemy-1', archetype: { id: 'clockwork-infantry', maxHealth: 55, speedCellsPerSecond: 1, killReward: 4 },
        health: 0, fromCell: { column: 1, row: 1 }, toCell: { column: 1, row: 2 }, progress: 0.5, spawnOrder: 1,
    };
    const result = {
        shots: [{ towerCell: { column: 0, row: 1 }, towerId: 'rivet-gun', targetId: enemy.id, targetPoint: { column: 1, row: 1.5 }, damage: 7, lethal: true, appliedSlow: false }],
        killed: [enemy], leaked: [], spawningCompleted: false,
    };
    feedback.consume(result);
    assert.equal(countCombatFeedback(feedback.snapshot), 4);
    assert.equal(feedback.snapshot.tracers.length, 1);
    assert.equal(feedback.snapshot.tracers[0].targetId, enemy.id);
    assert.equal(feedback.snapshot.deaths.length, 1);
    assert.equal(feedback.snapshot.deaths[0].enemyId, enemy.id);
    assert.equal(feedback.snapshot.deaths[0].spawnOrder, enemy.spawnOrder);
    assert.equal(feedback.snapshot.rewards[0].amount, 4);
    feedback.advance(0.17);
    assert.equal(feedback.snapshot.tracers.length, 0);
    assert.equal(feedback.snapshot.impacts.length, 0);
    assert.equal(feedback.snapshot.deaths.length, 1);
    feedback.advance(0.54);
    assert.equal(feedback.snapshot.deaths.length, 0);
    assert.equal(feedback.snapshot.rewards.length, 0);
    assert.equal(result.shots[0].damage, 7);
});

test('死亡反馈分层：高频小怪安静收拢，重装有较长但最终归零的冲击', () => {
    const infantrySeconds = enemyDeathFeedbackSeconds('clockwork-infantry');
    const heavySeconds = enemyDeathFeedbackSeconds('iron-canister-hauler');
    assert.ok(infantrySeconds < heavySeconds);
    const infantry = enemyDeathPose('clockwork-infantry', infantrySeconds / 2, infantrySeconds, 1);
    const heavy = enemyDeathPose('iron-canister-hauler', heavySeconds / 2, heavySeconds, 2);
    assert.equal(infantry.rays, 0);
    assert.equal(heavy.rays, 8);
    assert.ok(heavy.ringRadiusCells > infantry.ringRadiusCells);
    assert.ok(heavy.ringOpacity > infantry.ringOpacity);
    assert.ok(heavy.y < 0 && heavy.scaleY < 1);
    assert.equal(enemyDeathPose('iron-canister-hauler', 0, heavySeconds, 2).opacity, 0);
    assert.equal(enemyDeathPose('clockwork-runner', 0, 0, 1).ringOpacity, 0);
    const feedback = new CombatFeedbackRuntime();
    const base = { health: 0, fromCell: { column: 1, row: 1 }, toCell: { column: 1, row: 2 }, progress: 0.5, spawnOrder: 1 };
    feedback.consume({ shots: [], killed: [
        { ...base, id: 'infantry', archetype: CLOCKWORK_INFANTRY },
        { ...base, id: 'heavy', archetype: IRON_CANISTER_HAULER },
    ], leaked: [], spawningCompleted: false });
    assert.equal(feedback.snapshot.deaths[0].durationSeconds, infantrySeconds);
    assert.equal(feedback.snapshot.deaths[1].durationSeconds, heavySeconds);
    feedback.advance(infantrySeconds);
    assert.deepEqual(feedback.snapshot.deaths.map((death) => death.enemyId), ['heavy']);
    feedback.advance(heavySeconds - infantrySeconds);
    assert.equal(feedback.snapshot.deaths.length, 0);
});

test('冷凝范围脉冲独立于短弹道衰减，2倍速下仍保留可见时窗', () => {
    const feedback = new CombatFeedbackRuntime();
    const point = { column: 3, row: 2 };
    const shot = { towerCell: { column: 2, row: 2 }, towerId: 'frost-coil',
        targetId: 'enemy-1', targetPoint: point, damage: 4, lethal: false,
        appliedSlow: true, slowedEnemyIds: ['enemy-1', 'enemy-2'], slowRadiusCells: 1.5 };
    feedback.consume({ shots: [shot], killed: [], leaked: [], spawningCompleted: false });
    assert.equal(feedback.snapshot.slowPulses.length, 1);
    assert.deepEqual(feedback.snapshot.slowPulses[0].point, point);
    assert.equal(feedback.snapshot.slowPulses[0].radiusCells, 1.5);
    assert.equal(feedback.snapshot.slowPulses[0].affectedEnemyCount, 2);
    // 0.2 秒玩法时间相当于 2× 下 0.1 秒真实时间：弹道消失，控制波纹仍在。
    feedback.advance(0.2);
    assert.equal(feedback.snapshot.tracers.length, 0);
    assert.ok(feedback.snapshot.slowPulses[0].remainingSeconds > 0.2);
    feedback.advance(0.3);
    assert.equal(feedback.snapshot.slowPulses.length, 0);
    feedback.consume({ shots: [{ ...shot, appliedSlow: false, slowedEnemyIds: [] }],
        killed: [], leaked: [], spawningCompleted: false });
    assert.equal(feedback.snapshot.slowPulses.length, 0, '未施加减速时不能伪造脉冲反馈');
    feedback.clear();
    assert.equal(countCombatFeedback(feedback.snapshot), 0);
});

test('第一波短折线在 20/30/60 FPS 下保持至少双敌同屏并全部守住', () => {
    const grid = PHASE_A_GRIDS['grid-9x13'];
    const fixture = fixtures.fixtures.find((item) => item.gridId === 'grid-9x13').shortFold;
    const towers = new Set(toCells(fixture.towerCells).map(cellKey));
    const flow = new FlowField(grid, towers);
    for (const deltaSeconds of [1 / 60, 1 / 30, 1 / 20]) {
        const runtime = new WaveCombatRuntime(grid, RIVET_GUN);
        runtime.start(PHASE_B_WAVE_ONE);
        let maxActiveEnemies = 0;
        for (let elapsed = 0; elapsed < 30 && (!runtime.isSpawningComplete || runtime.enemies.length > 0); elapsed += deltaSeconds) {
            runtime.tick(deltaSeconds, flow, towers);
            maxActiveEnemies = Math.max(maxActiveEnemies, runtime.enemies.length);
        }
        assert.ok(maxActiveEnemies >= 2, `${deltaSeconds} 秒步长的同屏峰值只有 ${maxActiveEnemies}`);
        assert.deepEqual(runtime.totals, { spawned: 9, killed: 9, leaked: 0 });
    }
});

test('冷凝前置混合塔组在 20/30/60 FPS 下守住教学波并出现减速反馈', () => {
    const grid = PHASE_A_GRIDS['grid-9x13'];
    const fixture = fixtures.fixtures.find((item) => item.gridId === 'grid-9x13').shortFold;
    const cells = toCells(fixture.towerCells);
    const towers = new Set(cells.map(cellKey));
    const deployments = cells.map((cell, index) => ({ cell, towerId: index === 0 ? 'frost-coil' : 'rivet-gun' }));
    const flow = new FlowField(grid, towers);
    for (const deltaSeconds of [1 / 60, 1 / 30, 1 / 20]) {
        const runtime = new WaveCombatRuntime(grid, PHASE_B_TOWERS);
        runtime.start(PHASE_B_WAVE_ONE);
        let maxSlowedEnemies = 0;
        for (let elapsed = 0; elapsed < 40 && (!runtime.isSpawningComplete || runtime.enemies.length > 0); elapsed += deltaSeconds) {
            runtime.tick(deltaSeconds, flow, deployments);
            maxSlowedEnemies = Math.max(maxSlowedEnemies, runtime.enemies.filter(({ slowRemainingSeconds }) => slowRemainingSeconds > 0).length);
        }
        assert.ok(maxSlowedEnemies >= 2, `${deltaSeconds} 秒步长未形成可读减速同屏`);
        assert.deepEqual(runtime.totals, { spawned: 9, killed: 9, leaked: 0 });
    }
});

test('首关分波推荐构筑零漏，末段可选加固缩短清场', () => {
    const guided = replayFirstLevel({ reinforcements: FIRST_LEVEL_REINFORCEMENTS });
    assert.equal(guided.combatSecondsByWave.length, PHASE_B_WAVES.length);
    guided.spawnSecondsByWave.forEach((seconds, index) => {
        assert.ok(seconds > 0 && seconds <= guided.combatSecondsByWave[index]);
    });
    for (const wave of guided.telemetry.slice(0, 3)) {
        assert.ok(wave.emptySpawnSeconds < 0.5, `第 ${wave.wave} 波不应靠空场等待拉长局长`);
        assert.ok(wave.multiEnemySeconds / wave.combatSeconds >= 0.6, `第 ${wave.wave} 波缺少持续的多敌同屏压力`);
    }
    assert.deepEqual(FIRST_LEVEL_GUIDED_UPGRADES.map(({ wave, targetLevel }) => [wave, targetLevel]), [[1, 2], [5, 2], [6, 3], [7, 3]]);
    assert.deepEqual(guided.telemetry.slice(0, 3).map(({ gold }) => gold), [0, 12, 40]);
    // 只在显式请求时输出逐波基线；现阶段不把未获真人验证的 6–8 分钟目标写成自动放行门槛。
    if (process.env.REPORT_FIRST_LEVEL_PACING === '1') {
        console.log('FIRST_LEVEL_PACING', JSON.stringify({
            spawnSecondsByWave: guided.spawnSecondsByWave.map((seconds) => Number(seconds.toFixed(1))),
            combatSecondsByWave: guided.combatSecondsByWave.map((seconds) => Number(seconds.toFixed(1))),
        }));
    }
    assert.deepEqual(guided.waveResults.slice(0, 3), [
        { wave: 1, killed: 9, leaked: 0, coreHealth: 10, towers: 5 },
        { wave: 2, killed: 9, leaked: 0, coreHealth: 10, towers: 6 },
        { wave: 3, killed: 13, leaked: 0, coreHealth: 10, towers: 7 },
    ]);
    assert.equal(guided.coreHealth, 10);
    assert.equal(guided.towers, 10);
    assert.deepEqual(guided.totals, { spawned: 213, killed: 213, leaked: 0 });
    assert.equal(guided.telemetry.at(-1).towerInvestment, 466);
    assert.deepEqual(guided.telemetry.slice(4).map(({ gold }) => gold), [29, 89, 129, 349]);
    const combatSeconds = guided.telemetry.reduce((sum, wave) => sum + wave.combatSeconds, 0);
    // 首关局长口径包含七段正常波间倒计时，不包含教学停留或手动暂停。
    const scheduledWaveBreakSeconds = (PHASE_B_WAVES.length - 1) * 8;
    assert.ok(combatSeconds + scheduledWaveBreakSeconds >= 360 && combatSeconds + scheduledWaveBreakSeconds <= 480,
        '推荐构筑 1× 战斗加自然波间应落在 6–8 分钟区间');
    assert.ok(guided.telemetry.reduce((sum, wave) => sum + wave.emptySpawnSeconds, 0) < 1,
        '不能靠刷怪期空场等待凑局长');
    assert.ok(guided.telemetry[0].shotsByCell['3,2'] > 0, '首塔必须实际参与教学波');
    assert.deepEqual(FIRST_LEVEL_REINFORCEMENTS.map(({ afterWave }) => afterWave), [1, 2, 3, 4, 5, 6]);
    assert.deepEqual(guided.telemetry.slice(0, 3).map(({ pathLength }) => pathLength), [18, 18, 20]);
    assert.equal(guided.telemetry[2].pathCells.includes('8,8'), true, '第三波后应把敌人导入右侧火力区');
    assert.deepEqual(guided.pathCells.slice(11, 16).map(cellKey), ['8,7', '7,7', '6,7', '5,7', '5,8'],
        '第六波补塔后敌人应离开右边界，折回中线火力区');
    const shotsByCell = guided.telemetry.reduce((sum, wave) => {
        for (const [cell, shots] of Object.entries(wave.shotsByCell)) sum[cell] = (sum[cell] ?? 0) + shots;
        return sum;
    }, {});
    assert.deepEqual(guided.deployments.map(({ cell }) => cellKey(cell)).filter((cell) => !shotsByCell[cell]), ['1,2'],
        '推荐构筑只允许预期中的左侧封路塔全局零开火');
    const withoutLeftWall = new Set(guided.deployments.map(({ cell }) => cellKey(cell)));
    withoutLeftWall.delete('1,2');
    assert.notDeepEqual(new FlowField(PHASE_A_GRIDS['grid-9x13'], withoutLeftWall).pathFrom(PHASE_A_GRIDS['grid-9x13'].entry), guided.pathCells,
        '左侧封路塔虽不攻击，但必须真实改变最终路线');
    assert.ok(guided.telemetry.slice(4).reduce((sum, wave) => sum + (wave.frostShotsByCell['7,8'] ?? 0), 0) >= 10,
        '末段冷凝塔应实际参与战斗，不能再次放到射程外');
    assert.ok(guided.telemetry[7].shotsByCell['8,9'] >= 50, '改路塔还应参与末波输出，不能只占格子');

    const fortified = replayFirstLevel({ reinforcements: [...FIRST_LEVEL_REINFORCEMENTS, FIRST_LEVEL_OPTIONAL_FORTIFICATIONS[0]] });
    assert.equal(fortified.coreHealth, 10);
    assert.equal(fortified.towers, 11);
    assert.deepEqual(fortified.totals, { spawned: 213, killed: 213, leaked: 0 });
    assert.ok(fortified.telemetry.at(-1).combatSeconds < guided.telemetry.at(-1).combatSeconds);

    const noUpgrade = replayFirstLevel({ upgradesAfterWave: [] });
    assert.ok(noUpgrade.coreHealth < guided.coreHealth, '升级应减少末波漏怪，但不强制玩家照单全升');
    assert.equal(noUpgrade.waveResults.at(-1).wave, 8);
});

test('后段赏金收敛后仍可主动补两座有效机枪，但不能轻易跳过局长下界', () => {
    const extraGuns = [{ column: 7, row: 3 }, { column: 7, row: 4 }]
        .map((cell) => ({ afterWave: 6, cell, towerId: 'rivet-gun' }));
    const result = replayFirstLevel({ reinforcements: [...FIRST_LEVEL_REINFORCEMENTS, ...extraGuns] });
    assert.equal(result.coreHealth, 10);
    assert.equal(result.towers, 12);
    assert.equal(result.telemetry[5].gold, 29, '第六波后两座补塔必须真实花费 60 金');
    const battleSeconds = result.telemetry.reduce((sum, wave) => sum + wave.combatSeconds, 0);
    assert.ok(battleSeconds + 56 >= 360, '两座有效补塔后，1× 战斗加自然波间不应低于 6 分钟');
    assert.ok(battleSeconds + 56 <= 480);
});

test('推荐构筑在常见帧步长下保持相同的逐波结果', () => {
    const reference = replayFirstLevel({ reinforcements: FIRST_LEVEL_REINFORCEMENTS });
    for (const deltaSeconds of [1 / 60, 1 / 20]) {
        const replay = replayFirstLevel({ reinforcements: FIRST_LEVEL_REINFORCEMENTS, frameDeltaSeconds: deltaSeconds });
        assert.deepEqual(replay.waveResults, reference.waveResults, `${deltaSeconds} 秒帧步长逐波结果不同`);
    }
    assert.deepEqual(replayFirstLevel({ reinforcements: FIRST_LEVEL_REINFORCEMENTS, frameDeltaSeconds: 1 / 60, speedScale: 2 }).waveResults, reference.waveResults);
});
