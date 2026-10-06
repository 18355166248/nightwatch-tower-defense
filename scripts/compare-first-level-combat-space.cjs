#!/usr/bin/env node

const { replayFirstLevel } = require('../tests/support/first-level-replay.cjs');
const { PHASE_A_GRIDS, DEFAULT_GRID_ID } = require('../.test-dist/config/PhaseAGrids.js');
const { FIRST_LEVEL_OPENING } = require('../.test-dist/config/FirstLevelOpening.js');
const { PHASE_B_TOWERS, PHASE_B_WAVE_ONE } = require('../.test-dist/config/PhaseBCombatConfig.js');
const { PlacementModel } = require('../.test-dist/systems/PlacementModel.js');
const { WaveCombatRuntime } = require('../.test-dist/systems/WaveCombatRuntime.js');

const grid = PHASE_A_GRIDS['grid-9x13'];
const legacyOpening = [
    [4, 2, 'rivet-gun'], [5, 2, 'rivet-gun'],
    [2, 2, 'frost-coil'], [3, 2, 'rivet-gun'],
].map(([column, row, towerId]) => ({ cell: { column, row }, towerId }));

function firstWaveSpace(opening, grid = PHASE_A_GRIDS[DEFAULT_GRID_ID]) {
    const model = new PlacementModel(grid, 140, PHASE_B_TOWERS);
    for (const { cell, towerId } of opening) {
        const preview = model.preview(cell, [], towerId);
        if (!preview.accepted || !model.commit(preview, []).accepted) {
            throw new Error(`开局不可建塔：${cell.column},${cell.row}`);
        }
    }
    const combat = new WaveCombatRuntime(grid, PHASE_B_TOWERS);
    combat.start(PHASE_B_WAVE_ONE);
    const killRows = [];
    let seconds = 0;
    let enemySecondsBelowRow5 = 0;
    while (seconds < 60 && (!combat.isSpawningComplete || combat.enemies.length > 0)) {
        const delta = 1 / 60;
        const result = combat.tick(delta, model.flowField, model.deployments);
        seconds += delta;
        for (const enemy of combat.enemies) {
            const row = enemy.fromCell.row + (enemy.toCell.row - enemy.fromCell.row) * enemy.progress;
            if (row >= 5) enemySecondsBelowRow5 += delta;
        }
        for (const enemy of result.killed) {
            killRows.push(enemy.fromCell.row + (enemy.toCell.row - enemy.fromCell.row) * enemy.progress);
        }
    }
    if (!combat.isSpawningComplete || combat.enemies.length > 0) throw new Error('首波回放超时');
    killRows.sort((a, b) => a - b);
    return {
        pathLength: model.flowField.distanceAt(grid.entry),
        killed: combat.totals.killed,
        leaked: combat.totals.leaked,
        medianKillRow: Number(killRows[Math.floor(killRows.length / 2)].toFixed(2)),
        enemySecondsBelowRow5: Number(enemySecondsBelowRow5.toFixed(2)),
        combatSeconds: Number(seconds.toFixed(2)),
    };
}

const currentRun = replayFirstLevel();
console.log(JSON.stringify({
    legacyFirstWave: firstWaveSpace(legacyOpening, grid),
    currentFirstWave: firstWaveSpace(FIRST_LEVEL_OPENING),
    currentFullRun: {
        waves: currentRun.waveResults.length,
        totals: currentRun.totals,
        coreHealth: currentRun.coreHealth,
        combatSeconds: Number(currentRun.combatSecondsByWave.reduce((sum, seconds) => sum + seconds, 0).toFixed(2)),
        pathLengthByWave: currentRun.telemetry.map(({ pathLength }) => pathLength),
        waveLeaks: currentRun.waveResults.map(({ leaked }) => leaked),
    },
}, null, 2));
