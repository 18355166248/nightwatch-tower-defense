const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const { PHASE_A_GRIDS, PHASE_A_TOWER_COST } = require('../.test-dist/config/PhaseAGrids.js');
const { FIRST_LEVEL_OPENING, FIRST_LEVEL_OPTIONAL_FORTIFICATIONS, FIRST_LEVEL_REINFORCEMENTS, FIRST_LEVEL_STARTING_GOLD, FIRST_LEVEL_SUGGESTED_PATH_DELTA } = require('../.test-dist/config/FirstLevelOpening.js');
const { CLOCKWORK_INFANTRY, CLOCKWORK_RUNNER, FROST_COIL, PHASE_B_TOWERS, PHASE_B_WAVES, PHASE_B_WAVE_ONE, RIVET_GUN } = require('../.test-dist/config/PhaseBCombatConfig.js');
const { cellKey } = require('../.test-dist/core/GridTypes.js');
const { FlowField } = require('../.test-dist/systems/FlowField.js');
const { PlacementModel } = require('../.test-dist/systems/PlacementModel.js');
const { simulateNoDamageRoute } = require('../.test-dist/systems/RouteSimulation.js');
const { BattleStateMachine } = require('../.test-dist/systems/BattleStateMachine.js');
const { EconomyLedger } = require('../.test-dist/systems/EconomyLedger.js');
const { BattleRunCheckpoint } = require('../.test-dist/systems/BattleRunCheckpoint.js');
const { FirstLevelSoundDirector } = require('../.test-dist/audio/FirstLevelSoundDirector.js');
const { TowerInspection } = require('../.test-dist/input/TowerInspection.js');
const { WaveCombatRuntime } = require('../.test-dist/systems/WaveCombatRuntime.js');
const { WaveCatalog } = require('../.test-dist/systems/WaveCatalog.js');
const { WaveRewardRuntime } = require('../.test-dist/systems/WaveRewardRuntime.js');
const { SimulationClock } = require('../.test-dist/systems/SimulationClock.js');
const { buildBattleResultViewModel } = require('../.test-dist/presentation/BattleResultViewModel.js');
const { countCombatFeedback, CombatFeedbackRuntime } = require('../.test-dist/presentation/CombatFeedbackRuntime.js');
const { buildCoreObjectiveState } = require('../.test-dist/presentation/CoreObjectiveState.js');
const { firstLevelGuidance } = require('../.test-dist/presentation/FirstLevelGuidance.js');
const { FirstLevelExperience } = require('../.test-dist/presentation/FirstLevelExperience.js');
const { hudEventText } = require('../.test-dist/presentation/PhaseBHudText.js');
const { enemyGaitFrame, enemySlowVisualStrength, enemyStridePose, enemyVisualOffset, frostCorePulsePose, towerRecoilPose } = require('../.test-dist/presentation/UnitVisualMotion.js');
const { RouteChangeFeedback, routeChangeText, routeLengthDelta } = require('../.test-dist/presentation/RouteChangeFeedback.js');
const { waveLineup, waveThreatHint } = require('../.test-dist/presentation/WaveBriefing.js');
const {
    PHASE_B_EARLY_WAVE_BUTTON,
    PHASE_B_SPEED_BUTTON,
    PHASE_B_RIVET_BUTTON,
    PHASE_B_FROST_BUTTON,
    PHASE_B_TOWER_BUTTON,
    PHASE_B_SOUND_BUTTON,
    PhaseBLayout,
} = require('../.test-dist/presentation/PhaseBLayout.js');

const fixtures = JSON.parse(readFileSync(resolve(__dirname, '../docs/poc/phase-a-fixtures.json'), 'utf8'));

