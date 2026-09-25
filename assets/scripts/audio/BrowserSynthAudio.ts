import type { FirstLevelSoundCue, FirstLevelSoundSink } from './FirstLevelSoundDirector';

type AudioBus = 'ui' | 'sfx' | 'alert';
type Tone = { readonly hz: number; readonly endHz?: number; readonly at: number; readonly duration: number; readonly gain: number; readonly wave: OscillatorType };
type CueRecipe = { readonly bus: AudioBus; readonly tones: readonly Tone[] };

const CUES: Readonly<Record<FirstLevelSoundCue, CueRecipe>> = {
    ui: { bus: 'ui', tones: [{ hz: 700, endHz: 820, at: 0, duration: 0.055, gain: 0.13, wave: 'sine' }] },
    place: { bus: 'ui', tones: [
        { hz: 430, endHz: 550, at: 0, duration: 0.11, gain: 0.22, wave: 'triangle' },
        { hz: 650, at: 0.06, duration: 0.12, gain: 0.11, wave: 'sine' },
    ] },
    reject: { bus: 'ui', tones: [{ hz: 260, endHz: 180, at: 0, duration: 0.14, gain: 0.16, wave: 'triangle' }] },
    'rivet-shot': { bus: 'sfx', tones: [{ hz: 190, endHz: 115, at: 0, duration: 0.045, gain: 0.11, wave: 'triangle' }] },
    'frost-shot': { bus: 'sfx', tones: [
        { hz: 640, endHz: 390, at: 0, duration: 0.12, gain: 0.12, wave: 'sine' },
        { hz: 930, at: 0.025, duration: 0.08, gain: 0.045, wave: 'sine' },
    ] },
    kill: { bus: 'sfx', tones: [
        { hz: 500, endHz: 690, at: 0, duration: 0.1, gain: 0.12, wave: 'sine' },
        { hz: 760, at: 0.055, duration: 0.13, gain: 0.08, wave: 'sine' },
    ] },
    'core-hit': { bus: 'alert', tones: [{ hz: 155, endHz: 70, at: 0, duration: 0.28, gain: 0.22, wave: 'triangle' }] },
    'wave-start': { bus: 'alert', tones: [
        { hz: 330, at: 0, duration: 0.16, gain: 0.1, wave: 'triangle' },
        { hz: 440, at: 0.13, duration: 0.18, gain: 0.12, wave: 'triangle' },
    ] },
    'wave-clear': { bus: 'alert', tones: [
        { hz: 520, at: 0, duration: 0.15, gain: 0.09, wave: 'sine' },
        { hz: 660, at: 0.13, duration: 0.2, gain: 0.11, wave: 'sine' },
    ] },
    victory: { bus: 'alert', tones: [
        { hz: 440, at: 0, duration: 0.2, gain: 0.12, wave: 'triangle' },
        { hz: 554, at: 0.16, duration: 0.22, gain: 0.12, wave: 'triangle' },
        { hz: 660, at: 0.32, duration: 0.36, gain: 0.11, wave: 'sine' },
    ] },
    defeat: { bus: 'alert', tones: [
        { hz: 240, endHz: 175, at: 0, duration: 0.28, gain: 0.12, wave: 'triangle' },
        { hz: 170, endHz: 100, at: 0.22, duration: 0.35, gain: 0.12, wave: 'triangle' },
    ] },
};

function dbToGain(db: number): number {
    return Math.pow(10, db / 20);
}

/** Web Audio 只在用户手势后创建；浏览器拒绝播放时静默降级，不锁住游戏。 */
export class BrowserSynthAudio implements FirstLevelSoundSink {
    private context: AudioContext | null = null;
    private master: GainNode | null = null;
    private buses: Partial<Record<AudioBus, GainNode>> = {};
    private muted = false;
    private activeVoices = 0;
    private sequence = 0;

    public get ready(): boolean {
        return this.context?.state === 'running';
    }

    public unlock(): void {
        if (typeof AudioContext === 'undefined') return;
        try {
            if (!this.context) this.createGraph();
            if (this.context?.state === 'suspended') void this.context.resume().catch(() => undefined);
        } catch {
            // 浏览器禁音或音频设备不可用时，保留完整的无声玩法。
        }
    }

    public play(cue: FirstLevelSoundCue): void {
        const context = this.context;
        if (!context || context.state === 'closed') return;
        const recipe = CUES[cue];
        for (const tone of recipe.tones) {
            if (this.activeVoices >= 12) break;
            this.tone(context, this.buses[recipe.bus]!, tone);
        }
    }

    public setMuted(muted: boolean): void {
        this.muted = muted;
        if (this.context && this.master) {
            this.master.gain.setTargetAtTime(muted ? 0 : dbToGain(-12), this.context.currentTime, 0.015);
        }
    }

    public suspend(): void {
        if (this.context?.state === 'running') void this.context.suspend().catch(() => undefined);
    }

    public close(): void {
        if (this.context && this.context.state !== 'closed') void this.context.close().catch(() => undefined);
        this.context = null;
        this.master = null;
        this.buses = {};
        this.activeVoices = 0;
    }

    private createGraph(): void {
        const context = new AudioContext();
        const master = context.createGain();
        master.gain.value = this.muted ? 0 : dbToGain(-12);
        master.connect(context.destination);
        for (const [bus, db] of [['ui', -8], ['sfx', -5], ['alert', -3]] as const) {
            const node = context.createGain();
            node.gain.value = dbToGain(db);
            node.connect(master);
            this.buses[bus] = node;
        }
        this.context = context;
        this.master = master;
    }

    private tone(context: AudioContext, bus: GainNode, spec: Tone): void {
        const start = context.currentTime + spec.at;
        const end = start + spec.duration;
        const oscillator = context.createOscillator();
        const envelope = context.createGain();
        // 轻微轮换音高避免连续炮声机械重复，且让所有音源迅速回到静音。
        const pitch = 1 + ((this.sequence++ % 3) - 1) * 0.025;
        oscillator.type = spec.wave;
        oscillator.frequency.setValueAtTime(spec.hz * pitch, start);
        if (spec.endHz) oscillator.frequency.exponentialRampToValueAtTime(spec.endHz * pitch, end);
        envelope.gain.setValueAtTime(0.0001, start);
        envelope.gain.exponentialRampToValueAtTime(spec.gain, start + 0.008);
        envelope.gain.exponentialRampToValueAtTime(0.0001, end);
        oscillator.connect(envelope);
        envelope.connect(bus);
        this.activeVoices += 1;
        oscillator.onended = () => {
            oscillator.disconnect();
            envelope.disconnect();
            this.activeVoices = Math.max(0, this.activeVoices - 1);
        };
        oscillator.start(start);
        oscillator.stop(end + 0.005);
    }
}
