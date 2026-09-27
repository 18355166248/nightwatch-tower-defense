#!/usr/bin/env node

// 始终读取当前配置；只做规则回放，不把历史候选误标为当前发布数值。
const { replayFirstLevel } = require('../tests/support/first-level-replay.cjs');
const { standardLayout } = require('../tests/support/first-level-strategies.cjs');
const { PHASE_B_TOWERS } = require('../.test-dist/config/PhaseBCombatConfig.js');

const noPulseTowers = PHASE_B_TOWERS.map((tower) => tower.id === 'frost-coil'
    ? {
        ...tower,
        effect: { ...tower.effect, pulseRadiusCells: 0 },
        upgrade: { ...tower.upgrade, effect: { ...tower.upgrade.effect, pulseRadiusCells: 0 } },
        finalUpgrade: { ...tower.finalUpgrade, effect: { ...tower.finalUpgrade.effect, pulseRadiusCells: 0 } },
    }
    : tower);

for (const row of [2, 3]) {
    const layout = standardLayout(row);
    const extraGuns = [{ column: 7, row: 3 }, { column: 7, row: 4 }]
        .map((cell) => ({ afterWave: 6, cell, towerId: 'rivet-gun' }));
    for (const [strategy, plan, towers] of [
        ['混合+脉冲', layout.mixed, PHASE_B_TOWERS],
        ['纯机枪近等预算', layout.pure, PHASE_B_TOWERS],
        ['混合但只减速单体', layout.mixed, noPulseTowers],
        // 补塔反例与标准布防复用同一路线，专门观察后段收入能否绕过局长下界。
        ...(row === 2 ? [['混合+脉冲+两座后段机枪', {
            ...layout.mixed,
            reinforcements: [...layout.mixed.reinforcements, ...extraGuns],
        }, PHASE_B_TOWERS]] : []),
    ]) {
        const result = replayFirstLevel({ ...plan, towers });
        const combatSeconds = result.telemetry.reduce((sum, wave) => sum + wave.combatSeconds, 0);
        const emptySpawnSeconds = result.telemetry.reduce((sum, wave) => sum + wave.emptySpawnSeconds, 0);
        console.log(JSON.stringify({ layoutRow: row, strategy, waveReached: result.waveResults.at(-1)?.wave,
            spawned: result.totals.spawned, leaked: result.totals.leaked, core: result.coreHealth,
            investment: result.telemetry.at(-1)?.towerInvestment,
            combatSeconds: Number(combatSeconds.toFixed(1)),
            naturalCountdownSeconds: result.waveResults.length === 8 ? 56 : null,
            freeModeSeconds: result.waveResults.length === 8 ? Number((combatSeconds + 56).toFixed(1)) : null,
            emptySpawnSeconds: Number(emptySpawnSeconds.toFixed(1)),
            peakEnemies: Math.max(...result.telemetry.map((wave) => wave.peakActiveEnemies)),
            gold: result.gold, wave5to8Leaks: result.waveResults.slice(4).map(({ leaked }) => leaked),
            path: result.pathCells.map(({ column, row: pathRow }) => `${column},${pathRow}`) }));
    }
}
