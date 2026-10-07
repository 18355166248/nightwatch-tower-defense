const test = require('node:test');
const assert = require('node:assert/strict');
const {firstLevelTowerPanelPresentation: present, firstLevelTowerPanelLayout: layout, firstLevelTowerPanelAction: action} = require('../.test-dist/presentation/FirstLevelTowerPanelPresentation');
const input = overrides => ({towerId:'rivet-gun',level:1,gold:80,saleRefund:30,opening:true,...overrides});

test('机枪升级收益、费用、金币差额和满级使用实际三阶配置',()=>{
    const first=present(input());assert.equal(first.upgrade,'升级 · 24');assert.equal(first.sell,'撤销 · +30');
    assert.match(first.preview,/伤害 7 → 11 · 射程 2.6 → 2.8/);assert.equal(first.upgradeEnabled,true);
    const poor=present(input({level:2,gold:20,saleRefund:54}));assert.equal(poor.upgrade,'还差 22 金币');assert.equal(poor.upgradeEnabled,false);
    const max=present(input({level:3,saleRefund:96}));assert.equal(max.upgrade,'已满级');assert.equal(max.upgradeEnabled,false);assert.doesNotMatch(max.preview,/下一级/);
});
test('冷凝面板不能沿用机枪伤害收益，控制百分比及持续时间来自配置',()=>{
    const frost=present(input({towerId:'frost-coil',saleRefund:40}));assert.equal(frost.stats[0].caption,'范围减速');assert.equal(frost.stats[0].value,'75%');assert.equal(frost.stats[2].value,'1.2 秒');
    assert.match(frost.preview,/减速 75% → 82%/);assert.equal(frost.upgrade,'升级 · 32');
});
test('战斗拆除显示五折、波间七折，禁用阶段不冒充可交易',()=>{
    const locked=present(input({saleRefund:null,opening:false}));assert.equal(locked.sell,'当前不可移除');assert.equal(locked.saleEnabled,false);
    const battle=present(input({saleRefund:15,opening:false,combat:true}));assert.equal(battle.sell,'拆除 · +15');assert.match(battle.help,/50%/);assert.equal(battle.saleEnabled,true);
    const interval=present(input({opening:false,saleRefund:21}));assert.equal(interval.sell,'出售 · +21');assert.match(interval.help,/70%/);
});
test('建造结果消费真实拒绝原因，拖放与点选确认提示不混淆',()=>{
    const placement={accepted:true,clickConfirm:false};const valid=present(input({placement}));assert.equal(valid.upgradeEnabled,false);assert.equal(valid.sell,'取消建造');assert.match(valid.preview,/松手建造/);
    const click=present(input({placement:{...placement,clickConfirm:true}}));assert.match(click.preview,/再次点落点建造/);assert.equal(click.upgradeEnabled,true);assert.equal(click.upgrade,'确认建造 · 30');
    const invalid=present(input({placement:{accepted:false,clickConfirm:false,reason:'would-block-path'}}));assert.equal(invalid.upgrade,'不可放置');assert.equal(invalid.invalid,true);assert.match(invalid.preview,/道路必须保持连通/);
    const poor=present(input({placement:{accepted:false,clickConfirm:false,reason:'insufficient-gold'}}));assert.match(poor.preview,/金币不足/);
});
test('390及320字号和按钮同比缩放，面板与常驻塔栏不相交',()=>{
    for(const width of [1080,1080*320/390]){
        const geometry=layout(width),px=390/1080;
        assert.ok((geometry.sell.top-geometry.sell.bottom)*px>=44);
        assert.ok((geometry.closeHit.top-geometry.closeHit.bottom)*px>=44);
        assert.ok(geometry.panel.bottom>-764);assert.ok(geometry.sell.right<geometry.upgrade.left);
        assert.ok(Math.abs(geometry.title.size-16*geometry.scale)<.001);
        for(const key of ['sell','upgrade','closeHit']){const rect=geometry[key];assert.equal(action({x:(rect.left+rect.right)/2,y:(rect.top+rect.bottom)/2},geometry),key==='closeHit'?'close':key);}
        assert.equal(action({x:geometry.panel.left+3,y:geometry.panel.top-3},geometry),'surface');assert.equal(action({x:0,y:geometry.panel.top+3},geometry),null);
    }
});

test('建造条不遮挡六列战场，战斗下排落点和确认按钮各自命中', () => {
    const {PhaseBLayout}=require('../.test-dist/presentation/PhaseBLayout');
    const {PHASE_A_GRIDS}=require('../.test-dist/config/PhaseAGrids');
    for(const width of [1080,1080*320/390]) {
        const board=new PhaseBLayout(); board.setVisibleWidth(width);
        const grid=PHASE_A_GRIDS['grid-6x13'], panel=layout(width,true);
        assert.ok(panel.panel.top <= board.boardMetrics(grid).bottom, '建造条必须位于棋盘外');
        for(let row=9;row<13;row++) for(let column=0;column<6;column++) {
            assert.equal(action(board.gridPointCenter({column,row},grid),panel),null,'下排落点不能被面板吞掉');
        }
        const rect=panel.upgrade;
        assert.equal(action({x:(rect.left+rect.right)/2,y:(rect.top+rect.bottom)/2},panel),'upgrade');
        assert.ok(Math.abs((rect.top-rect.bottom)/panel.scale-44)<1e-8);
    }
});

test('升级对比给出真实下一阶属性，满级没有虚构第四阶',()=>{
 for(const towerId of ['rivet-gun','frost-coil'])for(const level of [1,2,3]){
  const model=present(input({towerId,level}));assert.equal(model.nextLevel,level===3?null:level+1);
  for(const stat of model.stats)assert.equal(stat.nextValue===null,level===3);
 }
});

