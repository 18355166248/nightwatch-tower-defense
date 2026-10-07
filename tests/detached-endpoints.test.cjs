const test=require('node:test');const assert=require('node:assert/strict');
const {PhaseBLayout}=require('../.test-dist/presentation/PhaseBLayout');
const {PHASE_A_GRIDS}=require('../.test-dist/config/PhaseAGrids');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('上下地标在棋盘外对齐主通道，奇偶列与窄屏均不占用格子或底部引导',()=>{
 for(const width of [600,780,1080])for(const grid of Object.values(PHASE_A_GRIDS)){
  const layout=new PhaseBLayout();layout.setVisibleWidth(width);const board=layout.boardMetrics(grid);
  const entry=layout.routePointCenter(grid.entry,grid),exit=layout.routePointCenter(grid.exit,grid);
  assert.equal(entry.x,0);assert.equal(exit.x,0);assert.ok(entry.y>board.bottom+board.height);assert.ok(exit.y<board.bottom);
  assert.equal(layout.pointToCell(entry,grid),null);assert.equal(layout.pointToCell(exit,grid),null);
  for(const endpoint of [grid.entry,grid.exit])assert.deepEqual(layout.pointToCell(layout.gridPointCenter(endpoint,grid),grid),endpoint);
  assert.ok(exit.y-board.cellSize*.61>-498,'核心不能压住底部引导卡');
 }
});
test('出入场向任一合法相邻格移动，沿正交道路连续移动，不发生跳位',()=>{
 const layout=new PhaseBLayout();const grid=PHASE_A_GRIDS['grid-6x13'];
 for(const cell of [grid.entry,grid.exit])for(const [dc,dr]of [[1,0],[-1,0],[0,cell.row===0?1:-1]]){
  const neighbor={column:cell.column+dc,row:cell.row+dr};const a=layout.routePointCenter(cell,grid),b=layout.routePointCenter(neighbor,grid);
  assert.deepEqual(b,layout.gridPointCenter(neighbor,grid));
  for(const t of [0,.01,.25,.5,.75,.99,1]){
   const p=layout.routePointCenter({column:cell.column+dc*t,row:cell.row+dr*t},grid);
   const original=layout.gridPointCenter(cell,grid);
   assert.ok(Math.abs(p.x-a.x)<1e-8 || Math.abs(p.y-original.y)<1e-8 || Math.abs(p.x-original.x)<1e-8,'居中接驳与格心改路必须沿正交道路');
   if(t===0){near(p.x,a.x);near(p.y,a.y);}if(t===1){near(p.x,b.x);near(p.y,b.y);}
  }
 }
});
test('独立端点不改变其他塔位、格子命中和路线中段显示',()=>{
 const layout=new PhaseBLayout();const grid=PHASE_A_GRIDS['grid-6x13'];
 for(let row=0;row<grid.rows;row++)for(let column=0;column<grid.columns;column++){
  const cell={column,row};if([grid.entry,grid.exit].some(p=>p.column===column&&p.row===row))continue;
  assert.deepEqual(layout.routePointCenter(cell,grid),layout.gridPointCenter(cell,grid));
  assert.deepEqual(layout.pointToCell(layout.gridPointCenter(cell,grid),grid),cell);
 }
});

test('接驳段直进直出，水平改路仅在棋盘内直角转向，不绘制斜边',()=>{
 const l=new PhaseBLayout(),g=PHASE_A_GRIDS['grid-6x13'];
 for(const path of [[g.entry,{column:2,row:1},{column:2,row:11},g.exit],
  [g.entry,{column:3,row:0},{column:3,row:12},g.exit]]){
  const points=l.routePolyline(path,g);
  for(let i=1;i<points.length;i++)assert.ok(points[i].x===points[i-1].x||points[i].y===points[i-1].y);
  assert.equal(points[0].x,points[1].x);assert.equal(points.at(-1).x,points.at(-2).x);
 }
});
