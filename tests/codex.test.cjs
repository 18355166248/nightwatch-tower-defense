const test=require('node:test');const assert=require('node:assert/strict');
const {CampaignMenu,campaignLayout,campaignAction}=require('../.test-dist/presentation/CampaignMenuPresentation');
const {codexEntry,codexCount,codexEnemies,codexLayout}=require('../.test-dist/presentation/CodexPresentation');
const {ALL_TOWERS}=require('../.test-dist/config/ThirdLevelCombatConfig');
const {towerAtLevel}=require('../.test-dist/systems/TowerLevelRules');
const {LEVELS}=require('../.test-dist/config/LevelCatalog');
const center=r=>({x:(r.left+r.right)/2,y:(r.top+r.bottom)/2});
test('图鉴可浏览全部炮塔和三级属性，循环翻页与返回保持原选关',()=>{
 const menu=new CampaignMenu();menu.openMap();menu.select(2,3);const before=menu.snapshot;menu.openCodex();
 for(let i=0;i<ALL_TOWERS.length;i++){
  for(const level of [1,2,3]){
   menu.browseCodex(level);const e=codexEntry(menu.snapshot.codex),actual=towerAtLevel(ALL_TOWERS[i],level);
   assert.equal(e.id,ALL_TOWERS[i].id);assert.equal(e.stats[0][1],String(actual.damage));
   assert.equal(e.stats[3][1],`${actual.cost} 金币`);
  }menu.browseCodex('next');
 }
 assert.equal(menu.snapshot.codex.index,0);menu.browseCodex('previous');assert.equal(menu.snapshot.codex.index,3);
 menu.browseCodex('enemies');assert.equal(menu.snapshot.codex.index,0);assert.equal(menu.snapshot.codex.level,1);
 assert.equal(codexCount('enemies'),5);menu.closeCodex();assert.deepEqual(menu.snapshot,before);
 menu.welcome();menu.openCodex();menu.closeCodex();assert.equal(menu.snapshot.screen,'welcome');
});
test('怪物图鉴覆盖真实波次，坦克护甲和护盾数值无错配，范围包含全部关卡',()=>{
 const enemies=codexEnemies(),ids=new Set(Object.values(LEVELS).flatMap(l=>l.waves.flatMap(w=>w.groups.map(g=>g.enemy.id))));
 assert.deepEqual(new Set(enemies.map(e=>e.id)),ids);
 for(const [index,enemy] of enemies.entries()){
  const detail=codexEntry({category:'enemies',index,level:1});assert.equal(detail.label,enemy.label);
  for(const level of Object.values(LEVELS))for(const wave of level.waves)for(const g of wave.groups){
   if(g.enemy.id===enemy.id){assert.ok(enemy.health.includes(g.enemy.maxHealth));assert.ok(enemy.levels.includes(level.label));}
  }
  if(enemy.id==='siege-tank'){assert.equal(detail.stats[2][1],'65%');assert.match(detail.advice,/穿甲炮/);}
  if(enemy.id==='shield-guard'){assert.equal(detail.stats[3][1],'160');assert.match(detail.advice,/电弧塔/);}
 }
});
test('欢迎页和地图图鉴入口可达，图鉴热区独立且等级按钮仅炮塔可用',()=>{
 for(const width of [1080*320/390,1080]){
  const menu=new CampaignMenu();for(const screen of ['welcome','map']){
   if(screen==='map')menu.openMap();const l=campaignLayout(width,menu.snapshot,3);
   assert.equal(campaignAction(center(l.codex),width,menu.snapshot,3),'codex');
   assert.ok(l.codex.top<(screen==='welcome'?l.start.bottom:768));
  }
  menu.openCodex();const g=codexLayout(width);
  assert.equal(campaignAction(center(g.tabs[0]),width,menu.snapshot,3),'codex-towers');
  assert.equal(campaignAction(center(g.tabs[1]),width,menu.snapshot,3),'codex-enemies');
  assert.equal(campaignAction(center(g.next),width,menu.snapshot,3),'next');
  for(let i=0;i<3;i++)assert.deepEqual(campaignAction(center(g.tiers[i]),width,menu.snapshot,3),{codexLevel:i+1});
  menu.browseCodex('enemies');assert.equal(campaignAction(center(g.tiers[0]),width,menu.snapshot,3),null);
 }
});
