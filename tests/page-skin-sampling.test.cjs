const test = require('node:test');
const assert = require('node:assert/strict');
const { PAGE_PANEL_SOURCE_INSET, pagePanelBorderScale } = require('../.test-dist/presentation/PageSkinSampling.js');

test('B 面板采样保留默认与显式边框宽度，不缩放页面热区', () => {
    assert.equal(PAGE_PANEL_SOURCE_INSET, 31.5);
    for (const width of [42, 24, 18, 12]) {
        const scale = pagePanelBorderScale(width);
        assert.equal(PAGE_PANEL_SOURCE_INSET * scale, width);
        assert.equal((900 / scale) * scale, 900);
    }
    assert.equal(pagePanelBorderScale(), 4 / 3);
});
