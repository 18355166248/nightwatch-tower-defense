// 原创谱面离线复现，前 20 秒基础层、其后加入节奏；跨 40 秒接缝继续播放。
const { mkdirSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { MUSIC_SAMPLE_RATE: rate, MUSIC_LOOP_SECONDS, MUSIC_BUS_GAIN, renderFirstLevelMusic } = require('../.test-dist/audio/FirstLevelMusicScore.js');
const { volumeStepGain } = require('../.test-dist/audio/BrowserSynthAudio.js');

(async () => {
    const stems = await renderFirstLevelMusic();
    const duration = MUSIC_LOOP_SECONDS + 10;
    const samples = new Float32Array(duration * rate);
    const mixGain = MUSIC_BUS_GAIN * volumeStepGain(4);
    let peak = 0;
    for (let frame = 0; frame < samples.length; frame += 1) {
        const t = frame / rate;
        const index = frame % stems[0].length;
        const layer = t < 20 ? 0 : 0.8 * (1 - Math.exp(-(t - 20) / 0.35));
        samples[frame] = (stems[0][index] + stems[1][index] * layer) * mixGain;
        peak = Math.max(peak, Math.abs(samples[frame]));
    }
    if (!Number.isFinite(peak) || peak >= 1) throw new Error('音乐试听存在非有限值或削波');
    const wav = Buffer.alloc(44 + samples.length * 2);
    wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
    wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
    wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
    wav.write('data', 36); wav.writeUInt32LE(samples.length * 2, 40);
    for (let index = 0; index < samples.length; index += 1) wav.writeInt16LE(Math.round(samples[index] * 32767), 44 + index * 2);
    const directory = resolve(__dirname, '../art-source/first-level-audio');
    mkdirSync(directory, { recursive: true });
    writeFileSync(resolve(directory, 'night-city-music-review-v1.wav'), wav);
    const manifest = { source: 'Original score and procedural synthesis in FirstLevelMusicScore.ts; no external samples or melodies',
        status: 'candidate-needs-human-listening', bpm: 96, loopSeconds: MUSIC_LOOP_SECONDS,
        reviewSeconds: duration, sampleRate: rate, channels: 1, peakDbFS: 20 * Math.log10(peak), bytes: wav.length,
        layerStartsAtSeconds: 20, seamAtSeconds: 40,
        runtimeBufferBytes: stems.reduce((sum, samples) => sum + samples.byteLength, 0),
        runtimeUsage: 'score generates two buffers after gesture, WAV is review-only and not imported into the game',
        rights: 'No third-party sampling; human originality and commercial-rights approval remains pending',
        limitation: 'Offline reference only, not a browser output recording or headphone/speaker loudness approval' };
    writeFileSync(resolve(directory, 'night-city-music-review-v1-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
    process.stdout.write(JSON.stringify(manifest) + '\n');
})().catch((error) => { process.stderr.write(error.stack + '\n'); process.exitCode = 1; });
