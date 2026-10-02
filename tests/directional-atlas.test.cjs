const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const walk = require('../.test-dist/presentation/DirectionalWalk.js');
const layoutPolicy = require('../.test-dist/presentation/DirectionalSpriteLayout.js');
const manifest = JSON.parse(readFileSync(resolve(__dirname,
    '../assets/resources/level-one/units/clockwork-infantry-walk-rig-v2-layout.json'), 'utf8'));

// 这里只替换 Cocos 资源接口以控制回调竞态；真实 Sprite/纹理仍另由发布构建和浏览器验证。
function harness(clip = 'walk') {
    const pending = [];
    const created = [];
    class Shape { constructor(...values) { this.values = values; } }
    class Frame {
        constructor() { this.destroyCount = 0; created.push(this); }
        destroy() { this.destroyCount++; }
    }
    const cc = { isValid: owner => owner.alive, JsonAsset: class {}, Node: class {},
        Rect: Shape, Size: Shape, Vec2: Shape, SpriteFrame: Frame, Texture2D: class {},
        resources: { load: (path, type, callback) => pending.push({ path, callback }) } };
    const module = { exports: {} };
    const source = readFileSync(resolve(__dirname,
        '../assets/scripts/presentation/DirectionalSpriteAtlas.ts'), 'utf8');
    const compiled = ts.transpileModule(source, { compilerOptions: {
        module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
    } }).outputText;
    vm.runInNewContext(compiled, { module, exports: module.exports,
        require: name => {
            if (name === 'cc') return cc;
            if (name === './DirectionalSpriteLayout') return layoutPolicy;
            throw new Error(`Unexpected dependency: ${name}`);
        } });
    const owner = { alive: true };
    const atlas = new module.exports.DirectionalSpriteAtlas(owner, 'level-one/units/test-walk', clip);
    const texture = { width: 512, height: 512, refs: 0, releaseCount: 0,
        // 引擎 addRef 返回 Asset，不依赖链式返回 Texture2D。
        addRef() { this.refs++; return {}; },
        decRef() { this.refs--; this.releaseCount++; } };
    return { owner, atlas, texture, pending, created,
        finishLayout(value = manifest, error = null) { pending.shift().callback(error, { json: value }); },
        finishTexture(error = null) { pending.shift().callback(error, texture); } };
}

test('方向图集全部16帧就绪后才切换、共享纹理，销毁幂等释放一次', () => {
    const h = harness();
    assert.equal(h.atlas.status, 'loading');
    assert.equal(h.atlas.frame('down', 0), null);
    assert.equal(h.pending[0].path, 'level-one/units/test-walk-layout');
    h.finishLayout();
    assert.equal(h.atlas.frame('down', 0), null);
    assert.equal(h.pending[0].path, 'level-one/units/test-walk/texture');
    h.finishTexture();
    assert.equal(h.atlas.status, 'ready');
    assert.equal(h.created.length, 16);
    assert.equal(h.texture.refs, 1);
    for (const direction of walk.WALK_DIRECTIONS) for (let i = 0; i < 4; i++) {
        const frame = h.atlas.frame(direction, i);
        assert.equal(frame.texture, h.texture);
        assert.equal(frame.packable, false);
        assert.deepEqual(Array.from(frame.rect.values), Object.values(walk.parseDirectionalWalkLayout(manifest).frames[direction][i]).slice(0,4));
    }
    h.atlas.dispose(); h.atlas.dispose();
    assert.equal(h.atlas.frame('down', 0), null);
    assert.equal(h.texture.refs, 0);
    assert.equal(h.texture.releaseCount, 1);
    assert.ok(h.created.every(frame => frame.destroyCount === 1));
});

test('同一个资源适配器加载单次死亡图集，不把死亡loop或行走表误当正确动作', () => {
    const collapse = JSON.parse(readFileSync(resolve(__dirname,
        '../assets/resources/level-one/units/clockwork-infantry-collapse-rig-v1-layout.json'), 'utf8'));
    const h = harness('collapse');
    h.finishLayout(collapse);
    h.texture.width = 1024; h.texture.height = 1024;
    h.finishTexture();
    assert.equal(h.atlas.status, 'ready');
    assert.equal(h.atlas.layout.frames.down[0].durationMs, 75);
    assert.equal(h.created.length, 16);
    h.atlas.dispose();
    assert.equal(h.texture.refs, 0);
    const wrong = harness('collapse');
    wrong.finishLayout(manifest);
    assert.equal(wrong.atlas.status, 'unavailable');
    assert.equal(wrong.pending.length, 0);
});

test('损坏/加载失败/纹理尺寸不符均不可用，不创建半套动作、不持有纹理', () => {
    for (const fault of ['invalid-layout', 'layout-error', 'texture-error', 'texture-size']) {
        const h = harness();
        if (fault === 'invalid-layout') h.finishLayout({});
        else if (fault === 'layout-error') h.finishLayout(manifest, new Error('load'));
        else {
            h.finishLayout();
            if (fault === 'texture-size') h.texture.width = 256;
            h.finishTexture(fault === 'texture-error' ? new Error('load') : null);
        }
        assert.equal(h.atlas.status, 'unavailable');
        assert.equal(h.atlas.frame('down', 0), null);
        assert.equal(h.created.length, 0);
        assert.equal(h.texture.refs, 0);
    }
});

test('场景销毁/owner失效先于资源回调时不会复活或再取得纹理引用', () => {
    for (const timing of ['before-layout', 'before-texture', 'invalid-owner']) {
        const h = harness();
        if (timing === 'before-layout') { h.atlas.dispose(); h.finishLayout(); }
        else {
            h.finishLayout();
            if (timing === 'invalid-owner') h.owner.alive = false;
            else h.atlas.dispose();
            h.finishTexture();
        }
        assert.equal(h.created.length, 0);
        assert.equal(h.texture.refs, 0);
        assert.equal(h.atlas.frame('down', 0), null);
        assert.equal(h.pending.length, 0);
    }
});
