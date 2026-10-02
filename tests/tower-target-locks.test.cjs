const test=require('node:test');
const assert=require('node:assert/strict');
const {TowerTargetLocks}=require('../.test-dist/systems/TowerTargetLocks.js');
const {WaveCombatRuntime}=require('../.test-dist/systems/WaveCombatRuntime.js');
const {FlowField}=require('../.test-dist/systems/FlowField.js');

test('有效目标持续锁定，排序变化不抖动；离开候选范围或换塔类型重新选敌',()=>{
    const locks=new TowerTargetLocks(),a={id:'a'},b={id:'b'};
    assert.equal(locks.choose('1,1','gun',[a,b]),a);
    assert.equal(locks.choose('1,1','gun',[b,a]),a);
    assert.equal(locks.choose('1,1','gun',[b]),b);
    assert.equal(locks.choose('1,1','frost',[a,b]),a);
    assert.equal(locks.choose('1,1','frost',[]),null);
    assert.deepEqual(locks.snapshot,[]);
});
test('锁可因控制优先级改变而交接，卖塔/击杀清理与重开幂等',()=>{
    const locks=new TowerTargetLocks(),a={id:'a',priority:0},b={id:'b',priority:1};
    locks.choose('1,1','frost',[a]);
    assert.equal(locks.choose('1,1','frost',[b,a],(old,best)=>old.priority===best.priority),b);
    locks.retain(new Set(['1,1']),new Set(['a']));assert.deepEqual(locks.snapshot,[]);
    locks.choose('1,1','gun',[a]);locks.retain(new Set(),new Set(['a']));assert.deepEqual(locks.snapshot,[]);
    locks.choose('1,1','gun',[a]);locks.clear();locks.clear();assert.deepEqual(locks.snapshot,[]);
});
test('真实射击运行时保持目标、失效重选，并清除重开锁；不只测辅助模块',()=>{
    const grid={id:'test-lock',columns:5,rows:8,entry:{column:2,row:0},exit:{column:2,row:7}};
    const flow=new FlowField(grid,new Set());
    const enemy={id:'clockwork-infantry',maxHealth:1000,speedCellsPerSecond:.01,killReward:4};
    const tower={id:'rivet-gun',rangeCells:10,damage:1,attackIntervalSeconds:.1};
    const combat=new WaveCombatRuntime(grid,tower),deployment=[{cell:{column:1,row:1},towerId:tower.id}];
    combat.start({wave:1,groups:[{enemy,count:2,spawnIntervalSeconds:.1}]});
    const first=combat.tick(0,flow,deployment).shots[0];
    combat.tick(.1,flow,[]); // 无塔时必须结束旧锁。
    assert.deepEqual(combat.lockedTargets,[]);
    const [a,b]=combat.enemies;
    a.fromCell={column:2,row:2};a.toCell={column:2,row:3};a.progress=.2;
    b.fromCell={column:2,row:0};b.toCell={column:2,row:1};b.progress=.2;
    assert.equal(combat.tick(0,flow,deployment).shots[0].targetId,a.id);
    b.fromCell={column:2,row:2};b.toCell={column:2,row:3};b.progress=.2+.0000005;
    assert.equal(combat.tick(.1,flow,deployment).shots[0].targetId,a.id,'同威胁层级数值误差内稳定旧锁');
    b.fromCell={column:2,row:4};b.toCell={column:2,row:5};b.progress=.2;
    assert.equal(combat.tick(.1,flow,deployment).shots[0].targetId,b.id,'更接近出口的真实威胁不能被旧锁拖住');
    b.health=0;
    assert.equal(combat.tick(.1,flow,deployment).shots[0].targetId,a.id,'同帧死亡的锁定目标不得继续攻击');
    assert.equal(first.targetId,a.id);
    combat.reset();assert.deepEqual(combat.lockedTargets,[]);
});

test('冷凝真实射击仍优先同速未减速者，而不是永久锁住已控制目标',()=>{
    const grid={id:'test-control-lock',columns:5,rows:8,entry:{column:2,row:0},exit:{column:2,row:7}};
    const flow=new FlowField(grid,new Set());
    const enemy={id:'clockwork-runner',maxHealth:1000,speedCellsPerSecond:.01,killReward:4};
    const tower={id:'frost-coil',rangeCells:10,damage:1,attackIntervalSeconds:.1,targetPriority:'fast-uncontrolled',
        effect:{kind:'slow',speedMultiplier:.5,durationSeconds:1,pulseRadiusCells:0}};
    const combat=new WaveCombatRuntime(grid,tower),deployment=[{cell:{column:1,row:1},towerId:tower.id}];
    combat.start({wave:1,groups:[{enemy,count:3,spawnIntervalSeconds:.1}]});
    const ids=[combat.tick(0,flow,deployment).shots[0].targetId,
        combat.tick(.1,flow,deployment).shots[0].targetId,combat.tick(.1,flow,deployment).shots[0].targetId];
    assert.equal(new Set(ids).size,3,'每次新到的未减速者可替换旧锁');
    assert.equal(combat.tick(.1,flow,deployment).shots[0].targetId,ids[0],'全部受控后仍执行出口威胁优先');
});
