const test = require('node:test');
const assert = require('node:assert/strict');
const { firstLevelSettingsPresentation } = require('../.test-dist/presentation/FirstLevelSettingsPresentation');
const { FirstLevelSettingsStore, DEFAULT_FIRST_LEVEL_SETTINGS } = require('../.test-dist/systems/FirstLevelSettingsStore');
const { SimulationClock } = require('../.test-dist/systems/SimulationClock');
const { PhaseBLayout } = require('../.test-dist/presentation/PhaseBLayout');

test('设置语义动作与绘制共用几何，320宽热区至少44px且没有重叠', () => {
    const panel = new PhaseBLayout().pausePanelRect('settings');
    for (const fromHome of [true, false]) {
        const { choices } = firstLevelSettingsPresentation(DEFAULT_FIRST_LEVEL_SETTINGS, 1, fromHome);
        assert.equal(choices.length, fromHome ? 9 : 11);
        assert.equal(choices.filter(c => c.selected).length, fromHome ? 3 : 4);
        assert.equal(choices.filter(c => c.action.kind === 'speed').length, fromHome ? 0 : 2);
        for (const { rect } of choices) {
            assert.ok((rect.right - rect.left) * 320 / 1080 >= 44);
            assert.ok((rect.top - rect.bottom) * 320 / 1080 >= 44);
            assert.ok(rect.left > panel.left && rect.right < panel.right && rect.bottom > panel.bottom && rect.top < panel.top);
        }
        choices.forEach(({rect:a},i) => choices.slice(i+1).forEach(({rect:b}) => {
            assert.equal(a.left < b.right && a.right > b.left && a.bottom < b.top && a.top > b.bottom, false);
        }));
    }
});
test('直接选择设置幂等、独立并持久化，音量不强制打开声音', () => {
    const items = new Map(); let writes = 0;
    const storage = () => ({ getItem: key => items.get(key) ?? null, setItem: (key,value) => { items.set(key,value); writes++; } });
    const store = new FirstLevelSettingsStore(false, storage);
    store.setSoundEnabled(false); store.setVolumeStep(2); store.setReducedMotion(true);
    const before = writes;
    store.setSoundEnabled(false); store.setVolumeStep(2); store.setReducedMotion(true);
    assert.equal(writes,before);
    assert.deepEqual(new FirstLevelSettingsStore(false, storage).snapshot, {version:1,soundEnabled:false,volumeStep:2,reducedMotion:true});
    assert.throws(() => store.setVolumeStep(0), RangeError);
});
test('直接选择倍率幂等，不丢失时钟积累步长，非法值不污染状态', () => {
    const clock = new SimulationClock(); let steps = 0;
    clock.advance(1/120, () => steps++);
    clock.setScale(2); clock.setScale(2);
    clock.advance(1/240, () => steps++);
    assert.equal(steps,1);
    assert.throws(() => clock.setScale(3), RangeError);
    assert.equal(clock.scale,2);
});
