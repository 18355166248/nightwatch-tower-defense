const {replayFirstLevel}=require('./first-level-replay.cjs');
const {ALL_TOWERS,THIRD_LEVEL_WAVES,THIRD_LEVEL_STARTING_GOLD}=require('../../.test-dist/config/ThirdLevelCombatConfig');
const {PHASE_B_TOWERS}=require('../../.test-dist/config/PhaseBCombatConfig');

// 对照共享当前关卡预算、塔位和消费顺序；旧双塔只替换塔种，不补贴额外金币。
function replayThirdLevel(legacy=false, options={}){
 const choose=id=>legacy && (id==='piercing-cannon'||id==='arc-tower')?'rivet-gun':id;
 const opening=(options.opening??[['piercing-cannon',4,2],['frost-coil',3,3],['arc-tower',5,3]]).map(([id,column,row])=>({towerId:choose(id),cell:{column,row}}));
 const builds=options.builds??[['piercing-cannon',4,6],['arc-tower',3,7],['frost-coil',5,7],['piercing-cannon',4,9],['arc-tower',3,10],['rivet-gun',5,10]];
 let next=0;const purchases=[];
 const result=replayFirstLevel({frameDeltaSeconds:options.frameDeltaSeconds??1/30,speedScale:options.speedScale??1,startingGold:options.startingGold??THIRD_LEVEL_STARTING_GOLD,towers:legacy?PHASE_B_TOWERS:ALL_TOWERS,waves:options.waves??THIRD_LEVEL_WAVES,opening,reinforcements:[],upgradesAfterWave:[],onWaveClear:({model,wave})=>{
  // 跳过一次波间消费模拟玩家漏做升级；所有后续购买仍受真实金币和合法塔位约束。
  if(wave===options.skipPurchaseWave||wave===(options.waves??THIRD_LEVEL_WAVES).length)return;
  const upgrade=d=>{let r;while((r=model.upgrade(d.cell)).accepted)purchases.push({afterWave:wave,kind:'upgrade',towerId:d.towerId,cell:d.cell,level:r.level,gold:model.gold});};
  const build=()=>{while(next<builds.length){const [id,column,row]=builds[next],towerId=choose(id),cell={column,row},preview=model.preview(cell,[],towerId);if(!preview.accepted)break;model.commit(preview,[]);purchases.push({afterWave:wave,kind:'build',towerId,cell,level:1,gold:model.gold});next++;}};
  if(options.buildFirst)build();
  for(const d of model.deployments)if(d.towerId===choose('piercing-cannon'))upgrade(d);
  if(!options.buildFirst)build();
  for(const d of model.deployments)upgrade(d);
 }});
 return {...result,purchases};
}
module.exports={replayThirdLevel};
