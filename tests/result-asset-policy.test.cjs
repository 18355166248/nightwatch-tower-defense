const test = require('node:test');
const assert = require('node:assert/strict');
const { resultAssetNeeded } = require('../.test-dist/presentation/ResultAssetPolicy.js');
const { VisibleAsyncAsset } = require('../.test-dist/presentation/VisibleAsyncAsset.js');
const names = ['victory-badge','defeat-badge','kill-icon','leak-icon','heart-icon','coins-icon','time-icon','tower-icon','upgrade-icon'];

test('胜利只取8张实际图，失败只取7张实际图，隐藏不持有结算图', () => {
    assert.deepEqual(names.filter(n => resultAssetNeeded(n,'victory')), names.filter(n => n !== 'defeat-badge'));
    assert.deepEqual(names.filter(n => resultAssetNeeded(n,'defeat')), names.filter(n => !['victory-badge','heart-icon'].includes(n)));
    assert.deepEqual(names.filter(n => resultAssetNeeded(n,null)), []);
});

test('胜利退出后晚回调不复活结算，失败重入不载入胜利图', () => {
    const pending = new Map(), retained = new Set(), published = new Map();
    const slots = new Map(names.map(name => [name, new VisibleAsyncAsset(
        cb => pending.set(name,cb), asset => retained.add(asset), asset => retained.delete(asset),
        asset => published.set(name,asset))]));
    const show = kind => slots.forEach((slot,name) => slot.setVisible(resultAssetNeeded(name,kind)));
    show('victory');
    const oldCallbacks = Array.from(pending.entries());
    show(null);
    oldCallbacks.forEach(([name,cb]) => cb(name));
    assert.equal(retained.size,0);
    assert.ok(Array.from(published.values()).every(value => value === null));
    pending.clear(); show('defeat');
    assert.equal(pending.size,7);
    pending.forEach((cb,name) => cb(name));
    assert.equal(retained.size,7);
    show(null); assert.equal(retained.size,0);
});
