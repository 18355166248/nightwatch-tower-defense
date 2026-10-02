const test = require('node:test');
const assert = require('node:assert/strict');
const { applyRenderAtlasPolicy } = require('../.test-dist/presentation/RenderAtlasPolicy.js');
const manager = (overrides = {}) => ({ enabled: true, atlasCount: 0, textureSize: 2048, maxAtlasCount: 5, maxFrameSize: 512, ...overrides });

test('正式首关默认采用已验证小图集，QA或未知参数不能回退大图集', () => {
    for (const query of ['', '?artBudget=compact', '?qa=1', '?renderBudget=unknown']) {
        const atlas = manager();
        assert.equal(applyRenderAtlasPolicy(atlas, query), 'small-atlas-applied');
        assert.deepEqual(atlas, manager({textureSize:512,maxAtlasCount:1,maxFrameSize:128}));
    }
    const legacy = manager();
    assert.equal(applyRenderAtlasPolicy(legacy,'?renderBudget=legacy-atlas'),'default');
    assert.deepEqual(legacy,manager());
});

test('初始化前的小图集有明确尺寸、个数、帧尺寸上限，不开启原本关闭的图集', () => {
    const atlas = manager();
    assert.equal(applyRenderAtlasPolicy(atlas, '?renderBudget=small-atlas'), 'small-atlas-applied');
    assert.deepEqual(atlas, manager({ textureSize: 512, maxAtlasCount: 1, maxFrameSize: 128 }));
    const disabled = manager({ enabled: false });
    assert.equal(applyRenderAtlasPolicy(disabled, '?renderBudget=small-atlas'), 'small-atlas-disabled');
    assert.deepEqual(disabled, manager({ enabled: false }));
});

test('已有打包纹理时保守拒绝，不清理资源、不修改现存帧引用', () => {
    const atlas = manager({ atlasCount: 1 });
    assert.equal(applyRenderAtlasPolicy(atlas, '?renderBudget=small-atlas'), 'small-atlas-too-late');
    assert.deepEqual(atlas, manager({ atlasCount: 1 }));
});

test('单图集默认与显式参数一致，旧双图集仅供对照，不改尺寸或启用状态', () => {
    const atlas = manager();
    assert.equal(applyRenderAtlasPolicy(atlas, '?renderBudget=single-atlas'), 'small-atlas-applied');
    assert.deepEqual(atlas, manager({textureSize:512,maxAtlasCount:1,maxFrameSize:128}));
    const disabled = manager({enabled:false});
    assert.equal(applyRenderAtlasPolicy(disabled, '?renderBudget=single-atlas'), 'small-atlas-disabled');
    assert.deepEqual(disabled, manager({enabled:false}));
    const old = manager();
    applyRenderAtlasPolicy(old, '?renderBudget=double-atlas');
    assert.deepEqual(old, manager({textureSize:512,maxAtlasCount:2,maxFrameSize:128}));
});
