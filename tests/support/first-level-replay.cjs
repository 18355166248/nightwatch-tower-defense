const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const { PHASE_A_GRIDS } = require('../../.test-dist/config/PhaseAGrids.js');
const { FIRST_LEVEL_OPENING, FIRST_LEVEL_REINFORCEMENTS, FIRST_LEVEL_STARTING_GOLD } = require('../../.test-dist/config/FirstLevelOpening.js');
const { PHASE_B_TOWERS, PHASE_B_WAVES } = require('../../.test-dist/config/PhaseBCombatConfig.js');
const { cellKey } = require('../../.test-dist/core/GridTypes.js');
const { EconomyLedger } = require('../../.test-dist/systems/EconomyLedger.js');
const { PlacementModel } = require('../../.test-dist/systems/PlacementModel.js');
const { SimulationClock } = require('../../.test-dist/systems/SimulationClock.js');
const { WaveCombatRuntime } = require('../../.test-dist/systems/WaveCombatRuntime.js');
const { WaveRewardRuntime } = require('../../.test-dist/systems/WaveRewardRuntime.js');

const fixtures = JSON.parse(readFileSync(resolve(__dirname, '../../docs/poc/phase-a-fixtures.json'), 'utf8'));

function replayFirstLevel({
    opening = FIRST_LEVEL_OPENING,
    reinforcements = FIRST_LEVEL_REINFORCEMENTS,
    waves = PHASE_B_WAVES,
    towers = PHASE_B_TOWERS,
    frameDeltaSeconds = 1 / 30,
    speedScale = 1,
} = {}) {
    const grid = PHASE_A_GRIDS['grid-9x13'];
    const shortCells = fixtures.fixtures.find((item) => item.gridId === 'grid-9x13').shortFold.towerCells
        .map(([column, row]) => ({ column, row }));
    const economy = new EconomyLedger(FIRST_LEVEL_STARTING_GOLD);
    const model = new PlacementModel(grid, economy, towers);
    const combat = new WaveCombatRuntime(grid, towers);
    const clock = new SimulationClock();
    if (speedScale === 2) clock.cycleScale();
    const rewards = new WaveRewardRuntime();
    for (const cell of shortCells) {
        const towerId = opening.find((item) => cellKey(item.cell) === cellKey(cell))?.towerId;
        if (!towerId) throw new Error(`开局缺少塔位 ${cellKey(cell)}`);
        const preview = model.preview(cell, [], towerId);
        if (!preview.accepted || !model.commit(preview, []).accepted) throw new Error(`开局不能建塔 ${cellKey(cell)}`);
    }

    let coreHealth = 10;
    let nextBuild = 0;
    const waveResults = [];
    const telemetry = [];
    for (const wave of waves) {
        combat.start(wave);
        let killed = 0;
        let leaked = 0;
        let spawnSeconds = 0;
        let combatSeconds = 0;
        let peakActiveEnemies = 0;
        const shotsByTower = { 'rivet-gun': 0, 'frost-coil': 0 };
        const frostShotsByCell = {};
        let slowApplications = 0;
        for (let elapsed = 0; elapsed < 180 && (!combat.isSpawningComplete || combat.enemies.length > 0); elapsed += frameDeltaSeconds) {
            clock.advance(frameDeltaSeconds, (deltaSeconds) => {
                if (combat.isSpawningComplete && combat.enemies.length === 0) return;
                combatSeconds += deltaSeconds;
                if (!combat.isSpawningComplete) spawnSeconds += deltaSeconds;
                const result = combat.tick(deltaSeconds, model.flowField, model.deployments);
                for (const shot of result.shots) {
                    shotsByTower[shot.towerId] += 1;
                    if (shot.appliedSlow) {
                        slowApplications += 1;
                        const key = cellKey(shot.towerCell);
                        frostShotsByCell[key] = (frostShotsByCell[key] ?? 0) + 1;
                    }
                }
                killed += result.killed.length;
                leaked += result.leaked.length;
                peakActiveEnemies = Math.max(peakActiveEnemies, combat.enemies.length);
                result.killed.forEach((enemy) => economy.credit(enemy.archetype.killReward));
            });
        }
        if (!combat.isSpawningComplete || combat.enemies.length > 0) throw new Error(`第 ${wave.wave} 波超时，不能伪造清场`);
        combat.completeWave();
        coreHealth = Math.max(0, coreHealth - leaked);
        if (coreHealth > 0) {
            rewards.settle(wave, economy);
            while (nextBuild < reinforcements.length) {
                const candidate = reinforcements[nextBuild];
                const preview = model.preview(candidate.cell, [], candidate.towerId);
                if (!preview.accepted && preview.reason === 'insufficient-gold') break;
                if (!preview.accepted || !model.commit(preview, []).accepted) throw new Error(`补塔失败 ${cellKey(candidate.cell)}`);
                nextBuild += 1;
            }
        }
        waveResults.push({ wave: wave.wave, killed, leaked, coreHealth, towers: model.towers.size });
        telemetry.push({ wave: wave.wave, spawnSeconds, combatSeconds, peakActiveEnemies, shotsByTower, frostShotsByCell, slowApplications, gold: model.gold,
            pathLength: model.flowField.distanceAt(grid.entry), towerInvestment: model.deployments.reduce((sum, deployment) =>
                sum + towers.find((tower) => tower.id === deployment.towerId).cost, 0) });
        if (coreHealth === 0) break;
    }
    return {
        waveResults,
        spawnSecondsByWave: telemetry.map(({ spawnSeconds }) => spawnSeconds),
        combatSecondsByWave: telemetry.map(({ combatSeconds }) => combatSeconds),
        telemetry,
        coreHealth,
        towers: model.towers.size,
        gold: model.gold,
        totals: combat.totals,
        deployments: model.deployments,
        pathCells: model.flowField.pathFrom(grid.entry),
    };
}

module.exports = { replayFirstLevel };
