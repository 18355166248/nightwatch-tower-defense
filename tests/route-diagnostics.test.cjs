const test = require('node:test');
const assert = require('node:assert/strict');
const { RouteDiagnostics, RouteDiagnosticError } = require('../.test-dist/systems/RouteDiagnostics.js');
const { FlowField } = require('../.test-dist/systems/FlowField.js');
const { PlacementModel } = require('../.test-dist/systems/PlacementModel.js');
const { PauseOverlayRuntime } = require('../.test-dist/systems/PauseOverlayRuntime.js');
const { PHASE_A_GRIDS } = require('../.test-dist/config/PhaseAGrids.js');
const { PHASE_B_TOWERS } = require('../.test-dist/config/PhaseBCombatConfig.js');
const { TWO_LANE_TRAFFIC } = require('../.test-dist/systems/EnemyTrafficRules.js');
const { WaveCombatRuntime } = require('../.test-dist/systems/WaveCombatRuntime.js');
const { CLOCKWORK_INFANTRY } = require('../.test-dist/config/PhaseBCombatConfig.js');
const { replayFirstLevel } = require('./support/first-level-replay.cjs');
const grid = PHASE_A_GRIDS['grid-9x13'];
const flow = new FlowField(grid, new Set());
const context = (seconds = 0, customFlow = flow) => ({ seconds, flow: customFlow, wave: 1, mapVersion: 7 });
const actor = (extra = {}) => ({ id: 'enemy-1', spawnOrder: 1, fromCell: { column: 4, row: 1 },
    toCell: { column: 4, row: 2 }, progress: 0.1, archetype: { speedCellsPerSecond: 1 },
    slowMultiplier: 1, trafficLane: 0, trafficWaiting: false, ...extra });

test('无进度立即测试失败：带地图/格心/前格/局部流场，生产只报告一次', () => {
    const monitor = new RouteDiagnostics();
    monitor.reset(context(), []);
    monitor.inspect([actor()], context());
    monitor.inspect([actor({ fromCell: { column: 4, row: 2 }, toCell: { column: 4, row: 3 } })], context(1));
    assert.throws(() => monitor.inspect([actor({ fromCell: { column: 4, row: 2 }, toCell: { column: 4, row: 3 } })], context(10)), error => {
        assert.ok(error instanceof RouteDiagnosticError);
        assert.equal(error.fault.code, 'no-progress');
        assert.equal(error.fault.mapVersion, 7);
        assert.equal(error.fault.previous, '4,1');
        assert.equal(error.fault.to, '4,3');
        assert.equal(error.fault.localFlow.length, 9);
        assert.equal(error.fault.recent.at(-1).kind, 'fault');
        return true;
    });
    const report = new RouteDiagnostics('report');
    report.reset(context(), []); report.inspect([actor()], context());
    const fault = report.inspect([actor()], context(9));
    assert.equal(report.inspect([actor()], context(10)), fault);
    assert.equal(report.export().events.filter(event => event.kind === 'fault').length, 1);
});

test('暂停不吃墙钟，慢走和微小增量都能累计；改地图不会刷新无进度宽限', () => {
    const monitor = new RouteDiagnostics('report');
    monitor.reset(context(), []);
    for (let i = 0; i < 600; i++) assert.equal(monitor.inspect([actor({ progress: 0.1 + i * 1e-6, slowMultiplier: 0.11 })], context(i / 60)), null);
    const paused = actor({ progress: 0.101, slowMultiplier: 0.11 });
    monitor.inspect([paused], context(10));
    for (let i = 0; i < 100; i++) assert.equal(monitor.inspect([paused], context(10)), null);
    assert.equal(monitor.inspect([paused], { ...context(39), mapVersion: 8 }).code, 'no-progress');
});

test('正常停等可追溯移动前排，另处运动不能掩盖孤立卡死', () => {
    const monitor = new RouteDiagnostics('report');
    monitor.reset(context(), []);
    const rear = actor({ trafficWaiting: true });
    const front = actor({ id: 'enemy-2', spawnOrder: 2, progress: 0.7 });
    monitor.inspect([rear, front], context());
    for (let i = 1; i <= 12; i++) assert.equal(monitor.inspect([rear, { ...front, progress: 0.7 + i * 0.001 }], context(i)), null);
    const stalled = new RouteDiagnostics('report');
    stalled.reset(context(), []);
    const isolated = actor({ id: 'far', fromCell: { column: 6, row: 1 }, toCell: { column: 6, row: 2 } });
    stalled.inspect([isolated, front], context());
    const fault = stalled.inspect([isolated, { ...front, progress: 0.8 }], context(9));
    assert.equal(fault.actor, 'far');
});

