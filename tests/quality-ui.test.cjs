const test = require('node:test');
const assert = require('node:assert/strict');
const { firstLevelControlRect, FIRST_LEVEL_INSPECT_CLOSE } = require('../.test-dist/presentation/FirstLevelUiGeometry');
const { FIRST_LEVEL_UI_TEXT_SCALE, firstLevelFontSize } = require('../.test-dist/presentation/FirstLevelUiStyle');
const layout = require('../.test-dist/presentation/PhaseBLayout');
const entry = require('../.test-dist/presentation/FirstLevelExperience');
const {firstLevelGuidanceVisible} = require('../.test-dist/presentation/FirstLevelControlPolicy');
test('教学波间操作提示保留，选塔、普通暂停和战斗中不挤占指引槽',()=>{
    assert.equal(firstLevelGuidanceVisible('preparing',true,false,false),true);
    assert.equal(firstLevelGuidanceVisible('paused',true,true,false),true);
    assert.equal(firstLevelGuidanceVisible('paused',false,true,false),false);
    assert.equal(firstLevelGuidanceVisible('paused',true,false,false),false);
    assert.equal(firstLevelGuidanceVisible('paused',true,true,true),false);
    assert.equal(firstLevelGuidanceVisible('spawning',true,false,false),false);
});
const intersects = (a, b) => a.left < b.right && a.right > b.left && a.bottom < b.top && a.top > b.bottom;
test('所有弹窗动作按钮留在面板内，320宽至少44px且互不重叠', () => {
    const view = new layout.PhaseBLayout();
    for (const screen of ['menu', 'settings', 'confirm-home', 'confirm-restart', 'route-error']) {
        const panel = view.pausePanelRect(screen);
        const rects = layout.phaseBPauseButtons(screen);
        for (const r of rects) {
            assert.ok((r.top-r.bottom)*320/1080 >= 44, screen);
            assert.ok(r.left > panel.left && r.right < panel.right && r.bottom > panel.bottom && r.top < panel.top, screen);
        }
        rects.forEach((a,i) => rects.slice(i+1).forEach(b => assert.equal(intersects(a,b), false)));
    }
    for (const r of [layout.PHASE_B_RESULT_HOME_BUTTON, layout.PHASE_B_RESULT_RESTART_BUTTON]) {
        assert.ok((r.top-r.bottom)*320/1080 >= 44);
    }
    const homeSettings = layout.phaseBSettingsButtons(true).filter((_,i) => i !== 3);
    homeSettings.forEach((a,i) => homeSettings.slice(i+1).forEach(b => assert.equal(intersects(a,b),false)));
    assert.deepEqual(layout.phaseBSettingsButtons(true)[4], layout.phaseBSettingsButtons(true)[3], '首页隐藏速度索引3，返回索引4仍对应第四行');
    const settingsPanel = view.pausePanelRect('settings');
    for (const r of homeSettings) {
        assert.ok(r.left > settingsPanel.left && r.right < settingsPanel.right && r.bottom > settingsPanel.bottom && r.top < settingsPanel.top);
        assert.ok((r.top-r.bottom)*320/1080>=44);
    }
    assert.equal(layout.PHASE_B_PAUSE_BUTTONS[1].bottom,layout.PHASE_B_PAUSE_BUTTONS[2].bottom);
    assert.ok(layout.PHASE_B_PAUSE_BUTTONS[1].right<layout.PHASE_B_PAUSE_BUTTONS[2].left, '暂停次操作为有间隔双列');
    for (const r of [entry.FIRST_LEVEL_START_BUTTON, entry.FIRST_LEVEL_SKIP_INTRO_BUTTON,
        entry.FIRST_LEVEL_HOME_SETTINGS_BUTTON, entry.FIRST_LEVEL_SKIP_COACH_BUTTON]) {
        assert.ok((r.top-r.bottom)*320/1080>=44);
        assert.ok((r.right-r.left)*320/1080>=44);
    }
});
test('普通模式操作热区共享设计坐标，320宽下至少44px且相邻按钮不重叠', () => {
    const groups = [
        [layout.PHASE_B_SPEED_BUTTON, layout.PHASE_B_EARLY_WAVE_BUTTON],
        [layout.PHASE_B_SELL_BUTTON, layout.PHASE_B_UPGRADE_BUTTON],
    ];
    for (const group of groups) {
        const rects = group.map(r => firstLevelControlRect(r, true));
        for (const r of rects) {
            assert.ok((r.right - r.left) * 320 / 1080 >= 44);
            assert.ok((r.top - r.bottom) * 320 / 1080 >= 44);
            assert.ok(r.left >= -516 && r.right <= 516);
        }
        rects.forEach((a, i) => rects.slice(i + 1).forEach(b => assert.equal(intersects(a, b), false)));
    }
    assert.equal(intersects(firstLevelControlRect(layout.PHASE_B_UPGRADE_BUTTON, true), FIRST_LEVEL_INSPECT_CLOSE), false);
    assert.equal(intersects(firstLevelControlRect(layout.PHASE_B_SELL_BUTTON, true), FIRST_LEVEL_INSPECT_CLOSE), false);
    assert.equal(firstLevelControlRect(layout.PHASE_B_SPEED_BUTTON, false), layout.PHASE_B_SPEED_BUTTON);
});
test('设计版字号缩小不改变字体相对比例或点击热区', () => {
    assert.equal(FIRST_LEVEL_UI_TEXT_SCALE, .72);
    assert.equal(firstLevelFontSize(55), 39.6);
    assert.equal(firstLevelFontSize(40), 28.8);
    assert.equal(firstLevelFontSize(36), 25.92);
});
