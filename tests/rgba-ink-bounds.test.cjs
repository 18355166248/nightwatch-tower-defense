const test = require('node:test'), assert = require('node:assert/strict');
const { rgbaInkBounds } = require('../.test-dist/presentation/RgbaInkBounds.js');
test('墨迹诊断保留alpha=1抗锯齿及边界，不把透明RGB当墨迹', () => {
    const data = new Uint8Array(5 * 4 * 4).fill(0);
    data[0] = 255;
    data[(1 * 5 + 1) * 4 + 3] = 1;
    data[(3 * 5 + 4) * 4 + 3] = 255;
    assert.deepEqual(rgbaInkBounds(data, 5, 4), { left: 1, top: 1, width: 4, height: 3, rgbaBytes: 48 });
    assert.deepEqual(rgbaInkBounds(data, 5, 4, 1), { left: 4, top: 3, width: 1, height: 1, rgbaBytes: 4 });
    assert.equal(rgbaInkBounds(data, 5, 4, -1), null);
});
test('全透明与数据缺失分开，不把缺测伪造成面积0', () => {
    assert.deepEqual(rgbaInkBounds(new Uint8Array(16), 2, 2), { left: 0, top: 0, width: 0, height: 0, rgbaBytes: 0 });
    for (const [w,h] of [[0,2],[-1,2],[1.5,2],[NaN,2],[Number.MAX_SAFE_INTEGER,2]])
        assert.equal(rgbaInkBounds([],w,h),null);
    assert.equal(rgbaInkBounds(new Uint8Array(15),2,2),null);
});
