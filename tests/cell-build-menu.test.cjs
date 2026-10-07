const test=require('node:test');const assert=require('node:assert/strict');
const {PhaseBLayout}=require('../.test-dist/presentation/PhaseBLayout');
const {PHASE_A_GRIDS}=require('../.test-dist/config/PhaseAGrids');
const {cellBuildMenuLayout,cellBuildMenuAction,cellBuildDetailLayout,battleFloatingBounds}=require('../.test-dist/presentation/CellBuildMenuPresentation');
const {FirstLevelExperience}=require('../.test-dist/presentation/FirstLevelExperience');
const {firstLevelCoachPresentation}=require('../.test-dist/presentation/FirstLevelCoachPresentation');
test('全棋盘四档宽度1–5塔固定完整圆周，真实塔位固定圆心、卡片价牌彼此分离，不误购买',()=>{
 for(const width of [1080*320/390,1080*375/390,1080,1080*414/390]){
  const layout=new PhaseBLayout();layout.setVisibleWidth(width);const grid=PHASE_A_GRIDS['grid-9x13'];const bounds=battleFloatingBounds(layout);
  for(let row=0;row<grid.rows;row++)for(let column=0;column<grid.columns;column++){
   for(const count of [1,2,3,4,5]) {
   const g=cellBuildMenuLayout(layout,grid,{row,column},count);assert.deepEqual(g.menuCenter,g.center);
   assert.deepEqual(g.center,layout.gridPointCenter({row,column},grid));
   assert.equal(g.startAngle,count===4?Math.PI/4:Math.PI/2,'靠边不能旋转或压缩成扇形');assert.equal(g.span,Math.PI*2);
   for(let i=0;i<count;i++)for(let j=i+1;j<count;j++){const a=g.footprints[i],b=g.footprints[j];assert.ok(!(a.left<b.right&&a.right>b.left&&a.bottom<b.top&&a.top>b.bottom),'整张卡片及价格必须分离');}
   g.options.forEach((r,i)=>assert.equal(cellBuildMenuAction({x:(r.left+r.right)/2,y:(r.top+r.bottom)/2},g),i));
   assert.equal(g.close,undefined);assert.equal(g.options.length,count);
   assert.equal(cellBuildMenuAction({x:0,y:-950},g),null);
   assert.equal(cellBuildMenuAction(g.center,g),null,'中央落点不能误购买');
   assert.ok(Math.abs((g.options[0].top-g.options[0].bottom)/g.scale-60)<.001);
   for(let index=0;index<count;index++){
    const tip=cellBuildDetailLayout(layout,g,index);
    assert.ok(tip.left>=bounds.left-.001&&tip.right<=bounds.right+.001&&tip.top<=bounds.top+.001&&tip.bottom>=bounds.bottom-.001);
    for(const r of g.footprints)assert.ok(!(tip.left<r.right&&tip.right>r.left&&tip.bottom<r.top&&tip.top>r.bottom),'说明不能遮挡购买图标');
   }
   const points=g.options.map(r=>({x:(r.left+r.right)/2-g.menuCenter.x,y:(r.top+r.bottom)/2-g.menuCenter.y}));
   if(count===3){assert.equal(g.span,Math.PI*2);assert.ok(Math.abs(g.stepAngle-Math.PI*2/3)<.001);}
   if(count!==2)points.forEach(p=>assert.ok(Math.abs(Math.hypot(p.x,p.y)-g.radius)<.001));
   else {assert.ok(Math.abs(points[0].x-points[1].x)<.001);assert.ok(points[0].y>points[1].y);}
   if(count!==2)for(let i=1;i<count;i++){
    const angle=Math.atan2(points[i].y,points[i].x)-Math.atan2(points[i-1].y,points[i-1].x);
    assert.ok(Math.abs(Math.atan2(Math.sin(angle+g.stepAngle),Math.cos(angle+g.stepAngle)))<.001,'相邻选项角度相等');
   }
   for(let i=0;i<count;i++)for(let j=i+1;j<count;j++)assert.ok(Math.hypot(points[i].x-points[j].x,points[i].y-points[j].y)>=60*g.scale-.001,'圆形按钮不重叠');

  }}
 }
});
test('新手起步指向地图空地，并说明任意塔型可直接建造',()=>{
 const flow=new FirstLevelExperience(false);flow.begin();
 const snapshot=flow.snapshot({preparing:true,towerCount:0,pathDelta:0,previewAccepted:null,inputMode:'idle',gold:140,phase:'preparing',wave:0,occupiedCells:new Set(),towerLevelsByCell:new Map(),guidedIntermissionHeld:false});
 assert.match(snapshot.guidanceText,/空地/);
 const ui=firstLevelCoachPresentation({experience:snapshot,phase:'preparing',preparing:true,held:false,overlayVisible:false,panelVisible:false,guidanceText:'',countdownSeconds:0});
 assert.match(ui.title,/空地/);assert.match(ui.body,/任意一种/);
});