test('假等待/循环互等不能无限豁免，无前排的等待仍失败', () => {
    for (const actors of [[actor({ trafficWaiting: true })], [actor({ trafficWaiting: true }), actor({ id: 'enemy-2', spawnOrder: 2, trafficWaiting: true })]]) {
        const monitor = new RouteDiagnostics('report'); monitor.reset(context(), []);
        monitor.inspect(actors, context());
        assert.equal(monitor.inspect(actors, context(9)).code, 'no-progress');
    }
});

test('非法路段/占塔/不可达/缺下一格/回头均输出诊断，不修敌人位置', () => {
    const cases = [
        [actor({ progress: NaN }), flow, 'invalid-segment'],
        [actor({ toCell: { column: 4, row: 4 } }), flow, 'invalid-segment'],
        [actor(), new FlowField(grid, new Set(['4,2'])), 'invalid-segment'],
        [actor(), new FlowField(grid, new Set([`${grid.exit.column},${grid.exit.row}`])), 'unreachable'],
    ];
    const missing = Object.create(flow); missing.nextCell = () => null;
    cases.push([actor(), missing, 'missing-next']);
    const reverse = Object.create(flow); reverse.nextCell = (_, previous) => previous ?? null;
    cases.push([actor(), reverse, 'backtrack']);
    for (const [enemy, local, code] of cases) {
        const before = { ...enemy };
        const monitor = new RouteDiagnostics('report'); monitor.reset(context(0, local), []);
        assert.equal(monitor.inspect([enemy], context(0, local)).code, code);
        assert.deepEqual(enemy, before);
    }
});

test('已承诺格交接不容许瞬移或即时回头', () => {
    for (const [next, code] of [
        [actor({ fromCell: { column: 4, row: 4 }, toCell: { column: 4, row: 5 } }), 'invalid-segment'],
        [actor({ fromCell: { column: 4, row: 2 }, toCell: { column: 4, row: 1 } }), 'backtrack'],
    ]) {
        const monitor = new RouteDiagnostics('report'); monitor.reset(context(), []);
        monitor.inspect([actor()], context());
        assert.equal(monitor.inspect([next], context(1)).code, code);
    }
});

test('真实事务逐条记录建造/升级/出售，拒绝不记；导出脱离可变对象', () => {
    const model = new PlacementModel(grid, 200, PHASE_B_TOWERS);
    const monitor = new RouteDiagnostics();
    const ctx = () => ({ ...context(), flow: model.flowField, mapVersion: model.mapVersion });
    monitor.reset(ctx(), model.deployments);
    model.observeMutations(event => monitor.placement(event, ctx(), model.deployments));
    const cell = { column: 4, row: 3 };
    assert.ok(model.commit(model.preview(cell, []), []).accepted);
    assert.equal(model.commit(model.preview(cell, []), []).accepted, false);
    assert.ok(model.upgrade(cell).accepted);
    assert.equal(model.sell(cell, 'locked'), false);
    assert.ok(model.sell(cell, 'opening'));
    const events = monitor.export().events.slice(1);
    assert.deepEqual(events.map(event => [event.kind, event.mapVersion, event.level]), [['build', 1, 1], ['upgrade', 1, 2], ['sell', 2, 2]]);
    assert.deepEqual(monitor.export().maps, [{ version: 0, blocked: [] }, { version: 1, blocked: ['4,3'] }, { version: 2, blocked: [] }]);
    const snapshot = monitor.export(); snapshot.events[0].kind = 'fault';
    assert.equal(monitor.export().events[0].kind, 'reset');
});

test('有界日志顺序/丢弃数准确，换列/格心/离场记录，重开清空故障和旧地图', () => {
    const monitor = new RouteDiagnostics('report', 16); monitor.reset(context(), []);
    monitor.inspect([actor()], context()); monitor.inspect([actor({ trafficLane: 1 })], context(0.1));
    assert.equal(monitor.export().events.at(-1).kind, 'lane');
    monitor.inspect([actor({ fromCell: { column: 4, row: 2 }, toCell: { column: 4, row: 3 } })], context(1));
    assert.equal(monitor.export().events.at(-1).kind, 'center');
    monitor.departed('killed', [actor()], context(2));
    for (let i = 0; i < 30; i++) monitor.wave(context(i + 3));
    const data = monitor.export();
    assert.equal(data.events.length, 16); assert.equal(data.dropped, data.events.at(-1).seq - 16);
    assert.ok(data.events.every((event, index) => !index || event.seq === data.events[index - 1].seq + 1));
    monitor.runtimeFailure(null, context(40)); monitor.reset(context(), []);
    assert.equal(monitor.fault, null); assert.equal(monitor.eventCount, 1); assert.equal(monitor.export().map.version, 7);
});

