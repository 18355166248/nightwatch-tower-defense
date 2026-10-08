const test = require('node:test');
const assert = require('node:assert/strict');
const { firstLevelConfirmationPresentation, firstLevelConfirmationLayout } = require('../.test-dist/presentation/FirstLevelConfirmationPresentation');
const { phaseBConfirmationButtons, phaseBPauseButtons, PhaseBLayout } = require('../.test-dist/presentation/PhaseBLayout');

test('重新开始确认明确清空炮塔和恢复关卡初始金币，不暗示保留战前部署', () => {
    const copy = firstLevelConfirmationPresentation('confirm-restart');
    assert.match(copy.body[0], /清空全部炮塔/);
    assert.match(copy.body[0], /金币恢复关卡初始值/);
    assert.match(copy.body[1], /核心生命与波次重新开始/);
    assert.deepEqual(copy.actions, ['确认重新开始', '保留原局 · 返回暂停']);
    assert.deepEqual(copy.actionKinds, ['restart', 'cancel']);
});

test('返回地图的安全主操作为取消；次操作明确结束本局，文案与动作不串位', () => {
    const copy = firstLevelConfirmationPresentation('confirm-home');
    assert.equal(copy.title, '返回地图？');
    assert.match(copy.body[0], /本局进度不会保存/);
    assert.match(copy.body[2], /纪录与设置仍保留/);
    assert.deepEqual(copy.actions, ['保留原局 · 返回暂停', '结束本局 · 返回地图']);
    assert.deepEqual(copy.actionKinds, ['cancel', 'home']);
});

test('390与320获批稿文字和几何同比例，两个54高按钮缩放后仍至少44px', () => {
    for (const width of [1080, 1080 * 320 / 390]) {
        const layout = firstLevelConfirmationLayout(width);
        const px = 390 / 1080;
        assert.ok(Math.abs(layout.title.size * px - 17 * width / 1080) < 0.001);
        assert.ok((layout.buttons[0].top - layout.buttons[0].bottom) * px >= 44);
        assert.ok(layout.buttons[0].bottom > layout.buttons[1].top);
        assert.ok(layout.footer.rect.bottom > layout.panel.bottom);
        for (const screen of ['confirm-home', 'confirm-restart', 'route-error']) {
            assert.deepEqual(phaseBConfirmationButtons(screen, width), layout.buttons);
            const hit = new PhaseBLayout();
            hit.setVisibleWidth(width);
            for (const rect of layout.buttons) {
                assert.deepEqual(hit.safeRect(rect), rect);
                assert.equal(hit.insideRect({x:(rect.left+rect.right)/2,y:(rect.top+rect.bottom)/2}, rect), true);
            }
        }
    }
    assert.deepEqual(phaseBConfirmationButtons('menu', 1080), phaseBPauseButtons('menu'));
});

test('战前返回地图的取消语义是保留布防，而非恢复不存在的战斗暂停',()=>{
    const copy=firstLevelConfirmationPresentation('confirm-home',true);
    assert.equal(copy.actions[0],'保留布防 · 返回关卡');
    assert.deepEqual(copy.actionKinds,['cancel','home']);
    assert.match(copy.body[0],/当前布防/);assert.match(copy.footer,/继续布塔/);
});
