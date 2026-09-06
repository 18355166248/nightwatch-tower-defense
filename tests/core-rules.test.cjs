const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const { PHASE_A_GRIDS } = require('../.test-dist/config/PhaseAGrids.js');
const { cellKey } = require('../.test-dist/core/GridTypes.js');
const { FlowField } = require('../.test-dist/systems/FlowField.js');
const { PlacementModel } = require('../.test-dist/systems/PlacementModel.js');
const { simulateNoDamageRoute } = require('../.test-dist/systems/RouteSimulation.js');

const fixtures = JSON.parse(readFileSync(resolve(__dirname, '../docs/poc/phase-a-fixtures.json'), 'utf8'));

function toCells(pairs) {
    return pairs.map(([column, row]) => ({ column, row }));
}

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
