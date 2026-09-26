const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const { PHASE_A_GRIDS } = require('../../.test-dist/config/PhaseAGrids.js');
const { FIRST_LEVEL_GUIDED_UPGRADES, FIRST_LEVEL_OPENING, FIRST_LEVEL_REINFORCEMENTS, FIRST_LEVEL_STARTING_GOLD } = require('../../.test-dist/config/FirstLevelOpening.js');
const { PHASE_B_TOWERS, PHASE_B_WAVES } = require('../../.test-dist/config/PhaseBCombatConfig.js');
const { cellKey } = require('../../.test-dist/core/GridTypes.js');
const { EconomyLedger } = require('../../.test-dist/systems/EconomyLedger.js');
const { PlacementModel } = require('../../.test-dist/systems/PlacementModel.js');
const { SimulationClock } = require('../../.test-dist/systems/SimulationClock.js');
const { WaveCombatRuntime } = require('../../.test-dist/systems/WaveCombatRuntime.js');
const { WaveRewardRuntime } = require('../../.test-dist/systems/WaveRewardRuntime.js');
const { towerInvestment } = require('../../.test-dist/systems/TowerLevelRules.js');

const fixtures = JSON.parse(readFileSync(resolve(__dirname, '../../docs/poc/phase-a-fixtures.json'), 'utf8'));

function replayFirstLevel({
    opening = FIRST_LEVEL_OPENING,
    openingCells = null,
    reinforcements = FIRST_LEVEL_REINFORCEMENTS,
    waves = PHASE_B_WAVES,
    towers = PHASE_B_TOWERS,
    upgradesAfterWave = FIRST_LEVEL_GUIDED_UPGRADES,
    frameDeltaSeconds = 1 / 30,
    speedScale = 1,
} = {}) {
    const grid = PHASE_A_GRIDS['grid-9x13'];
    const shortCells = openingCells ?? fixtures.fixtures.find((item) => item.gridId === 'grid-9x13').shortFold.towerCells
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
        let emptySpawnSeconds = 0;
        let multiEnemySeconds = 0;
        let peakActiveEnemies = 0;
        const shotsByTower = { 'rivet-gun': 0, 'frost-coil': 0 };
        const shotsByCell = {};
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
                    const key = cellKey(shot.towerCell);
                    shotsByCell[key] = (shotsByCell[key] ?? 0) + 1;
                    if (shot.appliedSlow) {
                        slowApplications += shot.slowedEnemyIds?.length ?? 1;
                        frostShotsByCell[key] = (frostShotsByCell[key] ?? 0) + 1;
                    }
                }
                killed += result.killed.length;
                leaked += result.leaked.length;
                // 分别记录刷怪未完时的空场等待和多敌同屏，局长变长不等于玩家有事可做。
                if (!combat.isSpawningComplete && combat.enemies.length === 0) emptySpawnSeconds += deltaSeconds;
                if (combat.enemies.length >= 2) multiEnemySeconds += deltaSeconds;
                peakActiveEnemies = Math.max(peakActiveEnemies, combat.enemies.length);
                result.killed.forEach((enemy) => economy.credit(enemy.archetype.killReward));
            });
        }
        if (!combat.isSpawningComplete || combat.enemies.length > 0) throw new Error(`第 ${wave.wave} 波超时，不能伪造清场`);
        combat.completeWave();
        coreHealth = Math.max(0, coreHealth - leaked);
        if (coreHealth > 0) {
            rewards.settle(wave, economy);
            for (const upgrade of upgradesAfterWave.filter(({ wave: afterWave }) => afterWave === wave.wave)) {
                const result = model.upgrade(upgrade.cell);
                if (!result.accepted) throw new Error(`升级失败 ${cellKey(upgrade.cell)}：${result.reason}`);
                if (upgrade.targetLevel && result.level !== upgrade.targetLevel) {
                    throw new Error(`升级目标不符 ${cellKey(upgrade.cell)}：Lv${result.level}`);
                }
            }
            while (nextBuild < reinforcements.length) {
                const candidate = reinforcements[nextBuild];
                if ((candidate.afterWave ?? 0) > wave.wave) break;
                const preview = model.preview(candidate.cell, [], candidate.towerId);
                if (!preview.accepted && preview.reason === 'insufficient-gold') break;
                if (!preview.accepted || !model.commit(preview, []).accepted) throw new Error(`补塔失败 ${cellKey(candidate.cell)}`);
                nextBuild += 1;
            }
        }
        waveResults.push({ wave: wave.wave, killed, leaked, coreHealth, towers: model.towers.size });
        telemetry.push({ wave: wave.wave, spawnSeconds, combatSeconds, emptySpawnSeconds, multiEnemySeconds, peakActiveEnemies, shotsByTower, shotsByCell, frostShotsByCell, slowApplications, gold: model.gold,
            pathLength: model.flowField.distanceAt(grid.entry), pathCells: model.flowField.pathFrom(grid.entry).map(cellKey),
            towerInvestment: model.deployments.reduce((sum, deployment) => {
                const tower = towers.find((candidate) => candidate.id === deployment.towerId);
                return sum + towerInvestment(tower, deployment.level ?? 1);
            }, 0) });
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
