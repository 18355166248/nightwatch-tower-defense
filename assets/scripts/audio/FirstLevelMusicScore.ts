export const MUSIC_SAMPLE_RATE = 22050;
export const MUSIC_BPM = 96;
export const MUSIC_BAR_SECONDS = 4 * 60 / MUSIC_BPM;
export const MUSIC_LOOP_SECONDS = 16 * MUSIC_BAR_SECONDS;
export const MUSIC_BUS_GAIN = Math.pow(10, -9 / 20);
export interface MusicNote {
    readonly at: number;
    readonly duration: number;
    readonly hz: number;
    readonly gain: number;
    readonly voice: 'pad' | 'bell' | 'bass' | 'pulse';
}
const hz = (midi: number): number => 440 * Math.pow(2, (midi - 69) / 12);

/** 原创 16 小节 D 小调机械夜城候选；基础与强度层共用乐谱时钟，无外部采样。 */
export function firstLevelMusicScore(): readonly (readonly MusicNote[])[] {
    const base: MusicNote[] = [];
    const intensity: MusicNote[] = [];
    const chords = [[50, 57, 65], [46, 53, 62], [53, 60, 69], [48, 55, 64]];
    const melody = [74, 69, 65, 69, 70, 65, 62, 65, 72, 69, 65, 69, 67, 64, 60, 64];
    const beat = 60 / MUSIC_BPM;
    for (let bar = 0; bar < 16; bar += 1) {
        const at = bar * MUSIC_BAR_SECONDS;
        const chord = chords[Math.floor(bar / 4)];
        for (const midi of chord) base.push({ at, duration: 2.8, hz: hz(midi), gain: 0.032, voice: 'pad' });
        base.push({ at: at + beat, duration: 1.15, hz: hz(melody[bar]), gain: 0.075, voice: 'bell' });
        base.push({ at, duration: 1.1, hz: hz(chord[0] - 12), gain: 0.12, voice: 'bass' });
        // 后半关只增加机械节奏和低音，不改变主旋律，不按 2× 战斗速度加快音乐。
        for (let step = 0; step < 8; step += 1) {
            intensity.push({ at: at + step * beat / 2, duration: 0.16,
                hz: step % 2 === 0 ? 105 : 520, gain: step % 2 === 0 ? 0.13 : 0.028, voice: 'pulse' });
        }
        intensity.push({ at: at + 2 * beat, duration: 0.5, hz: hz(chord[0] - 12), gain: 0.1, voice: 'bass' });
    }
    return [base, intensity];
}

/** 跨循环的衰减尾音回卷到开头；不能丢尾巴后再拼接，否则循环点会突然断声。 */
export function renderMusicNote(samples: Float32Array, note: MusicNote, sampleRate = MUSIC_SAMPLE_RATE): void {
    const start = Math.round(note.at * sampleRate);
    const frames = Math.ceil(note.duration * sampleRate);
    for (let frame = 0; frame < frames; frame += 1) {
        const t = frame / sampleRate;
        const phase = 2 * Math.PI * note.hz * t;
        let signal: number;
        let envelope: number;
        if (note.voice === 'pad') {
            signal = Math.sin(phase) * 0.8 + Math.sin(phase * 2) * 0.12;
            envelope = Math.min(1, t / 0.22, (note.duration - t) / 0.5);
        } else if (note.voice === 'bell') {
            signal = Math.sin(phase) + Math.sin(phase * 2.76) * 0.18 * Math.exp(-t * 6);
            envelope = Math.min(1, t / 0.006) * Math.exp(-t * 5);
        } else if (note.voice === 'bass') {
            signal = Math.sin(phase) + Math.sin(phase * 2) * 0.15;
            envelope = Math.min(1, t / 0.012) * Math.exp(-t * 4);
        } else {
            signal = Math.sin(2 * Math.PI * note.hz * (1 - Math.exp(-t * 18)) / 18);
            envelope = Math.min(1, t / 0.004) * Math.exp(-t * 30);
        }
        const tail = Math.min(1, (note.duration - t) / 0.025);
        samples[(start + frame) % samples.length] += signal * envelope * tail * note.gain;
    }
}

export async function renderFirstLevelMusic(yieldBatch: () => Promise<void> = () => Promise.resolve()): Promise<readonly Float32Array[]> {
    const stems: Float32Array[] = [];
    for (const notes of firstLevelMusicScore()) {
        const samples = new Float32Array(Math.round(MUSIC_LOOP_SECONDS * MUSIC_SAMPLE_RATE));
        for (let index = 0; index < notes.length; index += 1) {
            renderMusicNote(samples, notes[index]);
            // 首次用户手势后分批生成，不用一次长循环阻塞布塔和首个 UI 音。
            if (index % 4 === 3) await yieldBatch();
        }
        stems.push(samples);
    }
    return stems;
}
