const {LEVELS,SECOND_LEVEL_BASE_WAVES}=require('../.test-dist/config/LevelCatalog');
const {replayFirstLevel}=require('../tests/support/first-level-replay.cjs');
const strategy=require('../tests/support/second-level-strategy.cjs');
for(const [version,policy,waves,plan]of [
 ['previous','first-level-plan',SECOND_LEVEL_BASE_WAVES,{}],
 ['strengthened','first-level-plan',LEVELS['second-level'].waves,{}],
 ['strengthened','delayed-upgrades',LEVELS['second-level'].waves,{...strategy,upgradesAfterWave:strategy.upgradesAfterWave.map(u=>({...u,wave:u.wave+1}))}],
 ['strengthened','segmented-route',LEVELS['second-level'].waves,strategy],
]){
 const r=replayFirstLevel({waves,startingGold:160,...plan});
 console.log(JSON.stringify({version,policy,health:r.coreHealth,waves:r.waveResults.length,leaks:r.waveResults.map(w=>w.leaked),gold:r.gold}));
}
