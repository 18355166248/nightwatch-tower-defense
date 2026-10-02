const test = require('node:test');
const assert = require('node:assert/strict');
const { crowdNearCoincidentPairs, layoutEnemyCrowd, EnemyCrowdPresentation, CROWD_MAX_OFFSET } = require('../.test-dist/presentation/EnemyCrowdLayout.js');
const { enemyVisualOffset } = require('../.test-dist/presentation/UnitVisualMotion.js');

const enemy = (spawnOrder, progress = 0.5, fromCell = { column: 4, row: 2 }, toCell = { column: 4, row: 3 }) =>
    ({ id: `enemy-${spawnOrder}`, spawnOrder, progress, fromCell, toCell });

test('单个敌人沿用原稳定错位，源快照不变', () => {
    const source = Object.freeze([Object.freeze(enemy(1))]);
    const old = enemyVisualOffset(1, 1);
    assert.deepEqual(layoutEnemyCrowd(source).get('enemy-1'), { column: old.x, row: -old.y });
    assert.equal(source[0].progress, 0.5);
});

test('规则列号映射到四方向侧向显示，不再用出生序假装排队', () => {
    for(const [dx,dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
        const fromCell={column:4,row:3},toCell={column:4+dx,row:3+dy};
        const source=[{...enemy(1,0.5,fromCell,toCell),trafficLane:0},
            {...enemy(5,0.5,fromCell,toCell),trafficLane:1}];
        const offsets=layoutEnemyCrowd(source),a=offsets.get('enemy-1'),b=offsets.get('enemy-5');
        assert.ok(Math.abs(a.column*dx+a.row*dy)<1e-9);
        assert.ok(Math.abs(b.column*dx+b.row*dy)<1e-9);
        assert.ok(Math.hypot(a.column-b.column,a.row-b.row)>=0.45);
    }
});

test('相同旧槽位的两个敌人分离，输入顺序不影响结果', () => {
    const source = [enemy(1), enemy(5)];
    const layout = layoutEnemyCrowd(source);
    const a = layout.get('enemy-1');
    const b = layout.get('enemy-5');
    assert.ok(Math.hypot(a.column - b.column, a.row - b.row) > 0.35);
    assert.deepEqual(layoutEnemyCrowd(source.slice().reverse()), layout);
    assert.equal(crowdNearCoincidentPairs(source, layout), 0);
    assert.equal(crowdNearCoincidentPairs(source, new Map()), 1);
});

test('四方向端点和密集同点也不越过当前两格走廊，位移有界', () => {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        for (const progress of [0, 0.02, 0.5, 0.98, 1]) {
            const fromCell = { column: 4, row: 3 };
            const toCell = { column: 4 + dx, row: 3 + dy };
            const source = Array.from({ length: 40 }, (_, i) => enemy(i + 1, progress, fromCell, toCell));
            const layout = layoutEnemyCrowd(source);
            for (const e of source) {
                const offset = layout.get(e.id);
                const x = fromCell.column + dx * progress + offset.column;
                const y = fromCell.row + dy * progress + offset.row;
                assert.ok(Math.hypot(offset.column, offset.row) <= CROWD_MAX_OFFSET + 1e-9);
                assert.ok(x >= Math.min(fromCell.column, toCell.column) - CROWD_MAX_OFFSET - 1e-9);
                assert.ok(x <= Math.max(fromCell.column, toCell.column) + CROWD_MAX_OFFSET + 1e-9);
                assert.ok(y >= Math.min(fromCell.row, toCell.row) - CROWD_MAX_OFFSET - 1e-9);
                assert.ok(y <= Math.max(fromCell.row, toCell.row) + CROWD_MAX_OFFSET + 1e-9);
            }
        }
    }
});

test('暂停冻结、同一快照重绘幂等、尸影缓存保留、重开清零', () => {
    const view = new EnemyCrowdPresentation();
    const source = [enemy(1), enemy(5)];
    view.sample(source, 1);
    view.sample(source, 1.2);
    const a = { ...view.get('enemy-1') };
    view.sample(source, 1.2);
    assert.deepEqual(view.get('enemy-1'), a);
    view.sample([source[1]], 1.2);
    view.retain(new Set(['enemy-1', 'enemy-5']));
    assert.deepEqual(view.get('enemy-1'), a);
    view.retain(new Set(['enemy-5']));
    assert.equal(view.get('enemy-1'), undefined);
    view.sample([], 0);
    assert.equal(view.get('enemy-5'), undefined);
});

test('同一路径转弯不越墙，不用额外动画计时器', () => {
    const view = new EnemyCrowdPresentation();
    view.sample([enemy(1, 0.99), enemy(5, 0.99)], 1);
    view.sample([enemy(1, 0.99), enemy(5, 0.99)], 1.1);
    const source = [enemy(1, 0.01, { column: 4, row: 3 }, { column: 5, row: 3 }),
        enemy(5, 0.01, { column: 4, row: 3 }, { column: 5, row: 3 })];
    view.sample(source, 1.12);
    for (const e of source) assert.ok(Math.abs(view.get(e.id).row) <= CROWD_MAX_OFFSET);
    view.reset();
    assert.equal(view.get('enemy-1'), undefined);
});

test('固定目标在30/60帧下得到相同平滑结果，缩放不影响归一化偏移', () => {
    const source = [enemy(1), enemy(5)];
    const atRate = (fps) => {
        const view = new EnemyCrowdPresentation();
        view.sample(source, 1);
        for (let i = 1; i <= fps; i++) view.sample(source, 1 + i / fps);
        return view.get('enemy-1');
    };
    const a = atRate(30), b = atRate(60);
    assert.ok(Math.abs(a.column - b.column) < 1e-9);
    assert.ok(Math.abs(a.row - b.row) < 1e-9);
});

test('八波真实配置的脚点近重合减小，击杀、漏怪、生命与金钱不变', () => {
    const { replayFirstLevel } = require('./support/first-level-replay.cjs');
    const view = new EnemyCrowdPresentation();
    let seconds = 0, before = 0, after = 0;
    const result = replayFirstLevel({ onCombatStep({ deltaSeconds, enemies }) {
        seconds += deltaSeconds;
        const offsets = view.sample(enemies, seconds);
        before += crowdNearCoincidentPairs(enemies, new Map()) * deltaSeconds;
        after += crowdNearCoincidentPairs(enemies, offsets) * deltaSeconds;
        view.retain(new Set(enemies.map((e) => e.id)));
    } });
    assert.ok(before > 100);
    assert.ok(after < before * 0.1);
    assert.deepEqual(result.totals, { spawned: 213, killed: 212, leaked: 1 });
    assert.equal(result.coreHealth, 9);
    assert.equal(result.gold, 348);
});
