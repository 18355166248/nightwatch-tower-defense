const fs=require('node:fs');
const path=require('node:path');
const {runMatrix,priorOptions}=require('../tests/support/third-level-balance.cjs');
const {replayThirdLevel}=require('../tests/support/third-level-replay.cjs');
const r=replayThirdLevel();
const report={generatedOn:'2026-10-08',scope:'真实战斗系统自动回放；固定策略场景通过比例，不是真人胜率或浏览器完整游玩验收',
 before:runMatrix(priorOptions()),after:runMatrix(),recommended:{
  opening:[{tower:'piercing-cannon',column:4,row:2},{tower:'frost-coil',column:3,row:3},{tower:'arc-tower',column:5,row:3}],
  coordinates:'0-based grid; player guide uses 1-based rows and columns',coreHealth:r.coreHealth,
  waveResults:r.waveResults,purchases:r.purchases,telemetry:r.telemetry.map(t=>({wave:t.wave,gold:t.gold,combatSeconds:t.combatSeconds,pathLength:t.pathLength})),
 }};
const output=path.resolve(__dirname,'../docs/validation/third-level-balance-2026-10-08.json');
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(`before ${report.before.passed}/${report.before.total}; after ${report.after.passed}/${report.after.total}; recommended core ${r.coreHealth}/10`);
