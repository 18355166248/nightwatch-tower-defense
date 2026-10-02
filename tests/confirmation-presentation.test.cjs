const test = require('node:test');
const assert = require('node:assert/strict');
const { firstLevelConfirmationPresentation, firstLevelConfirmationLayout } = require('../.test-dist/presentation/FirstLevelConfirmationPresentation');
const { phaseBConfirmationButtons, phaseBPauseButtons, PhaseBLayout } = require('../.test-dist/presentation/PhaseBLayout');
const { BattleRunCheckpoint } = require('../.test-dist/systems/BattleRunCheckpoint');
const { PlacementModel } = require('../.test-dist/systems/PlacementModel');
const { EconomyLedger } = require('../.test-dist/systems/EconomyLedger');
const { PHASE_A_GRIDS } = require('../.test-dist/config/PhaseAGrids');
const { PHASE_B_TOWERS } = require('../.test-dist/config/PhaseBCombatConfig');

test('重部署提示符合实际检查点：保留战前等级与剩余金币，不带回战斗收益', () => {
    const ledger = new EconomyLedger(80);
    const model = new PlacementModel(PHASE_A_GRIDS['grid-9x13'], ledger, PHASE_B_TOWERS);
    const cell = { column: 2, row: 2 };
    assert.equal(model.commit(model.preview(cell, [], 'rivet-gun'), []).accepted, true);
    assert.equal(model.upgrade(cell).accepted, true);
    const checkpoint = BattleRunCheckpoint.capture(model);
    ledger.credit(24);
    const restored = checkpoint.restore().model;
    assert.equal(restored.gold, 26);
    assert.deepEqual(restored.deployments, model.deployments);
    const copy = firstLevelConfirmationPresentation('confirm-restart');
    assert.match(copy.body[0], /塔位、等级与金币/);
    assert.doesNotMatch(copy.body.join(''), /金币清零/);
    assert.deepEqual(copy.actions, ['确认重新部署', '保留原局 · 返回暂停']);
    assert.deepEqual(copy.actionKinds, ['restart', 'cancel']);
});

test('返回首页的安全主操作为取消；次操作明确结束本局，文案与动作不串位', () => {
    const copy = firstLevelConfirmationPresentation('confirm-home');
    assert.equal(copy.title, '返回首页？');
    assert.match(copy.body[0], /本局进度不会保存/);
    assert.match(copy.body[2], /纪录与设置仍保留/);
    assert.deepEqual(copy.actions, ['保留原局 · 返回暂停', '结束本局 · 返回首页']);
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
