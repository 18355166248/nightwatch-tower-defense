const test = require('node:test');
const assert = require('node:assert/strict');
const { compactTextWidth } = require('../.test-dist/presentation/CompactTextWidth.js');

test('文字留白按最长显式行收紧，保留抗锯齿余量和偶数宽度', () => {
    assert.equal(compactTextWidth('甲\n甲乙', 190, line => line.length * 28.8), 62);
    assert.equal(compactTextWidth('', 160, () => 0), 4);
    assert.equal(compactTextWidth('波次', 160, () => 57.6), 62);
});
test('超长文案保留原CLAMP宽度，测量异常不误裁文字', () => {
    assert.equal(compactTextWidth('长文案', 195, () => 300), 195);
    for (const invalid of [NaN, Infinity, -1]) assert.equal(compactTextWidth('字体异常', 160, () => invalid), 160);
    assert.equal(compactTextWidth('测量失败', 160, () => { throw Error('测量不可用'); }), 160);
});
