#!/usr/bin/env node

const { replayFirstLevel } = require('../tests/support/first-level-replay.cjs');
const {
    FIRST_LEVEL_OPENING,
    FIRST_LEVEL_REINFORCEMENTS,
    FIRST_LEVEL_OPTIONAL_FORTIFICATIONS,
} = require('../.test-dist/config/FirstLevelOpening.js');

const allRivets = (plan) => plan.map(({ cell }) => ({ cell, towerId: 'rivet-gun' }));
const thirdFrost = FIRST_LEVEL_REINFORCEMENTS.map((entry, index) => index === 5
    ? { cell: entry.cell, towerId: 'frost-coil' }
    : entry);
const productiveBottom = FIRST_LEVEL_REINFORCEMENTS.map((entry, index) => {
    const cells = [{ column: 7, row: 8 }, { column: 6, row: 8 }, { column: 7, row: 10 }];
    return index >= 4 ? { cell: cells[index - 4], towerId: entry.towerId } : entry;
});
const productiveOptional = { cell: { column: 7, row: 11 }, towerId: 'rivet-gun' };

const variants = [
    ['教学混合+升级', { opening: FIRST_LEVEL_OPENING, reinforcements: FIRST_LEVEL_REINFORCEMENTS }],
    ['教学混合不升级', { opening: FIRST_LEVEL_OPENING, reinforcements: FIRST_LEVEL_REINFORCEMENTS, upgradesAfterWave: [] }],
    ['纯机枪同格+升级', { opening: allRivets(FIRST_LEVEL_OPENING), reinforcements: allRivets(FIRST_LEVEL_REINFORCEMENTS) }],
    ['纯机枪加固+升级', { opening: allRivets(FIRST_LEVEL_OPENING), reinforcements: allRivets([...FIRST_LEVEL_REINFORCEMENTS, FIRST_LEVEL_OPTIONAL_FORTIFICATIONS[0]]) }],
    ['三冷凝混合+升级', { opening: FIRST_LEVEL_OPENING, reinforcements: thirdFrost }],
    ['有效下排混合+升级', { opening: FIRST_LEVEL_OPENING, reinforcements: productiveBottom }],
    ['有效下排纯机枪+升级', { opening: allRivets(FIRST_LEVEL_OPENING), reinforcements: allRivets(productiveBottom) }],
    ['有效下排纯机枪加固+升级', { opening: allRivets(FIRST_LEVEL_OPENING), reinforcements: allRivets([...productiveBottom, productiveOptional]) }],
];

for (const [name, plan] of variants) {
    const result = replayFirstLevel(plan);
    console.log(JSON.stringify({
        name,
        wavesPlayed: result.waveResults.length,
        coreHealth: result.coreHealth,
        totals: result.totals,
        finalInvestment: result.telemetry.at(-1)?.towerInvestment,
        finalPathLength: result.telemetry.at(-1)?.pathLength,
        finalPath: result.pathCells.map(({ column, row }) => `${column},${row}`),
        wave5to8Leaks: result.waveResults.filter(({ wave }) => wave >= 5).reduce((sum, { leaked }) => sum + leaked, 0),
        waves: result.waveResults.map((wave, index) => ({
            ...wave,
            investment: result.telemetry[index].towerInvestment,
            path: result.telemetry[index].pathLength,
            peak: result.telemetry[index].peakActiveEnemies,
            shots: result.telemetry[index].shotsByTower,
            slows: result.telemetry[index].slowApplications,
            frostCells: result.telemetry[index].frostShotsByCell,
            seconds: Number(result.telemetry[index].combatSeconds.toFixed(1)),
        })),
    }));
}
