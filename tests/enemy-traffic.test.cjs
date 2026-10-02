const test = require('node:test');
const assert = require('node:assert/strict');
const { FlowField } = require('../.test-dist/systems/FlowField.js');
const { WaveCombatRuntime } = require('../.test-dist/systems/WaveCombatRuntime.js');
const { trafficMove, trafficEntryLane, trafficPathGap, firstLevelEnemyTraffic, TWO_LANE_TRAFFIC } = require('../.test-dist/systems/EnemyTrafficRules.js');
const { PHASE_A_GRIDS } = require('../.test-dist/config/PhaseAGrids.js');
const { CLOCKWORK_INFANTRY, CLOCKWORK_RUNNER, RIVET_GUN, PHASE_B_WAVES } = require('../.test-dist/config/PhaseBCombatConfig.js');
const { replayFirstLevel } = require('./support/first-level-replay.cjs');
const grid = PHASE_A_GRIDS['grid-9x13'];
const flow = new FlowField(grid, new Set());
const actor = (id, progress, lane = 0, fromCell = {column:4,row:0}, toCell = {column:4,row:1}) =>
    ({id:`e${id}`,spawnOrder:id,progress,trafficLane:lane,fromCell,toCell});
const close = (a,b) => assert.ok(Math.abs(a-b)<1e-8, `${a} != ${b}`);

test('正式首关默认双列，QA/美术参数无影响；旧移动只作显式对照', () => {
    assert.equal(firstLevelEnemyTraffic(''),TWO_LANE_TRAFFIC);
    assert.equal(firstLevelEnemyTraffic('?qa=1&unitArt=rig-candidate'),TWO_LANE_TRAFFIC);
    assert.equal(firstLevelEnemyTraffic('?enemyTraffic=unknown'),TWO_LANE_TRAFFIC);
    assert.equal(firstLevelEnemyTraffic('?enemyTraffic=two-lane'),TWO_LANE_TRAFFIC);
    assert.equal(firstLevelEnemyTraffic('?enemyTraffic=legacy'),undefined);
});

test('同列跟随只走前排留下的空间，不能回退、欠账补跑或穿过前排', () => {
    const follower=actor(2,0), leader=actor(1,0.75);
    const settings={...TWO_LANE_TRAFFIC,allowPassing:false};
    close(trafficMove(follower,0.2,[follower,leader],flow,settings).distance,0.05);
    leader.progress=0.4;
    assert.equal(trafficMove(follower,0.2,[follower,leader],flow,settings).distance,0);
    assert.equal(follower.progress,0);
    assert.equal(trafficMove(follower,0.2,[follower],flow,settings).distance,0.2);
});

test('不同列不阻拦，超越需要另一列前后窗口同时空闲', () => {
    const follower=actor(3,0.3), leader=actor(1,0.8);
    const free=trafficMove(follower,0.05,[leader,follower],flow,TWO_LANE_TRAFFIC);
    assert.equal(free.lane,1); assert.equal(free.distance,0.05);
    const rear=actor(2,0.2,1);
    const blocked=trafficMove(follower,0.05,[leader,follower,rear],flow,TWO_LANE_TRAFFIC);
    assert.equal(blocked.lane,0); assert.equal(blocked.distance,0);
    leader.trafficLane=1;
    assert.equal(trafficMove(follower,0.05,[leader,follower],flow,TWO_LANE_TRAFFIC).distance,0.05);
});

test('入口两列满时不进场，首选列满时可用另一列，已离场不继续占队列', () => {
    const candidate=actor(3,0), a=actor(1,0.2), b=actor(2,0.2,1);
    assert.equal(trafficEntryLane(candidate,[a,b],flow,TWO_LANE_TRAFFIC),null);
    assert.equal(trafficEntryLane(candidate,[a],flow,TWO_LANE_TRAFFIC),1);
    a.progress=1;
    assert.equal(trafficEntryLane(candidate,[a,b],flow,TWO_LANE_TRAFFIC),0);
});

test('队距跨格心/转弯交接，反向和无关支路不当作前排，合流先预留交接', () => {
    const follower=actor(2,0.8);
    const leader=actor(1,0.5,0,{column:4,row:1},{column:4,row:2});
    close(trafficPathGap(follower,leader,flow,1),0.7);
    close(trafficMove(follower,0.1,[leader,follower],flow,{...TWO_LANE_TRAFFIC,allowPassing:false}).distance,0);
    const turnFlow=new FlowField(grid,new Set(['4,2']));
    const turnLeader=actor(1,0.5,0,{column:4,row:1},{column:5,row:1});
    close(trafficPathGap(follower,turnLeader,turnFlow,1),0.7);
    const unrelated=actor(1,0.5,0,{column:7,row:1},{column:7,row:2});
    assert.equal(trafficPathGap(follower,unrelated,flow,1),null);
    const merging=actor(1,0.9,0,{column:3,row:1},{column:4,row:1});
    close(trafficPathGap(follower,merging,flow,1),0.1);
});

