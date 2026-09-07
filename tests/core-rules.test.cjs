const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const { PHASE_A_GRIDS, PHASE_A_TOWER_COST } = require('../.test-dist/config/PhaseAGrids.js');
const { PHASE_B_WAVES, PHASE_B_WAVE_ONE, RIVET_GUN } = require('../.test-dist/config/PhaseBCombatConfig.js');
const { cellKey } = require('../.test-dist/core/GridTypes.js');
const { FlowField } = require('../.test-dist/systems/FlowField.js');
const { PlacementModel } = require('../.test-dist/systems/PlacementModel.js');
const { simulateNoDamageRoute } = require('../.test-dist/systems/RouteSimulation.js');
const { BattleStateMachine } = require('../.test-dist/systems/BattleStateMachine.js');
const { EconomyLedger } = require('../.test-dist/systems/EconomyLedger.js');
const { BattleRunCheckpoint } = require('../.test-dist/systems/BattleRunCheckpoint.js');
const { WaveCombatRuntime } = require('../.test-dist/systems/WaveCombatRuntime.js');
const { WaveCatalog } = require('../.test-dist/systems/WaveCatalog.js');
const { buildBattleResultViewModel } = require('../.test-dist/presentation/BattleResultViewModel.js');
const { countCombatFeedback, CombatFeedbackRuntime } = require('../.test-dist/presentation/CombatFeedbackRuntime.js');
const { PhaseBLayout } = require('../.test-dist/presentation/PhaseBLayout.js');

const fixtures = JSON.parse(readFileSync(resolve(__dirname, '../docs/poc/phase-a-fixtures.json'), 'utf8'));

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
});

test('八波目录连续可索引且保留第一波冻结配置', () => {
    const catalog = new WaveCatalog(PHASE_B_WAVES);
    assert.equal(catalog.totalWaves, 8);
    assert.equal(catalog.get(1), PHASE_B_WAVE_ONE);
    assert.deepEqual(PHASE_B_WAVE_ONE.groups.map(({ count, spawnIntervalSeconds }) => ({ count, spawnIntervalSeconds })), [
        { count: 8, spawnIntervalSeconds: 0.6 },
    ]);
    assert.throws(() => new WaveCatalog([PHASE_B_WAVES[1]]), /连续编号/);
    assert.throws(() => catalog.get(9), /不存在第 9 波/);
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

test('战斗反馈消费只读事件，并在独立时间轴上自动回收', () => {
    const feedback = new CombatFeedbackRuntime();
    const enemy = {
        id: 'enemy-1', archetype: { id: 'clockwork-infantry', maxHealth: 55, speedCellsPerSecond: 1, killReward: 4 },
        health: 0, fromCell: { column: 1, row: 1 }, toCell: { column: 1, row: 2 }, progress: 0.5, spawnOrder: 1,
    };
    const result = {
        shots: [{ towerCell: { column: 0, row: 1 }, targetId: enemy.id, targetPoint: { column: 1, row: 1.5 }, damage: 7, lethal: true }],
        killed: [enemy], leaked: [], spawningCompleted: false,
    };
    feedback.consume(result);
    assert.equal(countCombatFeedback(feedback.snapshot), 4);
    assert.equal(feedback.snapshot.tracers.length, 1);
    assert.equal(feedback.snapshot.deaths.length, 1);
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

test('第一波短折线在 20/30/60 FPS 下都保持可读同屏量与 6 杀 2 漏', () => {
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
        assert.deepEqual(runtime.totals, { spawned: 8, killed: 6, leaked: 2 });
    }
});
