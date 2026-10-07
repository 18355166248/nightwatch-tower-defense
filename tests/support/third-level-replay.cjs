const {replayFirstLevel}=require('./first-level-replay.cjs');
const {ALL_TOWERS,THIRD_LEVEL_WAVES}=require('../../.test-dist/config/ThirdLevelCombatConfig');
const {PHASE_B_TOWERS}=require('../../.test-dist/config/PhaseBCombatConfig');

// 同样的180起始预算、塔位和消费顺序；旧双塔对照把穿甲/电弧位替换成机枪，不补贴额外金币。
function replayThirdLevel(legacy=false){
 const choose=id=>legacy && (id==='piercing-cannon'||id==='arc-tower')?'rivet-gun':id;
 const opening=[['piercing-cannon',4,2],['frost-coil',3,3],['arc-tower',5,3]].map(([id,column,row])=>({towerId:choose(id),cell:{column,row}}));
 const builds=[['piercing-cannon',4,6],['arc-tower',3,7],['frost-coil',5,7],['piercing-cannon',4,9],['arc-tower',3,10],['rivet-gun',5,10]];
 let next=0;
 return replayFirstLevel({startingGold:180,towers:legacy?PHASE_B_TOWERS:ALL_TOWERS,waves:THIRD_LEVEL_WAVES,opening,reinforcements:[],upgradesAfterWave:[],onWaveClear:({model})=>{
  for(const d of model.deployments)if(d.towerId===choose('piercing-cannon'))while(model.upgrade(d.cell).accepted){}
  while(next<builds.length){const [id,column,row]=builds[next],towerId=choose(id),preview=model.preview({column,row},[],towerId);if(!preview.accepted)break;model.commit(preview,[]);next++;}
  for(const d of model.deployments)while(model.upgrade(d.cell).accepted){}
 }});
}
module.exports={replayThirdLevel};
