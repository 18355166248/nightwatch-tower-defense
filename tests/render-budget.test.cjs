const test = require('node:test');
const assert = require('node:assert/strict');
const { renderBudgetSummary, textureAllocationOwner } = require('../.test-dist/presentation/RenderBudgetSummary.js');

test('Texture2D视图沿公开引用找到同一分配；多视图不重复、断链/循环不猜0字节', () => {
    const owner = { isTextureView:false, viewInfo:{texture:null} };
    const a = { isTextureView:true, viewInfo:{texture:owner} };
    const b = { isTextureView:true, viewInfo:{texture:a} };
    assert.equal(textureAllocationOwner(a),owner);
    assert.equal(textureAllocationOwner(b),owner);
    assert.equal(textureAllocationOwner(owner),owner);
    assert.equal(textureAllocationOwner(null),null);
    a.viewInfo.texture=b;
    assert.equal(textureAllocationOwner(a),null);
    assert.equal(textureAllocationOwner({isTextureView:true,viewInfo:{texture:null}}),null);
});

test('GFX总计与缓存分类分开，差值不是硬件物理显存或泄漏结论', () => {
    const result = renderBudgetSummary({textureBytes:10_000,bufferBytes:500,drawCalls:30},7_000);
    assert.equal(result.rendererTextureBytes,10_000);
    assert.equal(result.rendererUncataloguedTextureBytes,3_000);
    assert.equal(result.rendererBufferBytes,500);
    assert.equal(result.rendererDrawCalls,30);
});

test('缺测、损坏、负值和溢出不冒充0；缓存总计矛盾时不制造负差值', () => {
    const missing = renderBudgetSummary(null,null);
    assert.equal(missing.rendererTextureBytes,null);
    assert.equal(missing.rendererTexturePeakBytes,null);
    const invalid = renderBudgetSummary({textureBytes:NaN,bufferBytes:-1,drawCalls:.5},Number.MAX_SAFE_INTEGER+1);
    assert.equal(invalid.rendererCachedTextureBytes,null);
    assert.equal(invalid.rendererBufferBytes,null);
    assert.equal(invalid.rendererDrawCalls,null);
    assert.equal(renderBudgetSummary({textureBytes:500},700).rendererUncataloguedTextureBytes,null);
    assert.equal(renderBudgetSummary({textureBytes:0,bufferBytes:0,drawCalls:0},0).rendererTextureBytes,0);
});

test('页面内峰值单调且缺测保留历史峰，当前缺测仍显式null', () => {
    const first = renderBudgetSummary({textureBytes:100},80);
    const second = renderBudgetSummary({textureBytes:50},40,first.rendererTexturePeakBytes);
    assert.equal(second.rendererTexturePeakBytes,100);
    const missing = renderBudgetSummary(null,null,second.rendererTexturePeakBytes);
    assert.equal(missing.rendererTexturePeakBytes,100);
    assert.equal(missing.rendererTextureBytes,null);
});
