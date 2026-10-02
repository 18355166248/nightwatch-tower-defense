const test = require('node:test');
const assert = require('node:assert/strict');
const { layoutEnemyHealthBars, healthBarOverlapCount } = require('../.test-dist/presentation/EnemyHealthBarLayout.js');
const { compareEnemyGroundDepth } = require('../.test-dist/presentation/UnitVisualMotion.js');
const bounds = { left: -380, right: 380, bottom: -490, top: 606 };
const candidate = (order, overrides = {}) => ({ id: `enemy-${order}`, spawnOrder: order, x: 200, y: 100, width: 66, ratio: 0.6, ...overrides });

test('先画地面靠后的单位，出生晚不能覆盖前方身体；同点顺序稳定', () => {
    const source = [{ y: 0, spawnOrder: 1 }, { y: 100, spawnOrder: 3 }, { y: 100, spawnOrder: 2 }];
    assert.deepEqual([...source].sort(compareEnemyGroundDepth).map(v => v.spawnOrder), [2, 3, 1]);
    assert.equal(source[0].y, 0);
});

test('稀疏受伤血条保持原锚点，输入和生命值不被改写', () => {
    const source = [candidate(1), candidate(2, { y: -100 })];
    const copy = structuredClone(source);
    const bars = layoutEnemyHealthBars(source, bounds);
    assert.deepEqual(source, copy);
    assert.equal(healthBarOverlapCount(bars), 0);
    for (const bar of bars) { assert.equal(bar.x, bar.anchorX); assert.equal(bar.y, bar.anchorY); }
});

test('13只同点重甲的血条全部保留、局部避让，无重复位置和冲突', () => {
    const bars = layoutEnemyHealthBars(Array.from({ length: 13 }, (_, i) => candidate(i + 1)), bounds);
    assert.equal(bars.length, 13);
    assert.equal(healthBarOverlapCount(bars), 0);
    assert.equal(new Set(bars.map(bar => `${bar.x},${bar.y}`)).size, 13);
    assert.ok(bars.every(bar => Math.abs(bar.x - bar.anchorX) <= 74 && bar.y - bar.anchorY <= 44));
});

test('混编近邻受伤条按出生序确定布局，输入重排不改变结果', () => {
    const source = Array.from({ length: 12 }, (_, i) => candidate(i + 1, { x: i % 2 ? 212 : 190, y: 100 + i * 1.3, width: i % 3 ? 52 : 66 }));
    assert.deepEqual(layoutEnemyHealthBars(source, bounds), layoutEnemyHealthBars([...source].reverse(), bounds));
});

test('四边受伤提示和引线锚点都夹在棋盘内，极端拥挤仍保留真实血条并报告冲突', () => {
    for (const x of [-900, 900]) {
        for (const y of [-900, 900]) {
            const [bar] = layoutEnemyHealthBars([candidate(1, { x, y })], bounds);
            assert.ok(bar.x - bar.width / 2 >= bounds.left && bar.x + bar.width / 2 <= bounds.right);
            assert.ok(bar.y >= bounds.bottom && bar.y + 7 <= bounds.top);
            assert.ok(bar.anchorX >= bounds.left && bar.anchorX <= bounds.right
                && bar.anchorY >= bounds.bottom && bar.anchorY + 7 <= bounds.top);
        }
    }
    const source = Array.from({ length: 20 }, (_, i) => candidate(i + 1, { x: 900, y: 900 }));
    const bars = layoutEnemyHealthBars(source, bounds);
    assert.equal(bars.length, 20);
    assert.ok(healthBarOverlapCount(bars) > 0);
    for (const bar of bars) {
        assert.ok(bar.x - bar.width / 2 >= bounds.left && bar.x + bar.width / 2 <= bounds.right);
        assert.ok(bar.y >= bounds.bottom && bar.y + 7 <= bounds.top);
        assert.ok(bar.anchorX >= bounds.left && bar.anchorX <= bounds.right && bar.anchorY <= bounds.top);
    }
});

test('满血、已死亡、损坏几何不创建提示，损坏棋盘不产生NaN输出', () => {
    const bars = layoutEnemyHealthBars([candidate(1, { ratio: 1 }), candidate(2, { ratio: 0 }), candidate(3, { x: NaN }), candidate(4, { width: 1000 })], bounds);
    assert.deepEqual(bars, []);
    assert.deepEqual(layoutEnemyHealthBars([candidate(1)], { ...bounds, top: NaN }), []);
});
