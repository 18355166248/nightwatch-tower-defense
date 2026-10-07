const test=require('node:test');const assert=require('node:assert/strict');
const {CampaignMenu,campaignStages,campaignLayout,campaignAction}=require('../.test-dist/presentation/CampaignMenuPresentation');
const {LEVELS}=require('../.test-dist/config/LevelCatalog');
const center=r=>({x:(r.left+r.right)/2,y:(r.bottom+r.top)/2});
test('欢迎页只提供开始入口，关卡选择不直接部署且返回保留选择',()=>{
 const menu=new CampaignMenu();assert.equal(menu.snapshot.screen,'welcome');
 const layout=campaignLayout(1080,menu.snapshot,2);
 assert.equal(campaignAction(center(layout.start),1080,menu.snapshot,2),'start');
 assert.equal(campaignAction({x:-155,y:450},1080,menu.snapshot,2),null);
 menu.openMap();menu.select(1,2);assert.equal(menu.snapshot.selectedIndex,1);
 menu.welcome();assert.equal(menu.snapshot.screen,'welcome');menu.openMap();assert.equal(menu.snapshot.selectedIndex,1);
 const before=menu.snapshot;menu.select(3,2);assert.equal(menu.snapshot,before);
});
test('目录自动生成地图与每关独立记录，不将未通关伪造成已通关',()=>{
 const stages=campaignStages(id=>({bestSeconds:id==='first-level'?420:null,bestHealth:id==='first-level'?9:null}));
 assert.deepEqual(stages.map(s=>s.id),Object.keys(LEVELS));
 assert.equal(stages[0].guided,true);assert.equal(stages[1].guided,false);
 assert.equal(stages[0].bestHealth,9);assert.equal(stages[1].bestHealth,null);
});
test('独立配塔页只接收确认和返回，地图据点点击不穿透，返回保持选关',()=>{
 const menu=new CampaignMenu();menu.openMap();menu.select(1,2);menu.openLoadout();
 assert.equal(menu.snapshot.screen,'loadout');
 const l=campaignLayout(1080,menu.snapshot,2);
 assert.equal(campaignAction(center(l.deploy),1080,menu.snapshot,2),'deploy');
 assert.equal(campaignAction(center(l.back),1080,menu.snapshot,2),'back');
 for(const node of l.stages) assert.equal(campaignAction({x:node.x,y:node.y},1080,menu.snapshot,2),null);
 menu.openMap();assert.equal(menu.snapshot.selectedIndex,1);
});
test('扩展到二十关时分页可达所有关卡，非本页节点不参与命中',()=>{
 const menu=new CampaignMenu();menu.openMap();const seen=[];
 for(let page=0;page<7;page++){
  const l=campaignLayout(1080,menu.snapshot,20);
  for(const s of l.stages){seen.push(s.index);assert.deepEqual(campaignAction({x:s.x,y:s.y},1080,menu.snapshot,20),{select:s.index});}
  if(page<6){assert.equal(campaignAction(center(l.next),1080,menu.snapshot,20),'next');menu.turnPage(1,20);}
 }
 assert.deepEqual(seen,Array.from({length:20},(_,i)=>i));
 menu.turnPage(1,20);assert.equal(menu.snapshot.page,6);menu.select(19,20);assert.equal(menu.snapshot.page,6);
 for(let i=0;i<10;i++)menu.turnPage(-1,20);assert.equal(menu.snapshot.page,0);
});
test('窄屏与宽屏使用同一可见按钮几何，关卡热区与固定菜单不重叠',()=>{
 for(const width of [600,780,1080,1440]){
  const state={screen:'map',selectedIndex:0,page:0};const l=campaignLayout(width,state,12);
  assert.equal(campaignAction(center(l.deploy),width,state,12),'deploy');
  assert.equal(campaignAction(center(l.back),width,state,12),'back');
  assert.equal(campaignAction(center(l.settings),width,state,12),'settings');
  for(const s of l.stages){assert.ok(s.hit.left>=-l.half&&s.hit.right<=l.half);assert.ok(s.hit.bottom>-440&&s.hit.top<690);}
 }
});
