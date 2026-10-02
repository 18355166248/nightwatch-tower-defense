const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const load = require('node:module').createRequire(path.resolve(__dirname, '../.test-dist/presentation/CocosRenderBudgetProbe.js'));
function fixture(enabled, shared = false, pixelFailure = false) {
    let reads = 0;
    class Canvas {
        width = 2; height = 2;
        getContext() { return { getImageData() { reads++; if (pixelFailure) throw new Error('denied');
            const data = new Uint8Array(16); data[3] = 1; return { data }; } }; }
    }
    const owner = { size: 16 };
    class Texture2D { width = 2; height = 2; name = 'label'; uuid = 'label'; image = { data: new Canvas() };
        getGFXTexture() { return owner; } }
    class Label {} class Node {} class SpriteFrame {}
    const texture = new Texture2D();
    const label = { spriteFrame: texture, enabledInHierarchy: true, node: { name: 'text', parent: null } };
    const module = { exports: {} };
    const cc = { Texture2D, Label, Node, SpriteFrame,
        assetManager: { assets: { forEach: cb => { if (shared) cb(texture); } } },
        dynamicAtlasManager: { atlasCount: 0, textureSize: 512 },
        director: { root: { device: { memoryStatus: { textureSize: 16, bufferSize: 0 }, numDrawCalls: 1 } },
            getScene: () => ({ getComponentsInChildren: () => [label, label] }) } };
    const source = ts.transpileModule(fs.readFileSync(path.resolve(__dirname,
        '../assets/scripts/presentation/CocosRenderBudgetProbe.ts'), 'utf8'),
        { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
    vm.runInNewContext(source, { module, exports: module.exports, require: name => name === 'cc' ? cc : load(name),
        HTMLCanvasElement: Canvas, URLSearchParams, window: { location: { search: enabled ? '?labelBudget=ink' : '' } } });
    return { probe: new module.exports.CocosRenderBudgetProbe(), reads: () => reads };
}
test('正式入口不读像素；独立诊断按本体去重且5秒节流', () => {
    const normal = fixture(false); const baseline = normal.probe.read(0);
    assert.equal(normal.reads(), 0); assert.equal(baseline.rendererLabelInkEnabled, false);
    const candidate = fixture(true); const first = candidate.probe.read(0);
    assert.equal(candidate.reads(), 1); assert.equal(first.rendererLabelInkSamples.length, 1);
    assert.equal(first.rendererLabelInkSamples[0].bounds.rgbaBytes, 4);
    candidate.probe.read(500); candidate.probe.read(4999); assert.equal(candidate.reads(), 1);
    candidate.probe.read(5500); assert.equal(candidate.reads(), 2);
});
test('共享资源及像素读取失败明确缺测，不误报零面积或中断预算探针', () => {
    const shared = fixture(true, true); const first = shared.probe.read(0);
    assert.equal(shared.reads(), 0); assert.equal(first.rendererLabelInkSamples[0].unavailable, 'shared-resource');
    const failed = fixture(true, false, true).probe.read(0);
    assert.equal(failed.rendererLabelInkSamples[0].bounds, null);
    assert.equal(failed.rendererLabelInkSamples[0].unavailable, 'pixel-read-unavailable');
    assert.equal(failed.rendererTextureBytes, 16);
});
