#!/usr/bin/env node

const { readFileSync, writeFileSync } = require('node:fs');
const { performance } = require('node:perf_hooks');
const { resolve } = require('node:path');

const root = resolve(__dirname, '..');
const { PHASE_A_GRIDS } = require(resolve(root, '.test-dist/config/PhaseAGrids.js'));
const { cellKey } = require(resolve(root, '.test-dist/core/GridTypes.js'));
const { FlowField } = require(resolve(root, '.test-dist/systems/FlowField.js'));
const { PlacementModel } = require(resolve(root, '.test-dist/systems/PlacementModel.js'));

const fixtureData = JSON.parse(readFileSync(resolve(root, 'docs/poc/phase-a-fixtures.json'), 'utf8'));
const replayLines = [];
const timings = [];
const fixtureResults = [];
let acceptedReplayCount = 0;
let rejectedReplayCount = 0;
let stuckCount = 0;
let atomicViolationCount = 0;

for (const fixture of fixtureData.fixtures) {
    const grid = PHASE_A_GRIDS[fixture.gridId];
    for (const fixtureName of ['shortFold', 'longSnake']) {
        const data = fixture[fixtureName];
        const started = performance.now();
        const field = new FlowField(grid, new Set(data.towerCells.map(([column, row]) => cellKey({ column, row }))));
        const elapsed = performance.now() - started;
        timings.push(elapsed);
        const path = field.pathFrom(grid.entry);
        fixtureResults.push({
            gridId: fixture.gridId,
            fixture: fixtureName,
            expected: data.expectedPathLength,
            actual: path ? path.length - 1 : -1,
            flowRebuildMs: elapsed,
        });
    }
}

// 这 100 次回放以不同候选格覆盖移动中重算；每次都验证接受后的路线不会返回 fromCell。
for (let iteration = 0; iteration < 100; iteration += 1) {
    const grid = PHASE_A_GRIDS[['grid-9x13', 'grid-10x14', 'grid-8x13'][iteration % 3]];
    const model = new PlacementModel(grid, 120, 30);
    const fromCell = { column: grid.entry.column, row: 1 };
    const toCell = { column: grid.entry.column, row: 2 };
    const enemy = [{ id: `enemy-${iteration}`, fromCell, toCell, progress: 0.25 + (iteration % 50) / 100 }];
    // 固定混入入口、活动格、承诺格和越界输入，保证回放同时覆盖接受事务与原子拒绝事务。
    const forcedCandidates = [grid.entry, fromCell, toCell, { column: -1, row: 4 }];
    const candidate = iteration % 10 < forcedCandidates.length
        ? forcedCandidates[iteration % 10]
        : {
            column: iteration % grid.columns,
            row: 3 + (iteration % Math.max(1, grid.rows - 5)),
        };
    const started = performance.now();
    const before = { gold: model.gold, mapVersion: model.mapVersion, towerCount: model.towers.size };
    const preview = model.preview(candidate, enemy);
    timings.push(performance.now() - started);
    let backtracked = false;
    let stuck = false;
    let commit = null;
    if (preview.accepted && preview.flowField) {
        const next = preview.flowField.nextCell(toCell, fromCell);
        stuck = !next;
        backtracked = Boolean(next && next.column === fromCell.column && next.row === fromCell.row);
        commit = model.commit(preview, enemy);
        acceptedReplayCount += 1;
        if (!commit.accepted || model.mapVersion !== before.mapVersion + 1 || model.towers.size !== before.towerCount + 1) {
            atomicViolationCount += 1;
        }
    } else {
        rejectedReplayCount += 1;
        if (model.gold !== before.gold || model.mapVersion !== before.mapVersion || model.towers.size !== before.towerCount) {
            atomicViolationCount += 1;
        }
    }
    if (stuck) stuckCount += 1;
    replayLines.push(JSON.stringify({
        iteration,
        gridId: grid.id,
        mapVersion: model.mapVersion,
        enemy: enemy[0],
        candidate,
        accepted: preview.accepted,
        rejectReason: preview.reason ?? null,
        backtracked,
        stuck,
        commitAccepted: commit?.accepted ?? null,
        resultingMapVersion: model.mapVersion,
        atomicStateValid: atomicViolationCount === 0,
    }));
    if (backtracked) throw new Error(`第 ${iteration} 次回放发生回头`);
    if (stuck) throw new Error(`第 ${iteration} 次回放发生卡死`);
}

if (atomicViolationCount > 0) throw new Error(`动态回放发现 ${atomicViolationCount} 次非原子状态更新`);

timings.sort((a, b) => a - b);
const p95 = timings[Math.min(timings.length - 1, Math.floor(timings.length * 0.95))];
const fixturesPassed = fixtureResults.every((result) => result.actual === result.expected);
writeFileSync(resolve(root, 'docs/poc/phase-a-path-replay.jsonl'), `${replayLines.join('\n')}\n`);
writeFileSync(resolve(root, 'docs/poc/phase-a-automated-results.json'), `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    runtime: process.version,
    fixturesPassed,
    dynamicReplayCount: replayLines.length,
    acceptedReplayCount,
    rejectedReplayCount,
    backtrackCount: 0,
    stuckCount,
    atomicViolationCount,
    flowRebuildP95Milliseconds: p95,
    flowRebuildGateMilliseconds: 4,
    flowRebuildPassed: p95 <= 4,
    fixtureResults,
}, null, 2)}\n`);

console.log(JSON.stringify({ fixturesPassed, dynamicReplayCount: replayLines.length, p95 }, null, 2));
