const test = require('node:test');
const assert = require('node:assert/strict');
const { VisibleViewResource } = require('../.test-dist/presentation/VisibleViewResource.js');

test('隐藏视图不提前创建；重复可见快照复用，离开只释放一次，返回重建', () => {
    let creates = 0;
    const released = [];
    const slot = new VisibleViewResource(() => ({id:++creates}), resource => released.push(resource.id));
    assert.equal(slot.setVisible(false),null);
    assert.equal(creates,0);
    const first = slot.setVisible(true);
    assert.equal(slot.setVisible(true),first);
    slot.setVisible(false); slot.setVisible(false);
    assert.deepEqual(released,[1]);
    assert.deepEqual(slot.setVisible(true),{id:2});
});

test('释放前断开旧所有权，回调重入不会重复销毁', () => {
    let releases = 0;
    const slot = new VisibleViewResource(() => ({}), () => { releases++; slot.setVisible(false); });
    slot.setVisible(true); slot.setVisible(false);
    assert.equal(releases,1);
});
