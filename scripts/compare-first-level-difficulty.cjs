// 只运行真实规则模型，不注入金币；对照不是玩家胜率，也不代替普通浏览器试玩。
const { replayFirstLevel } = require('../tests/support/first-level-replay.cjs');
const { PHASE_A_GRIDS } = require('../.test-dist/config/PhaseAGrids.js');
const { PHASE_B_TOWERS, FIRST_LEVEL_WAVE_BLUEPRINTS: PHASE_B_WAVES } = require('../.test-dist/config/PhaseBCombatConfig.js');
const { FIRST_LEVEL_GUIDED_UPGRADES, FIRST_LEVEL_REINFORCEMENTS } = require('../.test-dist/config/FirstLevelOpening.js');
const { TWO_LANE_TRAFFIC } = require('../.test-dist/systems/EnemyTrafficRules.js');
function run(grid, waves, towers, policy) {
    const result = replayFirstLevel({ grid, waves, towers, traffic: TWO_LANE_TRAFFIC,
        upgradesAfterWave: policy === 'no-upgrades' ? [] : FIRST_LEVEL_GUIDED_UPGRADES,
        reinforcements: FIRST_LEVEL_REINFORCEMENTS });
    return { core: result.coreHealth, waves: result.waveResults.length,
        leaks: result.waveResults.map(w => w.leaked), gold: result.gold,
        seconds: +result.combatSecondsByWave.reduce((a, b) => a + b, 0).toFixed(1),
        path: result.telemetry.map(w => w.pathLength) };
}
const candidates = [
    { name: 'original-9', grid: PHASE_A_GRIDS['grid-9x13'], hp: 1, damage: 1 },
    { name: 'grid-8-entry-shifted', grid: { ...PHASE_A_GRIDS['grid-8x13'], entry: { column: 3, row: 0 }, exit: { column: 3, row: 12 } }, hp: 1, damage: 1 },
    { name: 'grid-8-aligned', grid: { ...PHASE_A_GRIDS['grid-8x13'], entry: { column: 4, row: 0 }, exit: { column: 4, row: 12 } }, hp: 1, damage: 1 },
    ...[1.1, 1.12, 1.15, 1.25, 1.35].map(hp => ({ name: `grid-8-aligned-late-hp-${hp}`, grid: { ...PHASE_A_GRIDS['grid-8x13'], entry: { column: 4, row: 0 }, exit: { column: 4, row: 12 } }, hp, damage: 1 })),
    ...[1.3, 1.5, 1.8].map(last => ({ name: `grid-8-curve-${last}`, grid: { ...PHASE_A_GRIDS['grid-8x13'], entry: { column: 4, row: 0 }, exit: { column: 4, row: 12 } }, hp: [1, 1, 1, 1.1, 1.15, 1.25, last, last], damage: 1 })),
    { name: 'grid-8-damage-85%', grid: { ...PHASE_A_GRIDS['grid-8x13'], entry: { column: 4, row: 0 }, exit: { column: 4, row: 12 } }, hp: 1, damage: .85 },
];
for (const candidate of candidates) {
    const waves = PHASE_B_WAVES.map(w => ({ ...w, groups: w.groups.map(g => ({ ...g,
        enemy: { ...g.enemy, maxHealth: Math.round(g.enemy.maxHealth * (Array.isArray(candidate.hp) ? candidate.hp[w.wave - 1] : w.wave >= 4 ? candidate.hp : 1)) } })) }));
    const towers = PHASE_B_TOWERS.map(t => ({ ...t, damage: t.damage * candidate.damage,
        upgrade: { ...t.upgrade, damage: t.upgrade.damage * candidate.damage },
        finalUpgrade: { ...t.finalUpgrade, damage: t.finalUpgrade.damage * candidate.damage } }));
    for (const policy of ['guided', 'no-upgrades']) {
        try { console.log(JSON.stringify({ candidate: candidate.name, policy, ...run(candidate.grid, waves, towers, policy) })); }
        catch (error) { console.log(JSON.stringify({ candidate: candidate.name, policy, error: error.message })); }
    }
}
