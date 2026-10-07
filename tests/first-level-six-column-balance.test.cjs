const test = require('node:test');
const assert = require('node:assert/strict');
const { DEFAULT_GRID_ID, PHASE_A_GRIDS } = require('../.test-dist/config/PhaseAGrids.js');
const { FIRST_LEVEL_WAVE_BLUEPRINTS, PHASE_B_WAVES, CLOCKWORK_INFANTRY, IRON_CANISTER_HAULER } = require('../.test-dist/config/PhaseBCombatConfig.js');
const { FIRST_LEVEL_OPENING, FIRST_LEVEL_REINFORCEMENTS, FIRST_LEVEL_OPTIONAL_FORTIFICATIONS, FIRST_LEVEL_GUIDED_UPGRADES } = require('../.test-dist/config/FirstLevelOpening.js');
const { TWO_LANE_TRAFFIC } = require('../.test-dist/systems/EnemyTrafficRules.js');
const { replayFirstLevel } = require('./support/first-level-replay.cjs');
const { LEVELS } = require('../.test-dist/config/LevelCatalog.js');
const { PhaseBLayout } = require('../.test-dist/presentation/PhaseBLayout.js');

test('首关9列，入口和推荐塔位仍对齐，全部建议与可选塔位合法', () => {
    const grid = PHASE_A_GRIDS[DEFAULT_GRID_ID];
    assert.equal(grid.columns, 9); assert.equal(grid.rows, 13);
    for (const level of Object.values(LEVELS)) assert.equal(level.gridId, 'grid-9x13');
    const layout = new PhaseBLayout();
    for (const endpoint of [grid.entry, grid.exit]) {
        assert.equal(layout.gridPointCenter(endpoint, grid).x, 0);
        assert.equal(layout.routePointCenter(endpoint, grid).x, 0);
    }
    assert.equal(grid.entry.column, FIRST_LEVEL_OPENING[0].cell.column);
    for (const {cell} of [...FIRST_LEVEL_OPENING, ...FIRST_LEVEL_REINFORCEMENTS, ...FIRST_LEVEL_OPTIONAL_FORTIFICATIONS, ...FIRST_LEVEL_GUIDED_UPGRADES]) {
        assert.ok(cell.column >= 0 && cell.column < grid.columns && cell.row >= 0 && cell.row < grid.rows);
    }
    assert.equal(new Set([...FIRST_LEVEL_OPENING, ...FIRST_LEVEL_REINFORCEMENTS, ...FIRST_LEVEL_OPTIONAL_FORTIFICATIONS].map(x => `${x.cell.column},${x.cell.row}`)).size, 12);
});

test('前三波保留教学，后段强化速度和密度但不增加数量和奖励', () => {
    assert.equal(CLOCKWORK_INFANTRY.maxHealth, 85); assert.equal(IRON_CANISTER_HAULER.maxHealth, 320);
    PHASE_B_WAVES.forEach((wave, i) => {
        const base = FIRST_LEVEL_WAVE_BLUEPRINTS[i];
        assert.equal(wave.clearReward, base.clearReward);
        wave.groups.forEach((group, j) => {
            const before = base.groups[j];
            assert.equal(group.count, before.count); assert.equal(group.spawnIntervalSeconds, before.spawnIntervalSeconds * (i >= 5 ? 0.8 : 1));
            assert.equal(group.enemy.speedCellsPerSecond, before.enemy.speedCellsPerSecond * (i >= 5 ? 1.5 : 1));
            assert.equal(group.enemy.killReward, before.enemy.killReward);
            assert.equal(group.enemy.maxHealth, i < 3 ? before.enemy.maxHealth : Math.round(before.enemy.maxHealth * (i >= 5 ? 1.25 : 1.05)));
        });
    });
});

test('真实双列回放保留前三波教学，试调增加压力但推荐构筑仍可胜', () => {
    const before = replayFirstLevel({traffic:TWO_LANE_TRAFFIC,waves:FIRST_LEVEL_WAVE_BLUEPRINTS});
    const after = replayFirstLevel({traffic:TWO_LANE_TRAFFIC});
    assert.deepEqual(after.waveResults.slice(0,3), before.waveResults.slice(0,3));
    assert.equal(before.coreHealth,9);
    const passive = replayFirstLevel({traffic:TWO_LANE_TRAFFIC,upgradesAfterWave:[]});
    const oldPassive = replayFirstLevel({traffic:TWO_LANE_TRAFFIC,waves:FIRST_LEVEL_WAVE_BLUEPRINTS,upgradesAfterWave:[]});
    assert.ok(oldPassive.coreHealth > 0); assert.equal(passive.coreHealth,0); assert.equal(after.coreHealth,9);
    assert.equal(after.waveResults.length,8);
    assert.equal(after.totals.spawned,213);
    assert.deepEqual(after.telemetry.map(x=>x.pathLength),before.telemetry.map(x=>x.pathLength));
    const failure = replayFirstLevel({opening: FIRST_LEVEL_OPENING.slice(0,2),reinforcements:[],upgradesAfterWave:[],traffic:TWO_LANE_TRAFFIC});
    assert.equal(failure.coreHealth,0); assert.equal(failure.totals.leaked,10);
});
