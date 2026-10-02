const test = require('node:test');
const assert = require('node:assert/strict');
const { MUSIC_SAMPLE_RATE, MUSIC_LOOP_SECONDS, MUSIC_BAR_SECONDS, renderFirstLevelMusic } = require('../.test-dist/audio/FirstLevelMusicScore.js');
const { firstLevelMusicMood } = require('../.test-dist/audio/FirstLevelMusicPolicy.js');
const { BrowserLayeredMusic } = require('../.test-dist/audio/BrowserLayeredMusic.js');

test('夜城双层乐谱同长，确定性有限样本、留混音余量，循环边界不出现大跳变', async () => {
    const stems = await renderFirstLevelMusic();
    assert.equal(stems.length, 2);
    for (const samples of stems) {
        assert.equal(samples.length, MUSIC_SAMPLE_RATE * MUSIC_LOOP_SECONDS);
        let peak = 0;
        for (const value of samples) { assert.ok(Number.isFinite(value)); peak = Math.max(peak, Math.abs(value)); }
        assert.ok(peak > 0.02 && peak < 0.4);
        const seam = Math.abs(samples[0] - samples.at(-1));
        assert.ok(seam < 0.01, `循环接缝突变 ${seam}`);
    }
    const repeat = await renderFirstLevelMusic();
    assert.deepEqual(repeat, stems);
});

test('音乐只读关卡阶段，教学待命不误当真实暂停，第五波才进入后半层', () => {
    const state = { home: false, phase: 'spawning', wave: 4, preparing: false, pauseVisible: false, guidedHold: false };
    assert.equal(firstLevelMusicMood(state), 'calm');
    assert.equal(firstLevelMusicMood({ ...state, wave: 5 }), 'intense');
    assert.equal(firstLevelMusicMood({ ...state, wave: 8, phase: 'paused', guidedHold: true }), 'calm');
    assert.equal(firstLevelMusicMood({ ...state, wave: 8, phase: 'paused', guidedHold: true, pauseVisible: true }), 'paused');
    assert.equal(firstLevelMusicMood({ ...state, phase: 'paused' }), 'paused');
    for (const phase of ['victory', 'defeat']) assert.equal(firstLevelMusicMood({ ...state, phase }), 'off');
    assert.equal(firstLevelMusicMood({ ...state, home: true }), 'off');
});

function fixture(render = async () => [new Float32Array(8), new Float32Array(8)]) {
    const param = () => ({ value: 0, targets: [], cancelScheduledValues() {}, setValueAtTime(value) { this.value = value; },
        setTargetAtTime(value, time, tau) { this.targets.push({ value, time, tau }); } });
    const context = { state: 'running', currentTime: 0, sources: [], gains: [],
        createGain() { const gain = { gain: param(), connect() {}, disconnect() {} }; this.gains.push(gain); return gain; },
        createBuffer(_, count) { return { getChannelData: () => new Float32Array(count) }; },
        createBufferSource() { const source = { starts: [], stopped: false, connect() {}, disconnect() {},
            start(at, offset) { this.starts.push({ at, offset }); }, stop() { this.stopped = true; } }; this.sources.push(source); return source; } };
    const music = new BrowserLayeredMusic(context, context.createGain(), render);
    return { context, music };
}
const settle = () => new Promise((resolve) => setImmediate(resolve));

test('音乐整组同步启动、跨循环不重启；切层按音频小节量化，暂停恢复保留位置', async () => {
    const { context, music } = fixture();
    music.sync('calm'); await settle(); music.sync('calm');
    assert.equal(music.diagnostics.voices, 2);
    assert.deepEqual(context.sources[0].starts, context.sources[1].starts);
    assert.equal(context.sources[0].loop, true);
    assert.equal(music.diagnostics.starts, 1);
    context.currentTime = 0.73;
    music.sync('intense');
    assert.equal(music.diagnostics.intensityPending, true);
    assert.equal(music.diagnostics.intensityActive, false);
    const layerParam = context.gains[3].gain;
    assert.ok(Math.abs(layerParam.targets.at(-1).time - (0.03 + MUSIC_BAR_SECONDS)) < 1e-9);
    context.currentTime = 3;
    music.sync('intense'); assert.equal(music.diagnostics.intensityActive, true);
    context.currentTime = 43;
    music.sync('intense'); assert.equal(music.diagnostics.starts, 1);
    const position = music.diagnostics.positionSeconds;
    music.sync('paused');
    assert.equal(music.diagnostics.voices, 0);
    context.currentTime = 63;
    assert.equal(music.diagnostics.positionSeconds, position);
    music.sync('intense');
    assert.equal(music.diagnostics.starts, 2);
    assert.equal(context.sources[2].starts[0].offset, position);
    music.duck(0.6);
    assert.equal(music.diagnostics.ducked, true);
    context.currentTime += 1;
    assert.equal(music.diagnostics.ducked, false);
    music.sync('off'); assert.equal(music.diagnostics.voices, 0);
    assert.equal(music.diagnostics.positionSeconds, 0);
    music.close();
});

test('缓冲异步完成不能绕过静音/暂停/销毁；重复调用不累加声部，生成失败静默降级', async () => {
    let finish;
    const { context, music } = fixture(() => new Promise((resolve) => { finish = resolve; }));
    music.sync('calm'); music.setEnabled(false);
    finish([new Float32Array(8), new Float32Array(8)]); await settle();
    music.sync('calm'); assert.equal(context.sources.length, 0);
    music.setEnabled(true); context.state = 'suspended'; music.sync('calm');
    assert.equal(context.sources.length, 0);
    context.state = 'running';
    for (let index = 0; index < 50; index += 1) music.sync('calm');
    assert.equal(context.sources.length, 2);
    music.setEnabled(false); assert.ok(context.sources.every((source) => source.stopped));
    music.close();
    let later;
    const closing = fixture(() => new Promise((resolve) => { later = resolve; }));
    closing.music.sync('calm'); closing.music.close();
    later([new Float32Array(8), new Float32Array(8)]); await settle();
    assert.equal(closing.music.diagnostics.ready, false);
    assert.equal(closing.context.sources.length, 0);
    const broken = fixture(async () => { throw new Error('音频不可用'); });
    broken.music.sync('calm'); await settle(); broken.music.sync('calm');
    assert.equal(broken.music.diagnostics.voices, 0);
    broken.music.close();
});

test('第二层启动异常时整组停止，不留下第一层孤立循环或自动重试叠响', async () => {
    const { context, music } = fixture();
    const create = context.createBufferSource.bind(context);
    context.createBufferSource = () => {
        const source = create();
        if (context.sources.length === 2) source.start = () => { throw new Error('输出设备拒绝第二层'); };
        return source;
    };
    music.sync('calm'); await settle(); music.sync('calm');
    assert.equal(music.diagnostics.playing, false);
    assert.equal(music.diagnostics.voices, 0);
    assert.equal(music.diagnostics.ready, false);
    assert.ok(context.sources.every((source) => source.stopped));
    music.sync('calm'); await settle(); music.sync('calm');
    assert.equal(context.sources.length, 2);
    music.close();
});
