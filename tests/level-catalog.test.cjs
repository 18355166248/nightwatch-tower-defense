const test=require('node:test'); const assert=require('node:assert/strict');
const {LEVELS,SECOND_LEVEL_BASE_WAVES}=require('../.test-dist/config/LevelCatalog');
const {PHASE_B_WAVES}=require('../.test-dist/config/PhaseBCombatConfig');
const {replayFirstLevel}=require('./support/first-level-replay.cjs');
const {FirstLevelBestTimeStore}=require('../.test-dist/systems/FirstLevelBestTimeStore');
const {FirstLevelBestHealthStore}=require('../.test-dist/systems/FirstLevelBestHealthStore');
const {buildBattleResultViewModel}=require('../.test-dist/presentation/BattleResultViewModel');

test('第一关保留新手配置，第二关提前混编且不共享可修改敌人对象',()=>{
    assert.equal(LEVELS['first-level'].waves,PHASE_B_WAVES);assert.equal(LEVELS['first-level'].startingGold,140);
    assert.equal(LEVELS['first-level'].nextLevel,'second-level');assert.equal(LEVELS['second-level'].nextLevel,undefined);
    const waves=LEVELS['second-level'].waves;assert.equal(waves.length,8);
    assert.ok(waves[1].groups.some(g=>g.enemy.id==='clockwork-runner'));
    assert.ok(waves[3].groups.some(g=>g.enemy.id==='iron-canister-hauler'));
    for(let i=0;i<8;i++) assert.notEqual(waves[i].groups[0].enemy,PHASE_B_WAVES[i].groups[0].enemy);
});
test('第二关加强后首关方案第五波失守，分段改路和冷凝升级仍能以1点核心通关',()=>{
    const first=replayFirstLevel();assert.equal(first.coreHealth,9);
    const level=LEVELS['second-level'];
    const old=replayFirstLevel({waves:level.waves,startingGold:level.startingGold});
    assert.equal(old.coreHealth,0);assert.equal(old.waveResults.at(-1).wave,5);
    const strategy=require('./support/second-level-strategy.cjs');
    const options={waves:level.waves,startingGold:level.startingGold,...strategy};
    const advanced=replayFirstLevel(options);assert.equal(advanced.coreHealth,1);assert.equal(advanced.waveResults.length,8);
    assert.deepEqual(advanced.waveResults.map(w=>w.leaked),[0,2,6,0,0,1,0,0]);
    for(const [frameDeltaSeconds,speedScale]of [[1/60,1],[1/20,2]]) {
        assert.deepEqual(replayFirstLevel({...options,frameDeltaSeconds,speedScale}).waveResults,advanced.waveResults);
    }
    for(let i=0;i<8;i++)for(let j=0;j<level.waves[i].groups.length;j++) {
        const current=level.waves[i].groups[j],before=SECOND_LEVEL_BASE_WAVES[i].groups[j];
        assert.equal(current.enemy.killReward,before.enemy.killReward);
        assert.equal(level.waves[i].clearReward,SECOND_LEVEL_BASE_WAVES[i].clearReward);
        if(i>=2)assert.ok(current.spawnIntervalSeconds<before.spawnIntervalSeconds);
        if(i>=3)assert.ok(current.enemy.speedCellsPerSecond>before.enemy.speedCellsPerSecond);
    }
});
test('两关最快时间和核心纪录分开持久化，重读第二关不混入首关',()=>{
    const data=new Map();const provider=()=>({getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)});
    const firstTime=new FirstLevelBestTimeStore(false,provider);firstTime.recordVictory(420);
    const secondTime=new FirstLevelBestTimeStore(false,provider,'second-level');assert.equal(secondTime.bestSeconds,null);secondTime.recordVictory(498);
    const firstHealth=new FirstLevelBestHealthStore(false,provider);firstHealth.recordVictory(9);
    const secondHealth=new FirstLevelBestHealthStore(false,provider,'second-level');assert.equal(secondHealth.bestRemainingHealth,null);secondHealth.recordVictory(2);
    assert.equal(new FirstLevelBestTimeStore(false,provider).bestSeconds,420);
    assert.equal(new FirstLevelBestTimeStore(false,provider,'second-level').bestSeconds,498);
    assert.equal(new FirstLevelBestHealthStore(false,provider).bestRemainingHealth,9);
    assert.equal(new FirstLevelBestHealthStore(false,provider,'second-level').bestRemainingHealth,2);
});
test('首关胜利提供挑战第二关，首关失败与第二关结算仍为本关重试',()=>{
    const context={initialCoreHealth:10,totalWaves:8,elapsedSeconds:420,towerCount:10,upgradeCount:4,bestSeconds:null,newRecord:false,bestRemainingHealth:null,bestCoreHealthCapacity:10,newHealthRecord:false};
    const totals={spawned:213,killed:212,leaked:1};
    assert.equal(buildBattleResultViewModel({phase:'victory',wave:8,coreHealth:9},totals,100,{...context,levelLabel:'第一关',nextLevelLabel:'第二关'}).actionLabel,'挑战第二关');
    assert.equal(buildBattleResultViewModel({phase:'defeat',wave:4,coreHealth:0},totals,100,{...context,levelLabel:'第一关',nextLevelLabel:'第二关'}).actionLabel,'重新部署');
    const second=buildBattleResultViewModel({phase:'victory',wave:8,coreHealth:2},totals,100,{...context,levelLabel:'第二关'});
    assert.match(second.subtitle,/第二关/);assert.equal(second.actionLabel,'重新部署');
});
