// 对照使用真实规则和购买预算；结果是固定构筑回放，不能当作真人胜率。
const { replayFirstLevel } = require('../tests/support/first-level-replay.cjs');
const { PHASE_A_GRIDS } = require('../.test-dist/config/PhaseAGrids.js');
const { FIRST_LEVEL_WAVE_BLUEPRINTS, PHASE_B_WAVES } = require('../.test-dist/config/PhaseBCombatConfig.js');
const { FIRST_LEVEL_OPENING, FIRST_LEVEL_GUIDED_UPGRADES, FIRST_LEVEL_REINFORCEMENTS } = require('../.test-dist/config/FirstLevelOpening.js');
const { TWO_LANE_TRAFFIC } = require('../.test-dist/systems/EnemyTrafficRules.js');
const shiftBack = item => ({ ...item, cell: { ...item.cell, column: item.cell.column + 2 } });
// 旧八列版的入口、教学塔位与后段1.12倍血量全部显式冻结，避免用新塔位冒充旧基线。
const previousWaves = FIRST_LEVEL_WAVE_BLUEPRINTS.map(wave => wave.wave < 4 ? wave : ({ ...wave,
    groups: wave.groups.map(group => ({ ...group, enemy: { ...group.enemy, maxHealth: Math.round(group.enemy.maxHealth * 1.12) } })) }));
for (const [name, grid, opening, reinforcements, upgrades, waves] of [
    ['previous-eight-columns', PHASE_A_GRIDS['grid-8x13'], FIRST_LEVEL_OPENING.map(shiftBack), FIRST_LEVEL_REINFORCEMENTS.map(shiftBack), FIRST_LEVEL_GUIDED_UPGRADES.map(shiftBack), previousWaves],
    ['six-columns', PHASE_A_GRIDS['grid-6x13'], FIRST_LEVEL_OPENING, FIRST_LEVEL_REINFORCEMENTS, FIRST_LEVEL_GUIDED_UPGRADES, PHASE_B_WAVES],
]) {
    for (const policy of ['guided', 'no-upgrades', 'opening-only']) {
        const result = replayFirstLevel({ grid, opening, waves, traffic: TWO_LANE_TRAFFIC,
            reinforcements: policy === 'opening-only' ? [] : reinforcements,
            upgradesAfterWave: policy === 'guided' ? upgrades : [] });
        console.log(JSON.stringify({ name, policy, coreHealth: result.coreHealth, waves: result.waveResults.length,
            leaks: result.waveResults.map(wave => wave.leaked), gold: result.gold,
            combatSeconds: +result.combatSecondsByWave.reduce((a, b) => a + b, 0).toFixed(1),
            pathLengths: result.telemetry.map(wave => wave.pathLength) }));
    }
}
