#!/usr/bin/env node
const { replayFirstLevel } = require('../tests/support/first-level-replay.cjs');
const { EnemyCrowdPresentation } = require('../.test-dist/presentation/EnemyCrowdLayout.js');
const { enemyVisualOffset } = require('../.test-dist/presentation/UnitVisualMotion.js');

// 比较同一战斗快照的脚点拥挤，不将脚点距离冒充整个 Sprite 的遮挡面积。
const view = new EnemyCrowdPresentation();
let seconds = 0;
const waves = new Map();
const result = replayFirstLevel({ onCombatStep({ wave, deltaSeconds, enemies }) {
    seconds += deltaSeconds;
    const offsets = view.sample(enemies, seconds);
    const sample = waves.get(wave) ?? { wave, peakEnemies: 0, oldClosePairSeconds: 0, newClosePairSeconds: 0,
        oldNearCoincidentPairSeconds: 0, newNearCoincidentPairSeconds: 0 };
    sample.peakEnemies = Math.max(sample.peakEnemies, enemies.length);
    const points = enemies.map((e) => {
        const column = e.fromCell.column + (e.toCell.column - e.fromCell.column) * e.progress;
        const row = e.fromCell.row + (e.toCell.row - e.fromCell.row) * e.progress;
        const old = enemyVisualOffset(e.spawnOrder, 1);
        const offset = offsets.get(e.id);
        return { old: [column + old.x, row - old.y], next: [column + offset.column, row + offset.row] };
    });
    for (let a = 0; a < points.length; a++) for (let b = a + 1; b < points.length; b++) {
        const oldDistance = Math.hypot(points[a].old[0] - points[b].old[0], points[a].old[1] - points[b].old[1]);
        const newDistance = Math.hypot(points[a].next[0] - points[b].next[0], points[a].next[1] - points[b].next[1]);
        if (oldDistance < 0.3) sample.oldClosePairSeconds += deltaSeconds;
        if (newDistance < 0.3) sample.newClosePairSeconds += deltaSeconds;
        if (oldDistance < 0.1) sample.oldNearCoincidentPairSeconds += deltaSeconds;
        if (newDistance < 0.1) sample.newNearCoincidentPairSeconds += deltaSeconds;
    }
    view.retain(new Set(enemies.map((e) => e.id)));
    waves.set(wave, sample);
} });
const report = { kind: 'fixed-step-replay-anchor-spacing-not-sprite-overlap',
    waves: Array.from(waves.values()), totals: result.totals, coreHealth: result.coreHealth,
    combatSeconds: result.combatSecondsByWave.reduce((a, b) => a + b, 0), gold: result.gold };
const output = process.argv.indexOf('--output');
if (output >= 0) {
    if (!process.argv[output + 1]) throw new Error('--output 缺少目标文件');
    require('node:fs').writeFileSync(process.argv[output + 1], `${JSON.stringify(report, null, 2)}\n`);
}
console.log(JSON.stringify(report, null, 2));
