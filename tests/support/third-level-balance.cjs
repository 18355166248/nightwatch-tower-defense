const {replayThirdLevel}=require('./third-level-replay.cjs');
const {THIRD_LEVEL_WAVE_BLUEPRINTS}=require('../../.test-dist/config/ThirdLevelCombatConfig');
const opening=[['piercing-cannon',4,2],['frost-coil',3,3],['arc-tower',5,3]];

// 固定场景交叉组合，前后版本使用完全相同的策略，不能挑选新版本胜局充当真人胜率。
function balanceCases(){
 const cases=[];
 for(const shift of [-1,0,1])for(const buildFirst of [false,true])for(const skipPurchaseWave of [0,1,2,3]){
  cases.push({name:`row${shift}/buildFirst${buildFirst}/skip${skipPurchaseWave}`,
   options:{opening:opening.map(([id,c,r])=>[id,c,r+shift]),buildFirst,skipPurchaseWave}});
 }
 return cases;
}
function priorOptions(){
 return {startingGold:180,waves:THIRD_LEVEL_WAVE_BLUEPRINTS.map(w=>({...w,groups:w.groups.map(g=>({...g,
  spawnIntervalSeconds:g.spawnIntervalSeconds*(w.wave>=6?.8:w.wave>=4?.9:1)}))}))};
}
function runMatrix(overrides={}){
 const scenarios=balanceCases().map(({name,options})=>{
  const r=replayThirdLevel(false,{...options,...overrides});
  return {name,passed:r.coreHealth>0&&r.waveResults.length===8,coreHealth:r.coreHealth,
   lastWave:r.waveResults.at(-1).wave,leaks:r.waveResults.map(w=>w.leaked)};
 });
 return {total:scenarios.length,passed:scenarios.filter(s=>s.passed).length,scenarios};
}
module.exports={balanceCases,priorOptions,runMatrix};
