#!/usr/bin/env node
const { replayFirstLevel } = require('../tests/support/first-level-replay.cjs');
const { standardLayout } = require('../tests/support/first-level-strategies.cjs');
const { TWO_LANE_TRAFFIC } = require('../.test-dist/systems/EnemyTrafficRules.js');
const { EnemyCrowdPresentation } = require('../.test-dist/presentation/EnemyCrowdLayout.js');

function measure(name, traffic) {
    const view = new EnemyCrowdPresentation();
    const telemetry = new Map(), lanes = new Map();
    let seconds = 0;
    const result = replayFirstLevel({ traffic, onCombatStep({ wave, enemies, deltaSeconds }) {
        seconds += deltaSeconds;
        const offsets = view.sample(enemies, seconds);
        const data = telemetry.get(wave) ?? { wave, peakEnemies: 0, waitingEnemySeconds: 0,
            sameLaneHeadwayViolations: traffic ? 0 : null, laneChanges: 0, nearAnchorPairSeconds: 0, closeAnchorPairSeconds: 0 };
        data.peakEnemies = Math.max(data.peakEnemies, enemies.length);
        data.waitingEnemySeconds += enemies.filter(e => e.trafficWaiting).length * deltaSeconds;
        const points = enemies.map(e => {
            const prior = lanes.get(e.id);
            if (prior !== undefined && prior !== e.trafficLane) data.laneChanges++;
            if (e.trafficLane !== undefined) lanes.set(e.id, e.trafficLane);
            const offset = offsets.get(e.id);
            return { column: e.fromCell.column + (e.toCell.column-e.fromCell.column)*e.progress + offset.column,
                row: e.fromCell.row + (e.toCell.row-e.fromCell.row)*e.progress + offset.row };
        });
        for (let a=0;a<enemies.length;a++) for(let b=a+1;b<enemies.length;b++) {
            const x=enemies[a],y=enemies[b];
            if (traffic && x.trafficLane===y.trafficLane && x.fromCell.column===y.fromCell.column && x.fromCell.row===y.fromCell.row
                && x.toCell.column===y.toCell.column && x.toCell.row===y.toCell.row
                && Math.abs(x.progress-y.progress)<traffic.headwayCells-1e-8) data.sameLaneHeadwayViolations++;
            const distance=Math.hypot(points[a].column-points[b].column,points[a].row-points[b].row);
            if(distance<0.1) data.nearAnchorPairSeconds+=deltaSeconds;
            if(distance<0.3) data.closeAnchorPairSeconds+=deltaSeconds;
        }
        telemetry.set(wave,data);
        const ids = new Set(enemies.map(e=>e.id));
        view.retain(ids);
        for(const id of lanes.keys()) if(!ids.has(id)) lanes.delete(id);
    }});
    return { name, traffic: traffic ?? null, totals: result.totals, coreHealth: result.coreHealth, gold: result.gold,
        combatSeconds: result.combatSecondsByWave.reduce((a,b)=>a+b,0), naturalCountdownSeconds: 56,
        waves: result.telemetry.map((wave,i)=>({...Array.from(telemetry.values())[i], combatSeconds:wave.combatSeconds,
            spawnSeconds:wave.spawnSeconds,leaked:result.waveResults[i].leaked})) };
}

const report = { basis:'same-config-fixed-step-replay', limitations:[
    '共享有向路段的同列队距，不是所有异列/转弯Sprite的像素遮挡面积',
    '脚点对秒是对数乘时间，不是墙钟拥挤时长',
    '没有替代浏览器、真人胜率、三局压力或设备性能'],
    profiles:[measure('1312-legacy-with-visual-avoidance',undefined),
        measure('two-lane-no-passing',{...TWO_LANE_TRAFFIC,allowPassing:false}),measure('two-lane-default',TWO_LANE_TRAFFIC)],
    firstWaveStrategies: [2,3].flatMap(row=>Object.entries(standardLayout(row)).map(([name,config])=>{
        const r=replayFirstLevel({...config,traffic:TWO_LANE_TRAFFIC});
        return {row,name,totals:r.totals,coreHealth:r.coreHealth,combatSeconds:r.combatSecondsByWave[0]};
    })) };
const output=process.argv.indexOf('--out');
if(output>=0) {
    if(!process.argv[output+1]) throw new Error('--out 缺少目标路径');
    require('node:fs').writeFileSync(process.argv[output+1],JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify(report,null,2));
