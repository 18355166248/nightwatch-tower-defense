const test=require('node:test');const assert=require('node:assert/strict');
const {replayThirdLevel}=require('./support/third-level-replay.cjs');
const {BattleRunCheckpoint}=require('../.test-dist/systems/BattleRunCheckpoint');
const {PlacementModel}=require('../.test-dist/systems/PlacementModel');
const {EconomyLedger}=require('../.test-dist/systems/EconomyLedger');
const {PHASE_A_GRIDS}=require('../.test-dist/config/PhaseAGrids');
const {ARC_TOWER}=require('../.test-dist/config/ThirdLevelCombatConfig');
const {firstLevelTowerPanelPresentation}=require('../.test-dist/presentation/FirstLevelTowerPanelPresentation');

test('第三关混合构筑八波通关保留生命余量，同预算旧双塔仍有劣势',()=>{
 const mixed=replayThirdLevel();assert.equal(mixed.waveResults.length,8);assert.ok(mixed.coreHealth>=8);
 assert.ok(mixed.telemetry.every(t=>t.gold>=0));assert.equal(mixed.totals.killed+mixed.totals.leaked,214);
 const legacy=replayThirdLevel(true);assert.ok(mixed.coreHealth>legacy.coreHealth);
 assert.ok(mixed.waveResults.every(w=>w.killed+w.leaked>0));
});
test('同一24场景矩阵的容错改善，固定样本至少20个能打完八波',()=>{
 const {runMatrix,priorOptions}=require('./support/third-level-balance.cjs');
 const before=runMatrix(priorOptions()),after=runMatrix();
 assert.equal(before.total,24);assert.equal(after.total,24);
 assert.ok(after.passed>=20);assert.ok(after.passed>before.passed);
});
test('推荐策略30/60帧与1/2倍速都能八波通关，不靠战斗中即时补塔',()=>{
 for(const frameDeltaSeconds of [1/30,1/60])for(const speedScale of [1,2]){
  const r=replayThirdLevel(false,{frameDeltaSeconds,speedScale});
  assert.equal(r.waveResults.length,8);assert.ok(r.coreHealth>=8);
  assert.ok(r.telemetry.every(t=>t.gold>=0));assert.equal(r.totals.killed+r.totals.leaked,214);
 }
});
test('第三关预留16秒波间操作，推荐策略每波最多4项消费，前两关默认8秒不变',()=>{
 const {LEVELS}=require('../.test-dist/config/LevelCatalog');
 assert.equal(LEVELS['third-level'].interWaveSeconds,16);
 assert.equal(LEVELS['first-level'].interWaveSeconds??8,8);
 assert.equal(LEVELS['second-level'].interWaveSeconds??8,8);
 const r=replayThirdLevel();
 for(let wave=1;wave<8;wave++)assert.ok(r.purchases.filter(p=>p.afterWave===wave).length<=4);
});
test('仅带电弧塔的阵容能建造、升级并按原金币与目录恢复检查点',()=>{
 const model=new PlacementModel(PHASE_A_GRIDS['grid-9x13'],new EconomyLedger(180),[ARC_TOWER],ARC_TOWER.id);
 const cell={column:4,row:2};assert.equal(model.commit(model.preview(cell,[]),[]).accepted,true);
 assert.equal(model.upgrade(cell).accepted,true);
 const restored=BattleRunCheckpoint.capture(model).restore().model;
 assert.equal(restored.gold,model.gold);assert.deepEqual(restored.deployments,model.deployments);
 assert.equal(restored.preview({column:5,row:3},[]).towerId,'arc-tower');
});
test('四塔等级亮点只表示真实购买，足够金币不能提前点亮二三级',()=>{
 for(const towerId of ['rivet-gun','frost-coil','piercing-cannon','arc-tower'])for(const level of [1,2,3]){
  const p=firstLevelTowerPanelPresentation({towerId,level,gold:999,saleRefund:30,opening:true});
  assert.deepEqual(p.levelPips.map(item=>item.purchased),[true,level>=2,level>=3]);
  assert.equal(p.nextLevel,level===3?null:level+1);
 }
});