test('高密度进场会限流，不提前宣布生成完毕；长帧逐步推进，重开不遗留队列', () => {
    const combat=new WaveCombatRuntime(grid,RIVET_GUN,TWO_LANE_TRAFFIC);
    const wave={wave:1,clearReward:0,groups:[{enemy:CLOCKWORK_INFANTRY,count:10,spawnIntervalSeconds:0.01}]};
    combat.start(wave);
    combat.tick(0.2,flow,[]);
    assert.equal(combat.totals.spawned,2);
    assert.equal(combat.isSpawningComplete,false);
    assert.throws(()=>combat.completeWave());
    let elapsed=0.2;
    while(elapsed<30 && (!combat.isSpawningComplete||combat.enemies.length)) {
        combat.tick(1/60,flow,[]); elapsed+=1/60;
    }
    assert.deepEqual(combat.totals,{spawned:10,killed:0,leaked:10});
    combat.completeWave(); combat.reset(); combat.start(wave); combat.tick(0,flow,[]);
    assert.equal(combat.enemies[0].id,'enemy-1');
    assert.equal(combat.enemies[0].trafficLane,0);
    assert.throws(()=>combat.tick(2,flow,[]),RangeError);
    assert.throws(()=>new WaveCombatRuntime(grid,RIVET_GUN,{headwayCells:0,allowPassing:true}),RangeError);
});

test('空地图疾行者仍快于步兵，不会被交通规则统一成重装速度', () => {
    const duration = (enemy) => {
        const combat=new WaveCombatRuntime(grid,RIVET_GUN,TWO_LANE_TRAFFIC);
        combat.start({wave:1,clearReward:0,groups:[{enemy,count:1,spawnIntervalSeconds:1}]});
        let seconds=0;
        while(seconds<30 && combat.totals.leaked===0) {combat.tick(1/60,flow,[]);seconds+=1/60;}
        return seconds;
    };
    assert.ok(duration(CLOCKWORK_RUNNER) < duration(CLOCKWORK_INFANTRY)*0.65);
});

test('实际八波每个固定步进共享有向路段的同列队距不小于0.7，且保留策略时长', () => {
    let violations=0, waitingSeconds=0;
    const result=replayFirstLevel({traffic:TWO_LANE_TRAFFIC,onCombatStep({enemies,deltaSeconds}) {
        waitingSeconds+=enemies.filter(e=>e.trafficWaiting).length*deltaSeconds;
        for(let a=0;a<enemies.length;a++) for(let b=a+1;b<enemies.length;b++) {
            const x=enemies[a],y=enemies[b];
            if(x.trafficLane===y.trafficLane && x.fromCell.column===y.fromCell.column && x.fromCell.row===y.fromCell.row
                && x.toCell.column===y.toCell.column && x.toCell.row===y.toCell.row && Math.abs(x.progress-y.progress)<0.7-1e-8) violations++;
        }
    }});
    assert.equal(violations,0); assert.ok(waitingSeconds>10);
    assert.equal(result.waveResults.length,PHASE_B_WAVES.length);
    assert.deepEqual(result.totals,{spawned:213,killed:212,leaked:1});
    assert.equal(result.gold,348); assert.equal(result.coreHealth,9);
    const seconds=result.combatSecondsByWave.reduce((a,b)=>a+b,0)+56;
    assert.ok(seconds>=360&&seconds<=480);
});

test('队列固定步进在20/60帧和2倍速下八波结果一致', () => {
    const base=replayFirstLevel({traffic:TWO_LANE_TRAFFIC});
    for(const [frameDeltaSeconds,speedScale] of [[1/20,1],[1/60,1],[1/30,2]]) {
        const result=replayFirstLevel({traffic:TWO_LANE_TRAFFIC,frameDeltaSeconds,speedScale});
        assert.deepEqual(result.waveResults,base.waveResults);
        assert.deepEqual(result.totals,base.totals);
        assert.deepEqual(result.combatSecondsByWave,base.combatSecondsByWave);
        assert.equal(result.gold,base.gold);
    }
});

test('动态建塔仍保护当前/承诺格，队列转弯与合流不倒走、不入塔格、最终正常出场', () => {
    const {PlacementModel}=require('../.test-dist/systems/PlacementModel.js');
    const {PHASE_B_TOWERS}=require('../.test-dist/config/PhaseBCombatConfig.js');
    const model=new PlacementModel(grid,140,PHASE_B_TOWERS);
    const combat=new WaveCombatRuntime(grid,PHASE_B_TOWERS,TWO_LANE_TRAFFIC);
    combat.start({wave:1,clearReward:0,groups:[{enemy:CLOCKWORK_RUNNER,count:30,spawnIntervalSeconds:0.25}]});
    for(let i=0;i<120;i++) combat.tick(1/60,model.flowField,[]);
    const leader=combat.enemies.find(e=>e.fromCell.row>0);
    assert.ok(leader);
    const states=combat.enemyRouteStates();
    assert.equal(model.preview(leader.fromCell,states,'rivet-gun').reason,'enemy-current-cell');
    assert.equal(model.preview(leader.toCell,states,'rivet-gun').reason,'enemy-committed-cell');
    const preview=model.preview({column:4,row:5},states,'rivet-gun');
    assert.equal(preview.accepted,true);
    assert.equal(model.commit(preview,states).accepted,true);
    let turns=0;
    for(let elapsed=2;elapsed<60&&(!combat.isSpawningComplete||combat.enemies.length);elapsed+=1/60) {
        const before=new Map(combat.enemies.map(e=>[e.id,{from:e.fromCell,to:e.toCell}]));
        combat.tick(1/60,model.flowField,[]);
        for(const e of combat.enemies) {
            assert.equal(model.flowField.blocked.has(`${e.fromCell.column},${e.fromCell.row}`),false);
            assert.equal(model.flowField.blocked.has(`${e.toCell.column},${e.toCell.row}`),false);
            const old=before.get(e.id);
            if(old && (old.from.column!==e.fromCell.column||old.from.row!==e.fromCell.row)) {
                turns++;
                assert.notDeepEqual(e.toCell,old.from);
                assert.deepEqual(e.fromCell,old.to);
            }
        }
    }
    assert.ok(turns>30);
    assert.deepEqual(combat.totals,{spawned:30,killed:0,leaked:30});
});
