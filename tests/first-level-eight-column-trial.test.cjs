const test = require('node:test');
const assert = require('node:assert/strict');
const { DEFAULT_GRID_ID, PHASE_A_GRIDS } = require('../.test-dist/config/PhaseAGrids.js');
const { FIRST_LEVEL_WAVE_BLUEPRINTS, PHASE_B_WAVES, CLOCKWORK_INFANTRY, IRON_CANISTER_HAULER } = require('../.test-dist/config/PhaseBCombatConfig.js');
const { FIRST_LEVEL_OPENING, FIRST_LEVEL_REINFORCEMENTS, FIRST_LEVEL_OPTIONAL_FORTIFICATIONS, FIRST_LEVEL_GUIDED_UPGRADES } = require('../.test-dist/config/FirstLevelOpening.js');
const { TWO_LANE_TRAFFIC } = require('../.test-dist/systems/EnemyTrafficRules.js');
const { replayFirstLevel } = require('./support/first-level-replay.cjs');

test('首关8列，入口和推荐塔位仍对齐，全部建议与可选塔位合法', () => {
    const grid = PHASE_A_GRIDS[DEFAULT_GRID_ID];
    assert.equal(grid.columns, 8); assert.equal(grid.rows, 13);
    assert.equal(grid.entry.column, FIRST_LEVEL_OPENING[0].cell.column);
    for (const {cell} of [...FIRST_LEVEL_OPENING, ...FIRST_LEVEL_REINFORCEMENTS, ...FIRST_LEVEL_OPTIONAL_FORTIFICATIONS, ...FIRST_LEVEL_GUIDED_UPGRADES]) {
        assert.ok(cell.column >= 0 && cell.column < grid.columns && cell.row >= 0 && cell.row < grid.rows);
    }
    assert.equal(new Set([...FIRST_LEVEL_OPENING, ...FIRST_LEVEL_REINFORCEMENTS, ...FIRST_LEVEL_OPTIONAL_FORTIFICATIONS].map(x => `${x.cell.column},${x.cell.row}`)).size, 12);
});

test('只提高第4波之后的生命，不修改教学、波次数量、速度、赏金或共享原型', () => {
    assert.equal(CLOCKWORK_INFANTRY.maxHealth, 85); assert.equal(IRON_CANISTER_HAULER.maxHealth, 320);
    PHASE_B_WAVES.forEach((wave, i) => {
        const base = FIRST_LEVEL_WAVE_BLUEPRINTS[i];
        assert.equal(wave.clearReward, base.clearReward);
        wave.groups.forEach((group, j) => {
            const before = base.groups[j];
            assert.equal(group.count, before.count); assert.equal(group.spawnIntervalSeconds, before.spawnIntervalSeconds);
            assert.equal(group.enemy.speedCellsPerSecond, before.enemy.speedCellsPerSecond);
            assert.equal(group.enemy.killReward, before.enemy.killReward);
            assert.equal(group.enemy.maxHealth, i < 3 ? before.enemy.maxHealth : Math.round(before.enemy.maxHealth * 1.12));
        });
    });
});

test('真实双列回放保留前三波教学，试调增加压力但推荐构筑仍可胜', () => {
    const before = replayFirstLevel({traffic:TWO_LANE_TRAFFIC,waves:FIRST_LEVEL_WAVE_BLUEPRINTS});
    const after = replayFirstLevel({traffic:TWO_LANE_TRAFFIC});
    assert.deepEqual(after.waveResults.slice(0,3), before.waveResults.slice(0,3));
    assert.equal(before.coreHealth,9); assert.equal(after.coreHealth,7);
    assert.equal(after.waveResults.length,8);
    assert.equal(after.totals.spawned,213);
    assert.deepEqual(after.telemetry.map(x=>x.pathLength),before.telemetry.map(x=>x.pathLength));
    const failure = replayFirstLevel({opening: FIRST_LEVEL_OPENING.slice(0,2),reinforcements:[],upgradesAfterWave:[],traffic:TWO_LANE_TRAFFIC});
    assert.equal(failure.coreHealth,0); assert.equal(failure.totals.leaked,10);
});