test('首关 HUD 将重复金币移到独立数值卡，保留建塔与波次事件', () => {
    assert.equal(hudEventText('机枪塔已建造 · 路线 +2 格 · 金币 10'), '机枪塔已建造 · 路线 +2 格');
    assert.equal(hudEventText('第 1 波清场！清场 +20 · 剩余金币 54'), '第 1 波清场！清场 +20');
    assert.equal(hudEventText('核心已失守'), '核心已失守');
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
    const context = { preparing: true, towerCount: 0, pathDelta: 0, previewAccepted: null, inputMode: 'idle', gold: 140, phase: 'preparing', wave: 0, occupiedCells: new Set(), guidedIntermissionHeld: false };
    assert.equal(flow.snapshot(context).mode, 'home');
    flow.begin();
    assert.equal(flow.shouldHoldIntermission(1, 8), true);
    assert.equal(flow.shouldHoldIntermission(7, 8), true);
    assert.equal(flow.shouldHoldIntermission(8, 8), false);
    assert.equal(flow.snapshot(context).step, 'select');
    assert.deepEqual(flow.snapshot(context).suggestedCell, { column: 3, row: 2 });
    assert.equal(flow.snapshot({ ...context, inputMode: 'armed' }).step, 'place');
    assert.match(flow.snapshot({ ...context, inputMode: 'click-preview', previewAccepted: false }).guidanceText, /红色/);
    assert.match(flow.snapshot({ ...context, towerCount: 1, previewAccepted: true }).guidanceText, /第 2 步/);
    assert.equal(flow.snapshot({ ...context, towerCount: 1, pathDelta: 2 }).suggestedTowerId, 'frost-coil');
    assert.deepEqual(flow.snapshot({ ...context, towerCount: 1, occupiedCells: new Set(['3,2']) }).suggestedCell, { column: 2, row: 2 });
    assert.equal(flow.snapshot({ ...context, towerCount: 1, inputMode: 'armed' }).step, 'place');
    assert.equal(flow.snapshot({ ...context, towerCount: 2, pathDelta: 2 }).step, 'shape');
    assert.equal(flow.snapshot({ ...context, towerCount: 4, pathDelta: 2 }).step, 'route');
    assert.equal(flow.snapshot({ ...context, towerCount: 4, pathDelta: 4 }).step, 'ready');
    assert.equal(flow.snapshot({ ...context, towerCount: 3, gold: 10 }).step, 'route');
    assert.equal(flow.snapshot({ ...context, preparing: false, phase: 'countdown', wave: 1, gold: 54 }).step, 'reinforce');
    assert.match(flow.snapshot({ ...context, preparing: false, phase: 'paused', wave: 1, gold: 54, guidedIntermissionHeld: true }).guidanceText, /再点 ▶ 继续/);
    assert.equal(flow.snapshot({ ...context, preparing: false, phase: 'paused', wave: 1, gold: 24, guidedIntermissionHeld: true }).step, 'ready');
    assert.equal(flow.snapshot({ ...context, preparing: false, phase: 'paused', wave: 4, gold: 44, guidedIntermissionHeld: true, occupiedCells: new Set(FIRST_LEVEL_REINFORCEMENTS.slice(0, 4).map(({ cell }) => cellKey(cell))) }).suggestedTowerId, 'frost-coil');
    assert.match(flow.snapshot({ ...context, preparing: false, phase: 'paused', wave: 4, gold: 38, guidedIntermissionHeld: true, occupiedCells: new Set(FIRST_LEVEL_REINFORCEMENTS.slice(0, 4).map(({ cell }) => cellKey(cell))) }).guidanceText, /暂缺金币/);
    assert.match(flow.snapshot({ ...context, preparing: false, phase: 'paused', wave: 6, gold: 82, guidedIntermissionHeld: true, occupiedCells: new Set(FIRST_LEVEL_REINFORCEMENTS.map(({ cell }) => cellKey(cell))) }).guidanceText, /下排可补机枪/);
    assert.equal(flow.snapshot({ ...context, preparing: false, phase: 'paused', wave: 1, gold: 54 }).step, 'combat');
    assert.equal(flow.snapshot({ ...context, preparing: false }).step, 'combat');
    flow.skip();
    assert.equal(flow.shouldHoldIntermission(1, 8), false);
    assert.equal(flow.snapshot(context).mode, 'free');
    assert.equal(flow.snapshot(context).guidanceText, null);
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
    assert.deepEqual(combat.totals, { spawned: 6, killed: 6, leaked: 0 });
    const rewards = new WaveRewardRuntime();
    assert.equal(rewards.settle(PHASE_B_WAVE_ONE, economy).gold, 54);
    assert.equal(model.preview({ column: 1, row: 2 }, [], 'rivet-gun').accepted, true);
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
    assert.match(routeChangeText(previewDelta), /路线 \+\d+ 格/);
    assert.equal(model.commit(preview, []).accepted, true);
    const placed = routeFeedback.record(cell, before, model.flowField.distanceAt(grid.entry));
    assert.equal(placed.delta, previewDelta);
    routeFeedback.advance(0.45);
    assert.ok(routeFeedback.snapshot.remainingSeconds > 0);
    const beforeSell = model.flowField.distanceAt(grid.entry);
    assert.equal(model.sell(cell, true), true);
    const removed = routeFeedback.record(cell, beforeSell, model.flowField.distanceAt(grid.entry));
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

test('已建塔先查看射程，准备态二次点击才撤销；战斗中只关闭查看', () => {
    const inspection = new TowerInspection();
    const first = { column: 3, row: 2 };
    const second = { column: 4, row: 2 };
    assert.equal(inspection.tap(first, true), 'inspect');
    assert.deepEqual(inspection.cell, first);
    assert.equal(inspection.tap(second, true), 'inspect');
    assert.deepEqual(inspection.cell, second);
    assert.equal(inspection.tap(second, true), 'sell');
    assert.equal(inspection.cell, null);
    assert.equal(inspection.tap(first, false), 'inspect');
    assert.equal(inspection.tap(first, false), 'dismiss');
    assert.equal(inspection.cell, null);
    inspection.tap(first, true);
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
        { count: 6, spawnIntervalSeconds: 0.6 },
    ]);
    assert.deepEqual(PHASE_B_WAVES.map(({ clearReward }) => clearReward), [20, 18, 22, 20, 24, 24, 28, 40]);
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
        ['clockwork-infantry', 8], ['clockwork-runner', 2],
    ]);
    assert.equal(PHASE_B_WAVES.flatMap(({ groups }) => groups).reduce((total, group) => total + group.count, 0), 86);
    assert.equal(waveLineup(PHASE_B_WAVES[2]), '发条步兵×8 · 疾行机×2');
    assert.equal(waveThreatHint(PHASE_B_WAVES[1]), null);
    assert.match(waveThreatHint(PHASE_B_WAVES[2]), /疾行机×2.*冷凝塔/);
});

