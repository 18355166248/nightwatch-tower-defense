const test=require('node:test');const assert=require('node:assert/strict');
const {PhaseBLayout}=require('../.test-dist/presentation/PhaseBLayout');
const {PHASE_A_GRIDS}=require('../.test-dist/config/PhaseAGrids');
const {cellBuildMenuLayout,cellBuildMenuAction}=require('../.test-dist/presentation/CellBuildMenuPresentation');
const {FirstLevelExperience}=require('../.test-dist/presentation/FirstLevelExperience');
const {firstLevelCoachPresentation}=require('../.test-dist/presentation/FirstLevelCoachPresentation');
test('每个地图格的多塔菜单都在安全范围内，塔型与关闭热区独立且命中一致',()=>{
 for(const width of [1080,1080*320/390]){
  const layout=new PhaseBLayout();layout.setVisibleWidth(width);const grid=PHASE_A_GRIDS['grid-6x13'];
  for(let row=0;row<13;row++)for(let column=0;column<6;column++){
   const g=cellBuildMenuLayout(layout,grid,{row,column});assert.ok(g.panel.left>=-layout.safeHalfWidth);assert.ok(g.panel.right<=layout.safeHalfWidth);
   assert.ok(g.panel.top<=730);assert.ok(g.panel.bottom> -764);
   g.options.forEach((r,i)=>assert.equal(cellBuildMenuAction({x:(r.left+r.right)/2,y:(r.top+r.bottom)/2},g),i));
   assert.equal(cellBuildMenuAction({x:(g.close.left+g.close.right)/2,y:(g.close.top+g.close.bottom)/2},g),'close');
   assert.equal(cellBuildMenuAction({x:0,y:-950},g),null);
   assert.ok((g.options[0].top-g.options[0].bottom)/g.scale>=44);
  }
 }
});
test('新手起步指向地图空地，并说明任意塔型可直接建造',()=>{
 const flow=new FirstLevelExperience(false);flow.begin();
 const snapshot=flow.snapshot({preparing:true,towerCount:0,pathDelta:0,previewAccepted:null,inputMode:'idle',gold:140,phase:'preparing',wave:0,occupiedCells:new Set(),towerLevelsByCell:new Map(),guidedIntermissionHeld:false});
 assert.match(snapshot.guidanceText,/空地/);
 const ui=firstLevelCoachPresentation({experience:snapshot,phase:'preparing',preparing:true,held:false,overlayVisible:false,panelVisible:false,guidanceText:'',countdownSeconds:0});
 assert.match(ui.title,/空地/);assert.match(ui.body,/任意一种/);
});
