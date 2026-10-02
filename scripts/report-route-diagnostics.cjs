#!/usr/bin/env node
const { writeFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { RouteDiagnostics } = require('../.test-dist/systems/RouteDiagnostics.js');
const { FlowField } = require('../.test-dist/systems/FlowField.js');
const { PHASE_A_GRIDS } = require('../.test-dist/config/PhaseAGrids.js');
const { TWO_LANE_TRAFFIC } = require('../.test-dist/systems/EnemyTrafficRules.js');
const { replayFirstLevel } = require('../tests/support/first-level-replay.cjs');
const watch = new RouteDiagnostics();
const result = replayFirstLevel({ traffic: TWO_LANE_TRAFFIC, routeDiagnostics: watch });
const journal = watch.export();
// 用导出的占格版本重新建立真实BFS，逐格核查记录的承诺边；这是路线尾迹检查，不是完整输入录像。
const flows = new Map(journal.maps.map(({ version, blocked }) => [version, new FlowField(PHASE_A_GRIDS[journal.map.grid], new Set(blocked))]));
let checkedEdges = 0;
const errors = [];
for (const event of journal.events) {
    if (!['spawn', 'center'].includes(event.kind)) continue;
    const parse = key => { const [column, row] = key.split(',').map(Number); return { column, row }; };
    const from = parse(event.from), to = parse(event.to), flow = flows.get(event.mapVersion);
    if (!flow || flow.distanceAt(to) !== flow.distanceAt(from) - 1) errors.push({ seq: event.seq, mapVersion: event.mapVersion, from: event.from, to: event.to });
    checkedEdges++;
}
const report = { schema: 1, boundary: '固定步进真实推荐构筑，非浏览器/真人样本；有界路线事件尾迹并非全部输入录像',
    totals: result.totals, coreHealth: result.coreHealth, gold: result.gold, combatSeconds: result.combatSecondsByWave.reduce((a, b) => a + b, 0),
    eventCounts: journal.events.reduce((counts, event) => { counts[event.kind] = (counts[event.kind] ?? 0) + 1; return counts; }, {}),
    mapCount: journal.maps.length, checkedEdges, errors, journal };
const output = process.argv.indexOf('--out');
if (output >= 0) {
    if (!process.argv[output + 1]) throw new Error('--out缺少路径');
    writeFileSync(resolve(process.argv[output + 1]), `${JSON.stringify(report, null, 2)}\n`);
}
console.log(JSON.stringify({ ...report, journal: undefined }, null, 2));
if (errors.length) process.exitCode = 1;
