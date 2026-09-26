#!/usr/bin/env node

// 参数实验只克隆回放输入，不写回游戏配置；通过“局长 + 等预算结果”共同筛选，避免靠空等凑时长。
const { replayFirstLevel } = require('../tests/support/first-level-replay.cjs');
const { PHASE_B_TOWERS, PHASE_B_WAVES } = require('../.test-dist/config/PhaseBCombatConfig.js');
const { FIRST_LEVEL_GUIDED_UPGRADES, FIRST_LEVEL_OPENING, FIRST_LEVEL_REINFORCEMENTS } = require('../.test-dist/config/FirstLevelOpening.js');

const pure = (entries) => entries.map((entry) => ({ ...entry, towerId: 'rivet-gun' }));
const lateUpgrade = [
    ...FIRST_LEVEL_GUIDED_UPGRADES,
    { wave: 5, cell: { column: 7, row: 8 } },
    { wave: 6, cell: { column: 3, row: 2 } },
    { wave: 7, cell: { column: 7, row: 8 } },
];

function candidateWaves(scales, lateIntervalScale) {
    return PHASE_B_WAVES.map((wave, index) => ({
        ...wave,
        groups: wave.groups.map((group) => ({
            ...group,
            count: Math.round(group.count * scales[index]),
            spawnIntervalSeconds: group.spawnIntervalSeconds * (index >= 4 ? lateIntervalScale : 1),
        })),
    }));
}

const candidateTowers = PHASE_B_TOWERS.map((tower) => tower.id === 'frost-coil'
    ? { ...tower, damage: 7, attackIntervalSeconds: 0.5,
        effect: { ...tower.effect, speedMultiplier: 0.45 } }
    : tower);

const scenarios = [
    { name: '当前发布基线', waves: PHASE_B_WAVES, towers: PHASE_B_TOWERS,
        upgradesAfterWave: FIRST_LEVEL_GUIDED_UPGRADES },
    { name: '后段增压 + 冷凝微调 + Lv3 候选（未发布）',
        waves: candidateWaves([1, 1, 1.2, 1.4, 2.2, 2.8, 3.2, 4], 1.15),
        towers: candidateTowers, upgradesAfterWave: lateUpgrade },
];

for (const scenario of scenarios) {
    for (const [strategy, opening, reinforcements] of [
        ['混合', FIRST_LEVEL_OPENING, FIRST_LEVEL_REINFORCEMENTS],
        ['同格纯机枪', pure(FIRST_LEVEL_OPENING), pure(FIRST_LEVEL_REINFORCEMENTS)],
        ['纯机枪+额外一座', pure(FIRST_LEVEL_OPENING), [...pure(FIRST_LEVEL_REINFORCEMENTS),
            { afterWave: 6, cell: { column: 7, row: 9 }, towerId: 'rivet-gun' }]],
    ]) {
        const result = replayFirstLevel({ opening, reinforcements, waves: scenario.waves,
            towers: scenario.towers, upgradesAfterWave: scenario.upgradesAfterWave });
        const combatSeconds = result.telemetry.reduce((sum, wave) => sum + wave.combatSeconds, 0);
        const emptySpawnSeconds = result.telemetry.reduce((sum, wave) => sum + wave.emptySpawnSeconds, 0);
        console.log(JSON.stringify({ scenario: scenario.name, strategy, waveReached: result.waveResults.at(-1)?.wave,
            spawned: result.totals.spawned, leaked: result.totals.leaked, core: result.coreHealth,
            investment: result.telemetry.at(-1)?.towerInvestment,
            combatSeconds: Number(combatSeconds.toFixed(1)),
            naturalCountdownSeconds: result.waveResults.length === 8 ? 56 : null,
            emptySpawnSeconds: Number(emptySpawnSeconds.toFixed(1)),
            peakEnemies: Math.max(...result.telemetry.map((wave) => wave.peakActiveEnemies)),
            gold: result.gold }));
    }
}
