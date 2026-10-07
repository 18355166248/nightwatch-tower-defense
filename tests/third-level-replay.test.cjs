const test=require('node:test');const assert=require('node:assert/strict');
const {replayThirdLevel}=require('./support/third-level-replay.cjs');
const {BattleRunCheckpoint}=require('../.test-dist/systems/BattleRunCheckpoint');
const {PlacementModel}=require('../.test-dist/systems/PlacementModel');
const {EconomyLedger}=require('../.test-dist/systems/EconomyLedger');
const {PHASE_A_GRIDS}=require('../.test-dist/config/PhaseAGrids');
const {ARC_TOWER}=require('../.test-dist/config/ThirdLevelCombatConfig');
const {firstLevelTowerPanelPresentation}=require('../.test-dist/presentation/FirstLevelTowerPanelPresentation');

test('第三关180起始预算混合构筑可守完八波，旧双塔同起始预算对照在第五波失败',()=>{
 const mixed=replayThirdLevel();assert.equal(mixed.waveResults.length,8);assert.equal(mixed.coreHealth,6);
 assert.ok(mixed.telemetry.every(t=>t.gold>=0));assert.equal(mixed.totals.killed+mixed.totals.leaked,214);
 const legacy=replayThirdLevel(true);assert.equal(legacy.coreHealth,0);assert.equal(legacy.waveResults.at(-1).wave,5);
 assert.ok(mixed.waveResults.every(w=>w.killed+w.leaked>0));
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
