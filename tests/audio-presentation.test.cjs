const test = require('node:test');
const assert = require('node:assert/strict');
const { AudioVoiceBudget } = require('../.test-dist/audio/AudioVoiceBudget.js');
const { FIRST_LEVEL_SOUND_RECIPES, soundRecipe } = require('../.test-dist/audio/FirstLevelSoundRecipes.js');
const { combatSoundCues } = require('../.test-dist/audio/FirstLevelCombatSound.js');
const { BrowserSynthAudio } = require('../.test-dist/audio/BrowserSynthAudio.js');
const { FirstLevelSoundDirector } = require('../.test-dist/audio/FirstLevelSoundDirector.js');

test('音色目录覆盖交互、三类死亡、危急警报；枪声整组轮换而旋律提示不走调', () => {
    for (const [cue, recipe] of Object.entries(FIRST_LEVEL_SOUND_RECIPES)) {
        assert.ok(['ui', 'sfx', 'alert'].includes(recipe.bus));
        assert.ok(recipe.tones.length <= 3);
        for (const tone of recipe.tones) {
            assert.ok(tone.hz > 0 && tone.hz < 20000, cue);
            assert.ok(tone.duration > 0.008 && tone.duration < 1, cue);
            assert.ok(tone.gain > 0 && tone.gain <= 0.22, cue);
        }
    }
    for (const cue of ['rivet-shot', 'frost-shot']) {
        const variants = [0, 1, 2].map((count) => soundRecipe(cue, count));
        assert.equal(new Set(variants.map((recipe) => recipe.tones[0].hz)).size, 3);
        assert.deepEqual(soundRecipe(cue, 3), variants[0]);
        assert.ok(Math.abs(variants[0].tones[1].hz / variants[0].tones[0].hz
            - variants[1].tones[1].hz / variants[1].tones[0].hz) < 1e-12);
    }
    assert.equal(soundRecipe('victory', 99), FIRST_LEVEL_SOUND_RECIPES.victory);
    assert.ok(FIRST_LEVEL_SOUND_RECIPES['core-hit'].priority > FIRST_LEVEL_SOUND_RECIPES['rivet-shot'].priority);
    assert.ok(FIRST_LEVEL_SOUND_RECIPES.victory.priority > FIRST_LEVEL_SOUND_RECIPES['core-hit'].priority);
});

test('声部按整组事务抢占低优先级声音，不截和弦、同级不抢、归还幂等', () => {
    const budget = new AudioVoiceBudget(6);
    const first = budget.acquire(2, 0);
    const second = budget.acquire(2, 0);
    const third = budget.acquire(2, 1);
    assert.equal(budget.activeCount, 6);
    assert.equal(budget.acquire(2, 0), null);
    const alert = budget.acquire(3, 3);
    assert.deepEqual(alert.evicted, [first.id, second.id]);
    assert.equal(budget.activeCount, 5);
    assert.equal(budget.acquire(4, 1), null, '无法容纳时不能先删其他声部');
    assert.equal(budget.activeCount, 5);
    budget.release(third.id);
    budget.release(third.id);
    assert.equal(budget.activeCount, 3);
    budget.clear();
    assert.equal(budget.activeCount, 0);
    assert.equal(budget.acquire(7, 4), null);
});

test('混编声音只读战斗事件，单帧死亡重装优先，危急阈值只在跨越时触发', () => {
    const result = {
        shots: [
            { towerId: 'rivet-gun', lethal: false }, { towerId: 'rivet-gun', lethal: false },
            { towerId: 'frost-coil', lethal: true },
        ],
        killed: ['clockwork-infantry', 'clockwork-runner', 'iron-canister-hauler'].map((id) => ({ archetype: { id } })),
        leaked: [{}], spawningCompleted: false,
    };
    const before = JSON.stringify(result);
    assert.deepEqual(combatSoundCues(result, 4, 3), ['core-hit', 'core-critical', 'hauler-death', 'rivet-shot', 'frost-shot', 'metal-hit']);
    assert.ok(!combatSoundCues(result, 3, 2).includes('core-critical'));
    assert.ok(!combatSoundCues(result, 4, 0).includes('core-critical'), '失败直接给终局声，不再叠危急警报');
    assert.equal(JSON.stringify(result), before);
});

test('死亡共享节奏，输出拒绝不吃掉下一次限频窗口', () => {
    let accepts = false;
    const sound = new FirstLevelSoundDirector({ ready: true, unlock() {}, play() { return accepts; }, setMuted() {}, setVolumeStep() {}, suspend() {}, close() {} });
    assert.equal(sound.play('rivet-shot', 1000), false);
    accepts = true;
    assert.equal(sound.play('rivet-shot', 1001), true);
    assert.equal(sound.play('infantry-death', 1001), true);
    assert.equal(sound.play('runner-death', 1100), false);
    assert.equal(sound.play('hauler-death', 1221), true);
    assert.equal(sound.diagnostics.acceptedCount, 3);
    assert.equal(sound.diagnostics.lastCue, 'hauler-death');
});

test('浏览器音频未解锁或暂停时不排队，警报替换枪声，静音和销毁释放预留声部', async () => {
    const original = global.AudioContext;
    let context;
    const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {} });
    class MockContext {
        state = 'running'; currentTime = 0; destination = {}; sources = [];
        constructor() { context = this; }
        createGain() { return { gain: param(), connect() {}, disconnect() {} }; }
        createOscillator() {
            const source = { frequency: param(), connect() {}, disconnect() {}, start() {}, stop(at) { source.stops.push(at); }, stops: [], onended: null };
            this.sources.push(source);
            return source;
        }
        suspend() { this.state = 'suspended'; return Promise.resolve(); }
        resume() { this.state = 'running'; return Promise.resolve(); }
        close() { this.state = 'closed'; return Promise.resolve(); }
    }
    global.AudioContext = MockContext;
    try {
        const audio = new BrowserSynthAudio();
        assert.equal(audio.play('ui'), false);
        audio.unlock();
        for (let index = 0; index < 6; index += 1) assert.equal(audio.play('rivet-shot'), true);
        assert.equal(audio.activeVoiceCount, 12);
        assert.equal(audio.play('rivet-shot'), false);
        assert.equal(audio.play('victory'), true);
        assert.equal(audio.activeVoiceCount, 11);
        assert.ok(context.sources.slice(0, 4).every((source) => source.stops.includes(0.012)));
        audio.suspend();
        assert.equal(audio.activeVoiceCount, 0);
        const count = context.sources.length;
        assert.equal(audio.play('ui'), false);
        assert.equal(context.sources.length, count, '暂停中不能创建等待恢复的旧音源');
        audio.unlock();
        assert.equal(audio.play('upgrade'), true);
        audio.setMuted(true);
        assert.equal(audio.activeVoiceCount, 0);
        assert.equal(audio.play('sell'), false);
        audio.close();
        assert.equal(audio.activeVoiceCount, 0);
        assert.equal(audio.ready, false);
        for (const source of context.sources) source.onended?.();
        assert.equal(audio.activeVoiceCount, 0);
    } finally { global.AudioContext = original; }
});
