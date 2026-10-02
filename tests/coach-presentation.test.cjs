const test = require('node:test');
const assert = require('node:assert/strict');
const {firstLevelCoachPresentation:present,firstLevelCoachLayout:layout,firstLevelCoachSkipVisible:skip} = require('../.test-dist/presentation/FirstLevelCoachPresentation');
const input = overrides => ({experience:{mode:'guided',step:'select',guidanceText:'推荐布防 1/4 · 点机枪塔\n点上路高亮格，逼敌改道'},
    phase:'preparing',preparing:true,held:false,overlayVisible:false,panelVisible:false,guidanceText:'',countdownSeconds:8,...overrides});

test('首个教学动作按获批小提示层次呈现，不改变规则快照',()=>{
    const state=input();const original=JSON.stringify(state);const model=present(state);
    assert.equal(model.title,'拿起机枪塔');assert.equal(model.progress,'布防 1 / 4');assert.equal(model.visible,true);assert.equal(model.skipVisible,true);
    assert.equal(JSON.stringify(state),original);
});
test('预览/选塔让位，用户暂停隐藏，普通战斗不留下教学和跳过热区',()=>{
    assert.equal(present(input({panelVisible:true})).visible,false);
    const overlay=present(input({overlayVisible:true}));assert.equal(overlay.visible,false);assert.equal(overlay.skipVisible,false);
    const combat=input({preparing:false,phase:'spawning',experience:{mode:'guided',step:'combat',guidanceText:'战斗中也能补塔'}});
    assert.equal(present(combat).visible,false);assert.equal(skip('guided','spawning',false,false,false),false);
});
test('真实教学待命与自由倒计时区分，倒计时整秒刷新不冒充等待确认',()=>{
    const hold=present(input({preparing:false,phase:'paused',held:true,experience:{mode:'guided',step:'ready',guidanceText:'金币不足补塔\n点右下“开始下一波”'}}));
    assert.equal(hold.visible,true);assert.equal(hold.progress,'等待你继续');assert.match(hold.title,/金币不足/);
    const free=present(input({preparing:false,phase:'countdown',experience:{mode:'free',step:null,guidanceText:null},countdownSeconds:7.1}));
    assert.equal(free.progress,'8秒后自动开波');assert.equal(free.skipVisible,false);assert.match(free.help,/不等待确认/);
});
test('后期冷凝升级沿真实建议，不硬编码中段机枪，目标选中才高亮',()=>{
    const state=input({preparing:false,phase:'paused',held:true,panelVisible:true,upgradeTargetSelected:true,
        experience:{mode:'guided',step:'upgrade',guidanceText:'增强重甲减速 · 升到 Lv2\n再点右下开波'}});
    const model=present(state);assert.equal(model.title,'增强重甲减速');assert.equal(model.visible,false);assert.equal(model.upgradeHighlighted,true);
    assert.equal(present({...state,upgradeTargetSelected:false}).upgradeHighlighted,false);
    assert.equal(present({...state,overlayVisible:true}).upgradeHighlighted,false);
});
test('390和320几何等比，轻卡不侵入常驻塔栏，跳过热区不少于44px',()=>{
    for(const width of [1080,1080*320/390]){
        const g=layout(width);assert.ok(g.card.bottom>-764);assert.equal((g.card.top-g.card.bottom)/g.scale,74);
        assert.ok((g.skip.top-g.skip.bottom)*390/1080>=44);assert.ok(Math.abs(g.title.size/g.scale-13)<.001);
        assert.ok(g.lineup.rect.right<g.skip.left);assert.ok(g.skip.bottom>g.card.top);
    }
});
