// 使用运行时同一份音色目录导出离线试听；不是游戏预加载资源，也不做响度归一化。
const { mkdirSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { soundRecipe } = require('../.test-dist/audio/FirstLevelSoundRecipes.js');
const { volumeStepGain } = require('../.test-dist/audio/BrowserSynthAudio.js');

const rate = 48000;
const busDb = { ui: -8, sfx: -5, alert: -3 };
const cues = ['pickup', 'place', 'upgrade', 'sell', 'reject',
    'rivet-shot', 'rivet-shot', 'rivet-shot', 'frost-shot', 'frost-shot', 'frost-shot',
    'metal-hit', 'frost-hit', 'infantry-death', 'runner-death', 'hauler-death',
    'core-hit', 'core-critical', 'wave-start', 'wave-clear', 'victory', 'defeat'];
const occurrences = new Map();
let cursor = 0.4;
const timeline = cues.map((cue) => {
    const occurrence = occurrences.get(cue) ?? 0;
    occurrences.set(cue, occurrence + 1);
    const recipe = soundRecipe(cue, occurrence);
    const duration = Math.max(...recipe.tones.map((tone) => tone.at + tone.duration));
    const entry = { cue, variant: occurrence % 3, atSeconds: Number(cursor.toFixed(3)), durationSeconds: duration, recipe };
    cursor += duration + 0.55;
    return entry;
});
const samples = new Float64Array(Math.ceil(cursor * rate));
for (const entry of timeline) {
    const busGain = 10 ** (busDb[entry.recipe.bus] / 20) * volumeStepGain(4);
    for (const spec of entry.recipe.tones) {
        const offset = Math.round((entry.atSeconds + spec.at) * rate);
        const length = Math.ceil(spec.duration * rate);
        const slope = spec.endHz ? Math.log(spec.endHz / spec.hz) / spec.duration : 0;
        for (let frame = 0; frame < length; frame += 1) {
            const t = frame / rate;
            const cycles = slope ? spec.hz * Math.expm1(slope * t) / slope : spec.hz * t;
            const sine = Math.sin(cycles * Math.PI * 2);
            // 离线 triangle 是数学近似；浏览器振荡器为带限实现，主观审批仍需游戏内试听。
            const wave = spec.wave === 'triangle' ? 2 / Math.PI * Math.asin(sine) : sine;
            const envelope = t < 0.008
                ? 0.0001 * (spec.gain / 0.0001) ** (t / 0.008)
                : spec.gain * (0.0001 / spec.gain) ** ((t - 0.008) / (spec.duration - 0.008));
            samples[offset + frame] += wave * envelope * busGain;
        }
    }
}
let peak = 0;
for (const sample of samples) {
    if (!Number.isFinite(sample)) throw new Error('试听样本出现非有限值');
    peak = Math.max(peak, Math.abs(sample));
}
if (peak >= 1) throw new Error('试听样本削波，不输出');
const wav = Buffer.alloc(44 + samples.length * 2);
wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
wav.write('data', 36); wav.writeUInt32LE(samples.length * 2, 40);
for (let index = 0; index < samples.length; index += 1) wav.writeInt16LE(Math.round(samples[index] * 32767), 44 + index * 2);
const directory = resolve(__dirname, '../art-source/first-level-audio');
mkdirSync(directory, { recursive: true });
writeFileSync(resolve(directory, 'sfx-review-v1.wav'), wav);
const manifest = {
    source: 'Original programmatic synthesis from assets/scripts/audio/FirstLevelSoundRecipes.ts; no external audio samples',
    status: 'candidate-needs-human-listening', sampleRate: rate, channels: 1, pcmBits: 16,
    durationSeconds: samples.length / rate, peakDbFS: 20 * Math.log10(peak), bytes: wav.length,
    runtimeUsage: 'none: offline review artifact, generated from runtime recipes',
    limitation: 'Offline mathematical oscillator approximation; not a recording of browser output, not a LUFS or dense-mix measurement',
    timeline: timeline.map(({ recipe, ...entry }) => entry),
};
writeFileSync(resolve(directory, 'sfx-review-v1-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
process.stdout.write(JSON.stringify({ directory, ...manifest, timeline: undefined }) + '\n');
