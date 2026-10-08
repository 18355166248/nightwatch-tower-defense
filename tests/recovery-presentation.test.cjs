const test = require('node:test');
const assert = require('node:assert/strict');
const { PauseOverlayRuntime } = require('../.test-dist/systems/PauseOverlayRuntime');
const { firstLevelPauseMenuPresentation, firstLevelRouteRecoveryPresentation } = require('../.test-dist/presentation/FirstLevelRecoveryPresentation');

test('后台返回只解除阻塞，恢复说明保留直到手动继续，不会自动续战', () => {
    const pause = new PauseOverlayRuntime();
    pause.enterLifecycle();
    assert.equal(firstLevelPauseMenuPresentation(pause.snapshot).title, '后台安全暂停');
    assert.equal(firstLevelPauseMenuPresentation(pause.snapshot).actions[0], '等待返回页面');
    assert.equal(pause.continue(), false);
    pause.leaveLifecycle();
    assert.equal(pause.snapshot.visible, true);
    assert.equal(pause.snapshot.reason, null);
    assert.equal(firstLevelPauseMenuPresentation(pause.snapshot).title, '已返回 · 战斗仍暂停');
    assert.equal(firstLevelPauseMenuPresentation(pause.snapshot).actions[0], '继续战斗');
    pause.show('settings'); pause.show('menu');
    assert.equal(pause.snapshot.lifecycleRecovery, true);
    assert.equal(pause.continue(), true);
    assert.equal(pause.snapshot.lifecycleRecovery, false);
    pause.enterUser();
    assert.equal(firstLevelPauseMenuPresentation(pause.snapshot).title, '战斗暂停');
});

test('路线错误优先于后台恢复，不提供继续或假胜败，也不能切到设置逃过阻塞', () => {
    const pause = new PauseOverlayRuntime();
    pause.enterRouteError(); pause.enterLifecycle(); pause.leaveLifecycle();
    assert.equal(pause.snapshot.reason, 'route-error');
    assert.equal(pause.snapshot.canContinue, false);
    pause.show('menu'); assert.equal(pause.snapshot.screen, 'route-error');
    assert.equal(pause.continue(), false);
    const copy = firstLevelRouteRecoveryPresentation();
    assert.deepEqual(copy.actionKinds, ['restart', 'home']);
    assert.match(copy.body.join(''), /清空炮塔，恢复关卡初始金币/);
    assert.match(copy.body.join(''), /本局统计将重置/);
    assert.match(copy.body[0], /不会自动判胜负/);
    assert.doesNotMatch(copy.actions.join(''), /继续/);
    pause.clear(); assert.equal(pause.snapshot.lifecycleRecovery, false);
});
