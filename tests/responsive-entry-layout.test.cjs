const test = require('node:test');
const assert = require('node:assert/strict');
const { PhaseBLayout, PHASE_B_SOUND_BUTTON, PHASE_B_RIVET_BUTTON } = require('../.test-dist/presentation/PhaseBLayout.js');
const { FIRST_LEVEL_HOME_SETTINGS_BUTTON, FIRST_LEVEL_SKIP_COACH_BUTTON, FIRST_LEVEL_START_BUTTON } = require('../.test-dist/presentation/FirstLevelExperience.js');
const { firstLevelCoachSkipRect, firstLevelHomeLayout } = require('../.test-dist/presentation/FirstLevelEntryLayout.js');
const { PHASE_A_GRIDS } = require('../.test-dist/config/PhaseAGrids.js');
const { enemyDisplaySize, towerDisplaySize } = require('../.test-dist/presentation/UnitDisplaySize.js');

test('边缘按钮保持宽度整体内移，中心点可命中；常规屏几何不变', () => {
    const layout = new PhaseBLayout();
    for (const rect of [PHASE_B_SOUND_BUTTON, FIRST_LEVEL_SKIP_COACH_BUTTON]) {
        assert.deepEqual(layout.fitRect(rect), rect);
        for (const [width, height] of [[320,900],[360,780],[390,844],[430,932]]) {
            layout.setVisibleWidth(1920 * width / height);
            const fit = layout.fitRect(rect);
            assert.equal(fit.right - fit.left, rect.right - rect.left);
            assert.ok(fit.left >= -layout.safeHalfWidth && fit.right <= layout.safeHalfWidth);
            assert.equal(fit.top, rect.top);
            assert.equal(fit.bottom, rect.bottom);
            assert.ok(layout.insideRect({x:(fit.left+fit.right)/2,y:(fit.bottom+fit.top)/2},fit));
        }
        layout.setVisibleWidth(1080);
    }
});

test('首页窄屏标题与设置分区，开始按钮、内容与插画留在卡片内', () => {
    const layout = new PhaseBLayout();
    const normal = firstLevelHomeLayout(layout);
    assert.deepEqual(normal.start,FIRST_LEVEL_START_BUTTON);
    assert.deepEqual(normal.settings,FIRST_LEVEL_HOME_SETTINGS_BUTTON);
    assert.equal((normal.title.bottom+normal.title.top)/2,765);
    for (const [width,height] of [[320,900],[360,780],[390,844],[430,932]]) {
        layout.setVisibleWidth(1920*width/height);
        const home = firstLevelHomeLayout(layout);
        assert.ok(home.card.left >= -layout.safeHalfWidth && home.card.right <= layout.safeHalfWidth);
        for (const rect of [home.start,home.settings,home.title,home.skip,home.hero]) {
            assert.ok(rect.left >= home.card.left+24 && rect.right <= home.card.right-24);
        }
        assert.equal(home.settings.right-home.settings.left,155);
        assert.ok(home.contentWidth >= 560);
        assert.ok(home.title.right+24 <= home.settings.left);
        assert.ok(home.title.right-home.title.left >= 4*68);
        for (const rect of [home.start,home.settings,home.skip]) {
            assert.ok((rect.top-rect.bottom)*width/1080 >=44);
            assert.ok((rect.right-rect.left)*width/1080 >=44);
        }
        assert.ok(home.hero.bottom > home.start.top);
    }
});

test('窄屏引导增加行高容量，不碰棋盘、重置和塔商店；常规屏保留两行槽', () => {
    const layout = new PhaseBLayout();
    assert.equal(layout.guidanceRect().top-layout.guidanceRect().bottom,100);
    layout.setVisibleWidth(1920*320/900);
    const rect=layout.guidanceRect();
    assert.ok(rect.top-rect.bottom >= 4*50);
    assert.ok(rect.bottom > PHASE_B_RIVET_BUTTON.top);
    assert.equal(rect.left,-190);
    assert.equal(rect.top,-510);
});

test('极窄屏教学跳过保留独立槽和44px热区，不遮挡棋盘或HUD', () => {
    const layout=new PhaseBLayout();
    // 新稿同比缩放而非旧按钮固定150×155；保留原有安全区/棋盘边界和实际44px门槛。
    for(const [width,height] of [[390,693.333],[320,900],[390,844]]){
        layout.setVisibleWidth(1920*width/height);
        const skip=firstLevelCoachSkipRect(layout);
        assert.ok((skip.right-skip.left)*height/1920>=44);
        assert.ok((skip.top-skip.bottom)*height/1920>=44);
        assert.ok(skip.left>=-layout.safeHalfWidth && skip.right<=layout.safeHalfWidth);
        assert.ok(skip.bottom>610 && skip.top<784);
        assert.ok(layout.insideRect({x:(skip.left+skip.right)/2,y:(skip.bottom+skip.top)/2},skip));
    }
});

test('极窄屏完整棋盘与外列中心都在安全区内，绘制坐标往返仍落在同一逻辑格', () => {
    const layout=new PhaseBLayout();
    const normal=layout.boardMetrics(PHASE_A_GRIDS['grid-9x13']);
    assert.equal(normal.cellSize,76);
    layout.setVisibleWidth(1920*320/900);
    for(const grid of Object.values(PHASE_A_GRIDS)) {
        const metrics=layout.boardMetrics(grid);
        assert.ok(metrics.left>=-layout.safeHalfWidth && metrics.left+metrics.width<=layout.safeHalfWidth);
        for(let row=0;row<grid.rows;row++) for(let column=0;column<grid.columns;column++) {
            const cell={column,row};
            assert.deepEqual(layout.pointToCell(layout.gridPointCenter(cell,grid),grid),cell);
        }
        assert.ok(towerDisplaySize(metrics.cellSize)<=metrics.cellSize);
        assert.ok(enemyDisplaySize(metrics.cellSize,true,true)>enemyDisplaySize(metrics.cellSize,false,true));
        assert.ok(enemyDisplaySize(metrics.cellSize,true,true)<=metrics.cellSize*1.13);
    }
});