test('四张单位图均导入为 SpriteFrame，避免新增纹理让整层切图降级', () => {
    for (const id of ['rivet-gun', 'frost-coil', 'clockwork-infantry', 'clockwork-runner']) {
        const asset = resolve(__dirname, `../assets/resources/level-one/units/${id}.png`);
        const meta = JSON.parse(readFileSync(`${asset}.meta`, 'utf8'));
        assert.equal(meta.userData.type, 'sprite-frame', id);
        assert.equal(meta.subMetas.f9941.importer, 'sprite-frame', id);
        assert.ok(readFileSync(asset).length < 32 * 1024, `${id} 的运行时图片超过 32 KiB`);
    }
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

test('出售只在 preparing 开放并恢复金币与流场', () => {
    const model = new PlacementModel(PHASE_A_GRIDS['grid-8x13'], 120, 30);
    const cell = { column: 1, row: 2 };
    assert.ok(model.commit(model.preview(cell, []), []).accepted);
    assert.equal(model.sell(cell, false), false);
    assert.equal(model.sell(cell, true), true);
    assert.equal(model.gold, 120);
    assert.equal(model.flowField.distanceAt(model.grid.entry), 12);
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
    assert.deepEqual(first, { credited: true, wave: 1, amount: 20, totalAwarded: 20, gold: 30 });
    assert.deepEqual(rewards.settle(PHASE_B_WAVES[0], economy), {
        credited: false, wave: 1, amount: 0, totalAwarded: 20, gold: 30,
    });
    assert.throws(() => rewards.settle(PHASE_B_WAVES[2], economy), /必须连续结算/);
    assert.equal(rewards.settle(PHASE_B_WAVES[1], economy).gold, 48);
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
    assert.equal(model.sell(frostCell, true), true);
    assert.equal(model.gold, 70);
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
    assert.equal(buildBattleResultViewModel({ phase: 'clearing', wave: 1, coreHealth: 8, countdownSeconds: 0 }, totals, 24, 10), null);
    const victory = buildBattleResultViewModel({ phase: 'victory', wave: 1, coreHealth: 8, countdownSeconds: 0 }, totals, 24, 10);
    assert.equal(victory.kind, 'victory');
    assert.match(victory.summary, /击毁 6\/8/);
    const defeat = buildBattleResultViewModel({ phase: 'defeat', wave: 1, coreHealth: 0, countdownSeconds: 0 }, totals, 24, 2);
    assert.equal(defeat.kind, 'defeat');
    assert.match(defeat.summary, /核心 0\/2/);
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
    const first = runtime.tick(0, flow, towers);
    assert.equal(first.killed.length, 1);
    assert.equal(first.spawningCompleted, false);
    const second = runtime.tick(0.9, flow, towers);
    assert.equal(second.killed.length, 1);
    assert.equal(second.spawningCompleted, true);
    assert.equal(runtime.enemies.length, 0);
    assert.deepEqual(runtime.totals, { spawned: 2, killed: 2, leaked: 0 });
    runtime.completeWave();
    runtime.start({ wave: 2, groups: [{ enemy, count: 1, spawnIntervalSeconds: 0.9 }] });
    runtime.tick(0, flow, towers);
    assert.deepEqual(runtime.totals, { spawned: 3, killed: 3, leaked: 0 });
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
    assert.ok(Math.abs(runtime.enemies[0].progress - 0.55) < 1e-9);
    assert.equal(runtime.enemies[0].slowMultiplier, 0.55);
    assert.equal(runtime.enemies[0].slowRemainingSeconds, 1.2);
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
        assert.deepEqual(runtime.totals, { spawned: 6, killed: 6, leaked: 0 });
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
        assert.deepEqual(runtime.totals, { spawned: 6, killed: 6, leaked: 0 });
    }
});

function replayFirstLevel(buildPlan, frameDeltaSeconds = 1 / 30, speedScale = 1) {
    const grid = PHASE_A_GRIDS['grid-9x13'];
    const shortCells = toCells(fixtures.fixtures.find((item) => item.gridId === 'grid-9x13').shortFold.towerCells);
    const economy = new EconomyLedger(FIRST_LEVEL_STARTING_GOLD);
    const model = new PlacementModel(grid, economy, PHASE_B_TOWERS);
    const combat = new WaveCombatRuntime(grid, PHASE_B_TOWERS);
    const clock = new SimulationClock();
    if (speedScale === 2) clock.cycleScale();
    const rewards = new WaveRewardRuntime();
    shortCells.forEach((cell) => {
        const towerId = FIRST_LEVEL_OPENING.find((item) => cellKey(item.cell) === cellKey(cell)).towerId;
        assert.equal(model.commit(model.preview(cell, [], towerId), []).accepted, true);
    });

    let coreHealth = 10;
    let nextBuild = 0;
    const waveResults = [];
    for (const wave of PHASE_B_WAVES) {
        combat.start(wave);
        let killed = 0;
        let leaked = 0;
        for (let elapsed = 0; elapsed < 120 && (!combat.isSpawningComplete || combat.enemies.length > 0); elapsed += frameDeltaSeconds) {
            clock.advance(frameDeltaSeconds, (deltaSeconds) => {
                if (combat.isSpawningComplete && combat.enemies.length === 0) return;
                const result = combat.tick(deltaSeconds, model.flowField, model.deployments);
                killed += result.killed.length;
                leaked += result.leaked.length;
                result.killed.forEach((enemy) => economy.credit(enemy.archetype.killReward));
            });
        }
        combat.completeWave();
        coreHealth -= leaked;
        rewards.settle(wave, economy);
        while (nextBuild < buildPlan.length) {
            const candidate = buildPlan[nextBuild];
            const preview = model.preview(candidate.cell, [], candidate.towerId);
            if (!preview.accepted && preview.reason === 'insufficient-gold') break;
            assert.equal(model.commit(preview, []).accepted, true);
            nextBuild += 1;
        }
        waveResults.push({ wave: wave.wave, killed, leaked, coreHealth, towers: model.towers.size });
    }

    return { waveResults, coreHealth, towers: model.towers.size, totals: combat.totals };
}

test('首关推荐构筑教学波零漏，后期自由加固有明确收益', () => {
    const guided = replayFirstLevel(FIRST_LEVEL_REINFORCEMENTS);
    assert.deepEqual(guided.waveResults.slice(0, 3), [
        { wave: 1, killed: 6, leaked: 0, coreHealth: 10, towers: 5 },
        { wave: 2, killed: 6, leaked: 0, coreHealth: 10, towers: 7 },
        { wave: 3, killed: 9, leaked: 1, coreHealth: 9, towers: 8 },
    ]);
    assert.equal(guided.coreHealth, 4);
    assert.equal(guided.towers, 11);
    assert.deepEqual(guided.totals, { spawned: 86, killed: 80, leaked: 6 });

    const fortified = replayFirstLevel([...FIRST_LEVEL_REINFORCEMENTS, FIRST_LEVEL_OPTIONAL_FORTIFICATIONS[0]]);
    assert.equal(fortified.coreHealth, 8);
    assert.equal(fortified.towers, 12);
    assert.deepEqual(fortified.totals, { spawned: 86, killed: 84, leaked: 2 });
});

test('推荐构筑在常见帧步长下保持相同的逐波结果', () => {
    const reference = replayFirstLevel(FIRST_LEVEL_REINFORCEMENTS);
    for (const deltaSeconds of [1 / 60, 1 / 20]) {
        const replay = replayFirstLevel(FIRST_LEVEL_REINFORCEMENTS, deltaSeconds);
        assert.deepEqual(replay.waveResults, reference.waveResults, `${deltaSeconds} 秒帧步长逐波结果不同`);
    }
    assert.deepEqual(replayFirstLevel(FIRST_LEVEL_REINFORCEMENTS, 1 / 60, 2).waveResults, reference.waveResults);
});