test('升级弹层跟随真实塔位，边缘格按钮仍命中且不落入底栏',()=>{
 const {PhaseBLayout}=require('../.test-dist/presentation/PhaseBLayout');
 const {PHASE_A_GRIDS}=require('../.test-dist/config/PhaseAGrids');
 for(const width of [1080,1080*320/390]){
  const board=new PhaseBLayout();board.setVisibleWidth(width);const grid=PHASE_A_GRIDS['grid-6x13'];
  const tops=new Set();
  for(let row=0;row<13;row++)for(let column=0;column<6;column++){
   const anchor={center:board.gridPointCenter({column,row},grid),cellSize:board.boardMetrics(grid).cellSize};
   const g=layout(width,false,anchor);tops.add(g.panel.top);
   assert.deepEqual(g.ring.menuCenter,anchor.center);
   assert.deepEqual(g.ring.center,anchor.center);
   assert.equal(g.closeHit,null);
   assert.equal(g.ring.options.length,2);
   assert.equal(g.upgrade.left,g.sell.left);assert.ok(g.upgrade.bottom>g.sell.top);
   for(const key of ['upgrade','sell']){
    const r=g[key];assert.equal(action({x:(r.left+r.right)/2,y:(r.bottom+r.top)/2},g),key==='closeHit'?'close':key);
   }
  }
  assert.ok(tops.size>3,'弹层随塔位变化，不再固定底部');
 }
});


test('升级说明只在悬停对应图标时存在，避让真实塔图、回收和关闭节点',()=>{
 const {firstLevelTowerPanelDetail:detail,firstLevelTowerPanelHoverAction:hover}=require('../.test-dist/presentation/FirstLevelTowerPanelPresentation');
 const {PhaseBLayout}=require('../.test-dist/presentation/PhaseBLayout');const {PHASE_A_GRIDS}=require('../.test-dist/config/PhaseAGrids');
 for(const width of [1080,1080*320/390]){
  const board=new PhaseBLayout();board.setVisibleWidth(width);const grid=PHASE_A_GRIDS['grid-9x13'];
  for(let row=0;row<grid.rows;row++)for(let column=0;column<grid.columns;column++){
   const anchor={center:board.gridPointCenter({row,column},grid),cellSize:board.boardMetrics(grid).cellSize},g=layout(width,false,anchor);
   assert.equal(detail(input({anchor}),width),null,'单击展开后无常驻说明');
   assert.equal(hover({x:0,y:-950},g),null);
   for(const hoverAction of ['upgrade','sell']){
    const d=detail(input({anchor,hoverAction}),width),r=d.rect;
    assert.ok(r.left>=-width/2-.001&&r.right<=width/2+.001&&r.top<=960.001&&r.bottom>=-960.001);
    for(const protectedRect of d.protectedRects)assert.ok(!(r.left<protectedRect.right&&r.right>protectedRect.left&&r.bottom<protectedRect.top&&r.top>protectedRect.bottom),'提示不能挡住塔图或操作节点');
   }
   assert.equal(hover({x:(g.upgrade.left+g.upgrade.right)/2,y:g.upgrade.top+10*g.scale},g),'upgrade','炮头伸出按钮仍可悬停');
  }
 }
 const anchor={center:{x:0,y:0},cellSize:80};
 const sale=detail(input({anchor,hoverAction:'sell'}),1080);assert.match(sale.footer,/30/);
 const next=detail(input({anchor,hoverAction:'upgrade'}),1080);assert.match(next.title,/Lv.2/);assert.match(next.body,/11/);
 const max=detail(input({anchor,level:3,hoverAction:'upgrade'}),1080);assert.match(max.footer,/已满级/);
});

// 升级的炮头、等级点和价牌比圆钮大，顶行和末行也必须全部避开HUD。
test('四档屏宽全棋盘升级始终在真实塔的正上正下，距离对称',()=>{
 const {PhaseBLayout}=require('../.test-dist/presentation/PhaseBLayout');const {PHASE_A_GRIDS}=require('../.test-dist/config/PhaseAGrids');
 const {battleFloatingBounds}=require('../.test-dist/presentation/CellBuildMenuPresentation');
 for(const width of [1080*320/390,1080*375/390,1080,1080*414/390]){
  const board=new PhaseBLayout();board.setVisibleWidth(width);const grid=PHASE_A_GRIDS['grid-9x13'],bounds=battleFloatingBounds(board);
  for(let row=0;row<grid.rows;row++)for(let column=0;column<grid.columns;column++){
   const anchor={center:board.gridPointCenter({row,column},grid),cellSize:board.boardMetrics(grid).cellSize};
   const g=layout(width,false,anchor);
   assert.deepEqual(g.ring.menuCenter,anchor.center);
   assert.ok(Math.abs((g.upgrade.left+g.upgrade.right)/2-anchor.center.x)<.001);
   assert.ok(Math.abs((g.upgrade.top+g.upgrade.bottom+g.sell.top+g.sell.bottom)/4-anchor.center.y)<.001);
   assert.ok(g.ring.footprints[0].bottom>g.ring.footprints[1].top);
   assert.equal(action({x:(g.upgrade.left+g.upgrade.right)/2,y:g.upgrade.bottom-7*g.scale},g),'upgrade','伸出的价格牌也能点击升级');
   const protectedTower={left:anchor.center.x-28*g.scale,right:anchor.center.x+28*g.scale,bottom:anchor.center.y-28*g.scale,top:anchor.center.y+40*g.scale};
   for(const r of g.ring.footprints)assert.ok(!(r.left<protectedTower.right&&r.right>protectedTower.left&&r.bottom<protectedTower.top&&r.top>protectedTower.bottom));
  }
 }
});
