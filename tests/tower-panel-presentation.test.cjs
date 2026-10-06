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
        assert.ok(Math.abs(geometry.title.size-14*geometry.scale)<.001);
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
