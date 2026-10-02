const test = require('node:test');
const assert = require('node:assert/strict');
const {alphaBounds} = require('../scripts/audit-ui-texture-padding.cjs');

test('透明边界包含半透明像素，并保留一像素过滤安全区', () => {
    const pixels = new Uint8Array(6*6*4);
    pixels[(2*6+2)*4+3] = 1;
    pixels[(3*6+3)*4+3] = 255;
    assert.deepEqual(alphaBounds(pixels,6,6),{left:1,top:1,right:4,bottom:4});
});
test('满画布不宣称裁边收益，边界不会越界', () => {
    assert.deepEqual(alphaBounds(new Uint8Array(3*2*4).fill(255),3,2),{left:0,top:0,right:2,bottom:1});
});
test('空图没有自动删除或缩小建议', () => {
    assert.equal(alphaBounds(new Uint8Array(4*4*4),4,4),null);
});
test('缓冲不完整或尺寸错误时中断，不产出假的裁边结论', () => {
    assert.throws(()=>alphaBounds(new Uint8Array(3),1,1),/完整RGBA/);
    assert.throws(()=>alphaBounds(new Uint8Array(0),0,1),/完整RGBA/);
    assert.throws(()=>alphaBounds(new Uint8Array(4),1,1,-1),/安全边距/);
});
