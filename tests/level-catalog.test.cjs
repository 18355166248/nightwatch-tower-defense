const test=require('node:test'); const assert=require('node:assert/strict');
const {LEVELS}=require('../.test-dist/config/LevelCatalog');
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
test('相同布塔升级策略首关9点核心、第二关2点核心可胜；不升级第二关在第6波失守',()=>{
    const first=replayFirstLevel();assert.equal(first.coreHealth,9);
    const level=LEVELS['second-level'];const second=replayFirstLevel({waves:level.waves,startingGold:level.startingGold});
    assert.equal(second.coreHealth,2);assert.equal(second.waveResults.length,8);
    assert.deepEqual(second.waveResults.map(w=>w.leaked),[1,0,0,3,1,3,0,0]);
    const passive=replayFirstLevel({waves:level.waves,startingGold:level.startingGold,upgradesAfterWave:[]});
    assert.equal(passive.coreHealth,0);assert.equal(passive.waveResults.at(-1).wave,6);
    for(const [frameDeltaSeconds,speedScale] of [[1/60,1],[1/20,2]]) {
        const again=replayFirstLevel({waves:level.waves,startingGold:level.startingGold,frameDeltaSeconds,speedScale});
        assert.deepEqual(again.waveResults,second.waveResults);
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
