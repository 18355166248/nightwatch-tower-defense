#!/usr/bin/env node

const { replayFirstLevel } = require('../tests/support/first-level-replay.cjs');
const { PHASE_A_GRIDS } = require('../.test-dist/config/PhaseAGrids.js');
const { cellKey } = require('../.test-dist/core/GridTypes.js');
const { FlowField } = require('../.test-dist/systems/FlowField.js');
const {
    FIRST_LEVEL_OPENING,
    FIRST_LEVEL_REINFORCEMENTS,
    FIRST_LEVEL_OPTIONAL_FORTIFICATIONS,
} = require('../.test-dist/config/FirstLevelOpening.js');

const allRivets = (plan) => plan.map((entry) => ({ ...entry, towerId: 'rivet-gun' }));
const thirdFrost = FIRST_LEVEL_REINFORCEMENTS.map((entry, index) => index === 5
    ? { ...entry, towerId: 'frost-coil' }
    : entry);
const compactBottom = FIRST_LEVEL_REINFORCEMENTS.map((entry, index) => {
    const cells = [{ column: 7, row: 9 }, { column: 6, row: 10 }];
    return index >= 4 ? { ...entry, cell: cells[index - 4] } : entry;
});
const productiveOptional = { cell: { column: 7, row: 11 }, towerId: 'rivet-gun' };

const variants = [
    ['教学混合+升级', { opening: FIRST_LEVEL_OPENING, reinforcements: FIRST_LEVEL_REINFORCEMENTS }],
    ['教学混合不升级', { opening: FIRST_LEVEL_OPENING, reinforcements: FIRST_LEVEL_REINFORCEMENTS, upgradesAfterWave: [] }],
    ['纯机枪同格+升级', { opening: allRivets(FIRST_LEVEL_OPENING), reinforcements: allRivets(FIRST_LEVEL_REINFORCEMENTS) }],
    ['纯机枪加固+升级', { opening: allRivets(FIRST_LEVEL_OPENING), reinforcements: allRivets([...FIRST_LEVEL_REINFORCEMENTS, FIRST_LEVEL_OPTIONAL_FORTIFICATIONS[0]]) }],
    ['三冷凝混合+升级', { opening: FIRST_LEVEL_OPENING, reinforcements: thirdFrost }],
    ['紧凑下排混合+升级', { opening: FIRST_LEVEL_OPENING, reinforcements: compactBottom }],
    ['紧凑下排纯机枪+升级', { opening: allRivets(FIRST_LEVEL_OPENING), reinforcements: allRivets(compactBottom) }],
    ['紧凑下排纯机枪加固+升级', { opening: allRivets(FIRST_LEVEL_OPENING), reinforcements: allRivets([...compactBottom, productiveOptional]) }],
];

for (const [name, plan] of variants) {
    const result = replayFirstLevel(plan);
    const shotsByCell = result.telemetry.reduce((total, wave) => {
        for (const [cell, shots] of Object.entries(wave.shotsByCell)) total[cell] = (total[cell] ?? 0) + shots;
        return total;
    }, {});
    const grid = PHASE_A_GRIDS['grid-9x13'];
    const blocked = new Set(result.deployments.map(({ cell }) => cellKey(cell)));
    const currentPath = result.pathCells.map(cellKey).join('|');
    const routeSensitiveCells = result.deployments.flatMap(({ cell }) => {
        const key = cellKey(cell);
        const without = new Set(blocked);
        without.delete(key);
        const path = new FlowField(grid, without).pathFrom(grid.entry);
        return path?.map(cellKey).join('|') === currentPath ? [] : [key];
    });
    console.log(JSON.stringify({
        name,
        wavesPlayed: result.waveResults.length,
        coreHealth: result.coreHealth,
        totals: result.totals,
        finalInvestment: result.telemetry.at(-1)?.towerInvestment,
        finalPathLength: result.telemetry.at(-1)?.pathLength,
        finalPath: result.pathCells.map(({ column, row }) => `${column},${row}`),
        // 零开火不等于无用：迷宫墙可能靠封住另一侧路线，让后续火力区实际接敌。
        zeroShotTowerCells: result.deployments.map(({ cell }) => cellKey(cell)).filter((cell) => !shotsByCell[cell]),
        routeSensitiveCells,
        wave5to8Leaks: result.waveResults.filter(({ wave }) => wave >= 5).reduce((sum, { leaked }) => sum + leaked, 0),
        waves: result.waveResults.map((wave, index) => ({
            ...wave,
            investment: result.telemetry[index].towerInvestment,
            gold: result.telemetry[index].gold,
            path: result.telemetry[index].pathLength,
            peak: result.telemetry[index].peakActiveEnemies,
            shots: result.telemetry[index].shotsByTower,
            slows: result.telemetry[index].slowApplications,
            frostCells: result.telemetry[index].frostShotsByCell,
            seconds: Number(result.telemetry[index].combatSeconds.toFixed(1)),
        })),
    }));
}
