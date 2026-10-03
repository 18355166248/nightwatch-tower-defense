const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const art = require('../.test-dist/presentation/FrostUpgradeArt.js');
const geometry = require('../.test-dist/presentation/LayeredTowerGeometry.js');
const load = require('node:module').createRequire(path.resolve(__dirname, '../.test-dist/presentation/FrostUpgradeArtFrames.js'));
function compiledClass(file, cc) {
    const module = { exports: {} };
    const code = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../assets/scripts/presentation', file), 'utf8'),
        { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
    vm.runInNewContext(code, { module, exports: module.exports, require: name => name === 'cc' ? cc : load(name) });
    return module.exports;
}
test('二/三级为不同结构资源，一级及资源缺失保留旧图，整组切换不混图', () => {
    const legacy = { base: 'old-base', active: 'old-core' }, upgraded = { base: 'new-body', active: 'new-energy' };
    assert.equal(art.selectFrostArt(1, upgraded, legacy).pair, legacy);
    for (const level of [2, 3]) {
        assert.equal(art.selectFrostArt(level, null, legacy).pair, legacy);
        const selected = art.selectFrostArt(level, upgraded, legacy);
        assert.equal(selected.pair, upgraded); assert.equal(selected.resolvedLevel, level);
        assert.equal(selected.spec.activeScaleX, 1); assert.equal(selected.spec.canvasScale, 1.4);
    }
    assert.notEqual(art.FROST_UPGRADE_PATHS[2].base, art.FROST_UPGRADE_PATHS[3].base);
});
test('能量脉冲克制，减少动态/无事件恢复静止，发射点锁在各级质心', () => {
    assert.equal(art.frostUpgradePulse(0, .3).opacity, 0);
    assert.equal(art.frostUpgradePulse(1, 0).pose.scaleX, 1);
    const center = { x: 180, y: 50 }, size = 83.3;
    for (const level of [2, 3]) {
        const spec = art.FROST_UPGRADE_SPECS[level];
        const idle = geometry.layeredTowerEmissionPoint(center, size, null, spec);
        for (const remaining of [-1, 0, .15, .3, 1]) {
            const pulse = art.frostUpgradePulse(remaining, .3);
            assert.ok(pulse.pose.scaleX >= 1 && pulse.pose.scaleX <= 1.02);
            assert.deepEqual(geometry.layeredTowerEmissionPoint(center, size, pulse.pose, spec), idle);
        }
        const sourceY = level === 2 ? 70 : 53;
        assert.ok(Math.abs(idle.y - (center.y + 3 + (.5 - sourceY / 128) * size * 1.4)) < 1e-9);
    }
});
test('预载四层，缺任一层不得发布，销毁及迟到结果均成对归还', () => {
    const pending = [];
    const { FrostUpgradeArtFrames } = compiledClass('FrostUpgradeArtFrames.ts', {
        isValid: () => true, SpriteFrame: class {}, resources: { load: (url, type, callback) => pending.push({ url, callback }) },
    });
    const loader = new FrostUpgradeArtFrames({}); let refs = 0;
    const frame = { addRef: () => refs++, decRef: () => refs-- };
    assert.equal(pending.length, 4); assert.equal(loader.status, 'loading');
    pending[0].callback(null, frame); assert.equal(loader.pair(2), null);
    pending[1].callback(null, frame); assert.equal(loader.pair(2).base, frame);
    pending[2].callback(new Error('missing')); assert.equal(loader.pair(3), null);
    assert.equal(loader.status, 'unavailable'); assert.ok(loader.pair(2));
    loader.dispose(); loader.dispose(); assert.equal(refs, 0);
    pending[3].callback(null, frame); assert.equal(refs, 0); assert.equal(loader.pair(3), null);
});
test('升级复用节点同时换两层和轴点，回退一级恢复原有尺寸', () => {
    class Sprite {} class UITransform {}
    const { LayeredTowerRig } = compiledClass('LayeredTowerRig.ts', { Sprite, UITransform });
    const parts = {};
    for (const name of ['FrostBase', 'FrostCore', 'root']) parts[name] = {
        sprite: { spriteFrame: 'old', trim: false }, transform: { contentSize: { width: 0, height: 0 },
            setContentSize(w, h) { this.contentSize = { width: w, height: h }; }, setAnchorPoint(x, y) { this.anchor = [x, y]; } },
        getComponent(type) { return type === Sprite ? this.sprite : this.transform; },
    };
    const root = { getChildByName: name => parts[name], getComponent: () => parts.root.transform };
    LayeredTowerRig.bindFrames(root, 'sphere', 'sphere-energy', 60, art.FROST_UPGRADE_SPECS[3]);
    assert.equal(parts.FrostBase.sprite.spriteFrame, 'sphere'); assert.equal(parts.FrostCore.sprite.spriteFrame, 'sphere-energy');
    assert.deepEqual(parts.FrostCore.transform.anchor, [.5, 1 - 53 / 128]);
    LayeredTowerRig.bindFrames(root, 'legacy-base', 'legacy-core', 60, geometry.FROST_COIL_LAYER_SPEC);
    assert.deepEqual(parts.FrostCore.transform.anchor, [.5, .5]);
    assert.equal(parts.FrostCore.transform.contentSize.width, 60 * 1.4 * .65);
});
