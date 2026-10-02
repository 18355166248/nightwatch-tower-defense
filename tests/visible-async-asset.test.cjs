const test = require('node:test');
const assert = require('node:assert/strict');
const { VisibleAsyncAsset } = require('../.test-dist/presentation/VisibleAsyncAsset.js');

function fixture() {
    const pending = [], events = [];
    const slot = new VisibleAsyncAsset(cb => pending.push(cb),
        asset => events.push(['retain', asset]), asset => events.push(['release', asset]),
        asset => events.push(['publish', asset]));
    return { slot, pending, events };
}

test('可见期间复用，隐藏先清精灵再释放，返回重新加载', () => {
    const {slot, pending, events} = fixture();
    slot.setVisible(false); slot.setVisible(true); slot.setVisible(true);
    assert.equal(pending.length, 1);
    pending[0]('hero'); slot.setVisible(false); slot.setVisible(false);
    assert.deepEqual(events, [['retain','hero'],['publish','hero'],['publish',null],['release','hero']]);
    slot.setVisible(true); assert.equal(pending.length, 2);
});

test('离开后迟到的资源归还且不发布', () => {
    const {slot, pending, events} = fixture();
    slot.setVisible(true); slot.setVisible(false); pending[0]('old');
    assert.deepEqual(events, [['publish',null],['retain','old'],['release','old']]);
});

test('快速返回时旧回调不能覆盖新资源', () => {
    const {slot, pending, events} = fixture();
    slot.setVisible(true); slot.setVisible(false); slot.setVisible(true);
    pending[1]('new'); pending[0]('old'); slot.setVisible(false);
    assert.deepEqual(events.slice(1), [['retain','new'],['publish','new'],['retain','old'],['release','old'],['publish',null],['release','new']]);
});

test('失败不持有资源，下次进入允许重试', () => {
    const {slot, pending, events} = fixture();
    slot.setVisible(true); pending[0](null); slot.setVisible(false); slot.setVisible(true);
    pending[1]('retry');
    assert.deepEqual(events, [['publish',null],['publish',null],['retain','retry'],['publish','retry']]);
});
