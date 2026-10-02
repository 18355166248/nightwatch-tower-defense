const test = require('node:test');
const assert = require('node:assert/strict');
const { labelTextureBudget } = require('../.test-dist/presentation/LabelTextureBudget.js');

test('文字所有者去重，可见共享引用不能计入隐藏可回收量', () => {
    const owner = {};
    const budget = labelTextureBudget([
        {owner,bytes:100,visible:false,path:'hidden',sharedWithResource:false},
        {owner,bytes:100,visible:true,path:'shown',sharedWithResource:false},
        {owner:{},bytes:50,visible:false,path:'old-home',sharedWithResource:false},
    ]);
    assert.equal(budget.rendererLabelTextureBytes,150);
    assert.equal(budget.rendererHiddenLabelTextureBytes,50);
    assert.equal(budget.rendererLabelTextureCount,2);
    assert.equal(budget.rendererHiddenLabelTextureCount,1);
    assert.deepEqual(budget.rendererLargestLabelTextures[0].paths,['hidden','shown']);
});

test('被资源缓存持有的文字分配单列，不误报销毁文字就能回收', () => {
    const budget = labelTextureBudget([{owner:{},bytes:500,visible:false,path:'bitmap-font',sharedWithResource:true}]);
    assert.equal(budget.rendererLabelResourceOverlapBytes,500);
    assert.equal(budget.rendererHiddenLabelTextureBytes,0);
    assert.equal(labelTextureBudget([]).rendererLabelTextureBytes,0);
});

test('版本缺测和非法字节不能冒充0字节通过', () => {
    assert.equal(labelTextureBudget([],false).rendererLabelTextureBytes,null);
    for (const bytes of [NaN,-1,.5,Number.MAX_SAFE_INTEGER+1]) {
        const budget = labelTextureBudget([{owner:{},bytes,visible:false,path:'invalid',sharedWithResource:false}]);
        assert.equal(budget.rendererLabelBudgetSupported,false);
        assert.equal(budget.rendererHiddenLabelTextureBytes,null);
    }
});