test('路线错误暂停不可用继续/设置/后台解除绕过；重开清空才允许新局', () => {
    const pause = new PauseOverlayRuntime(); pause.enterRouteError();
    assert.equal(pause.snapshot.reason, 'route-error'); assert.equal(pause.continue(), false);
    pause.show('settings'); assert.equal(pause.snapshot.screen, 'route-error');
    pause.enterLifecycle(); pause.leaveLifecycle(); pause.enterOrientation(); pause.leaveOrientation();
    assert.equal(pause.snapshot.screen, 'route-error'); assert.equal(pause.continue(), false);
    pause.clear(); assert.equal(pause.snapshot.visible, false);
    pause.enterUser(); assert.equal(pause.continue(), true);
});

test('真实默认双列八波：每固定步检查不误报，结果/时长不变，正常QA交易写入日志', () => {
    const baseline = replayFirstLevel({ traffic: TWO_LANE_TRAFFIC });
    const monitor = new RouteDiagnostics();
    const watched = replayFirstLevel({ traffic: TWO_LANE_TRAFFIC, routeDiagnostics: monitor });
    assert.deepEqual(watched.waveResults, baseline.waveResults);
    assert.deepEqual(watched.combatSecondsByWave, baseline.combatSecondsByWave);
    assert.equal(watched.gold, 348); assert.equal(watched.coreHealth, 9); assert.equal(monitor.fault, null);
    const journal = monitor.export();
    assert.ok(journal.events.some(event => event.kind === 'center'));
    assert.ok(journal.events.some(event => event.kind === 'upgrade'));
    assert.equal(journal.map.towers.length, 10);
    assert.ok(journal.events.length <= 2048); assert.equal(journal.dropped, Math.max(0, monitor.eventCount - 2048));
    assert.ok(journal.events.every(event => journal.maps.some(map => map.version === event.mapVersion)));
});

test('20/60帧与2倍速真实八波看门狗结果一致，不按墙钟误报', () => {
    let expected;
    for (const options of [{ frameDeltaSeconds: 1 / 20 }, { frameDeltaSeconds: 1 / 60 }, { frameDeltaSeconds: 1 / 30, speedScale: 2 }]) {
        const monitor = new RouteDiagnostics();
        const result = replayFirstLevel({ ...options, traffic: TWO_LANE_TRAFFIC, routeDiagnostics: monitor });
        const actual = { waves: result.waveResults, seconds: result.combatSecondsByWave, gold: result.gold };
        if (!expected) expected = actual;
        else assert.deepEqual(actual, expected);
        assert.equal(monitor.fault, null);
    }
});

test('战斗中动态建塔同一步记格心/地图版本，承诺格保护与正常到出口不误报', () => {
    const model = new PlacementModel(grid, 100, PHASE_B_TOWERS);
    const combat = new WaveCombatRuntime(grid, PHASE_B_TOWERS, TWO_LANE_TRAFFIC);
    const monitor = new RouteDiagnostics();
    let seconds = 0;
    const ctx = () => ({ seconds, wave: 1, mapVersion: model.mapVersion, flow: model.flowField });
    monitor.reset(ctx(), model.deployments);
    model.observeMutations(event => monitor.placement(event, ctx(), model.deployments));
    combat.start({ wave: 1, groups: [{ enemy: CLOCKWORK_INFANTRY, count: 10, spawnIntervalSeconds: 0.3 }], clearReward: 0 });
    let built = false;
    for (let step = 0; step < 3600 && (!combat.isSpawningComplete || combat.enemies.length); step++) {
        seconds += 1 / 60;
        monitor.inspect(combat.enemies, ctx());
        const result = combat.tick(1 / 60, model.flowField, []);
        monitor.departed('killed', result.killed, ctx()); monitor.departed('leaked', result.leaked, ctx());
        monitor.inspect(combat.enemies, ctx());
        if (!built && seconds > 1.5) {
            const protectedCell = combat.enemies[0].toCell;
            assert.equal(model.preview(protectedCell, combat.enemyRouteStates()).accepted, false);
            const placement = model.commit(model.preview({ column: 4, row: 5 }, combat.enemyRouteStates()), combat.enemyRouteStates());
            assert.ok(placement.accepted); built = true;
        }
    }
    assert.equal(combat.totals.leaked, 10); assert.equal(monitor.fault, null);
    const journal = monitor.export();
    const build = journal.events.find(event => event.kind === 'build');
    assert.ok(journal.events.some(event => event.kind === 'center' && event.seq < build.seq && event.mapVersion === 0));
    assert.ok(journal.events.some(event => event.kind === 'center' && event.seq > build.seq && event.mapVersion === 1));
});
