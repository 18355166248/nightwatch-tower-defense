import type { FirstLevelSoundCue, FirstLevelSoundSink } from './FirstLevelSoundDirector';
import { soundRecipe, type AudioBus, type SoundTone } from './FirstLevelSoundRecipes';
import { AudioVoiceBudget } from './AudioVoiceBudget';
import { BrowserLayeredMusic, SILENT_MUSIC_DIAGNOSTICS } from './BrowserLayeredMusic';
import type { MusicMood } from './FirstLevelMusicPolicy';

function dbToGain(db: number): number {
    return Math.pow(10, db / 20);
}

/** 四挡主音量以 dB 映射，保留原最高档 -12 dB 的混音余量。 */
export function volumeStepGain(step: 1 | 2 | 3 | 4): number {
    return dbToGain(([-24, -18, -15, -12] as const)[step - 1]);
}

/** Web Audio 只在用户手势后创建；浏览器拒绝播放时静默降级，不锁住游戏。 */
export class BrowserSynthAudio implements FirstLevelSoundSink {
    private context: AudioContext | null = null;
    private master: GainNode | null = null;
    private buses: Partial<Record<AudioBus, GainNode>> = {};
    private muted = false;
    private volumeStep: 1 | 2 | 3 | 4 = 4;
    private readonly budget = new AudioVoiceBudget(12);
    private readonly groups = new Map<number, readonly { source: OscillatorNode; envelope: GainNode }[]>();
    private readonly occurrences = new Map<FirstLevelSoundCue, number>();
    private music: BrowserLayeredMusic | null = null;

    public get musicDiagnostics() { return this.music?.diagnostics ?? SILENT_MUSIC_DIAGNOSTICS; }
    public syncMusic(mood: MusicMood): void { this.music?.sync(mood); }

    public get activeVoiceCount(): number { return this.budget.activeCount; }

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

    public play(cue: FirstLevelSoundCue): boolean {
        const context = this.context;
        // 暂停/未解锁时不把旧战斗音排进 AudioContext，恢复后才不会突然补播一串炮声。
        if (!context || context.state !== 'running' || this.muted) return false;
        const occurrence = this.occurrences.get(cue) ?? 0;
        const recipe = soundRecipe(cue, occurrence);
        const grant = this.budget.acquire(recipe.tones.length, recipe.priority);
        if (!grant) return false;
        for (const id of grant.evicted) this.stopGroup(id, context.currentTime);
        let remaining = recipe.tones.length;
        const voices: { source: OscillatorNode; envelope: GainNode }[] = [];
        this.groups.set(grant.id, voices);
        try {
            for (const spec of recipe.tones) voices.push(this.tone(context, this.buses[recipe.bus]!, spec, () => {
                remaining -= 1;
                if (remaining === 0) {
                    this.budget.release(grant.id);
                    this.groups.delete(grant.id);
                }
            }));
        } catch {
            this.stopGroup(grant.id, context.currentTime, true);
            this.budget.release(grant.id);
            return false;
        }
        this.occurrences.set(cue, occurrence + 1);
        if (recipe.priority >= 3) this.music?.duck(Math.max(...recipe.tones.map((tone) => tone.at + tone.duration)));
        return true;
    }

    private stopGroup(id: number, now: number, immediate = false): void {
        for (const voice of this.groups.get(id) ?? []) {
            // 优先级抢占短淡出；暂停/静音则立即停止，避免冻结后恢复时补播尾音。
            voice.envelope.gain.cancelScheduledValues(now);
            voice.envelope.gain.setTargetAtTime(0.0001, now, 0.003);
            try { voice.source.stop(immediate ? now : now + 0.012); } catch { /* 已结束的音源无需再次停止。 */ }
        }
        this.groups.delete(id);
    }

    public setMuted(muted: boolean): void {
        this.muted = muted;
        this.music?.setEnabled(!muted);
        if (this.context && this.master) {
            if (muted) {
                for (const id of Array.from(this.groups.keys())) this.stopGroup(id, this.context.currentTime, true);
                this.budget.clear();
            }
            this.master.gain.setTargetAtTime(muted ? 0 : volumeStepGain(this.volumeStep), this.context.currentTime, 0.015);
        }
    }

    public setVolumeStep(step: 1 | 2 | 3 | 4): void {
        this.volumeStep = step;
        if (this.context && this.master) {
            this.master.gain.setTargetAtTime(this.muted ? 0 : volumeStepGain(step), this.context.currentTime, 0.015);
        }
    }

    public suspend(): void {
        this.music?.suspend();
        if (this.context?.state === 'running') {
            // 冻结前丢弃全部短音，恢复只接收新事件，不补播暂停前尚未结束的提示。
            for (const id of Array.from(this.groups.keys())) this.stopGroup(id, this.context.currentTime, true);
            this.budget.clear();
            void this.context.suspend().catch(() => undefined);
        }
    }

    public close(): void {
        this.music?.close();
        this.music = null;
        if (this.context && this.context.state !== 'closed') void this.context.close().catch(() => undefined);
        this.context = null;
        this.master = null;
        this.buses = {};
        this.groups.clear();
        this.budget.clear();
        this.occurrences.clear();
    }

    private createGraph(): void {
        const context = new AudioContext();
        const master = context.createGain();
        master.gain.value = this.muted ? 0 : volumeStepGain(this.volumeStep);
        master.connect(context.destination);
        for (const [bus, db] of [['ui', -8], ['sfx', -5], ['alert', -3]] as const) {
            const node = context.createGain();
            node.gain.value = dbToGain(db);
            node.connect(master);
            this.buses[bus] = node;
        }
        this.context = context;
        this.master = master;
        this.music = new BrowserLayeredMusic(context, master);
        this.music.setEnabled(!this.muted);
    }

    private tone(context: AudioContext, bus: GainNode, spec: SoundTone, ended: () => void): { source: OscillatorNode; envelope: GainNode } {
        const start = context.currentTime + spec.at;
        const end = start + spec.duration;
        const oscillator = context.createOscillator();
        const envelope = context.createGain();
        oscillator.type = spec.wave;
        oscillator.frequency.setValueAtTime(spec.hz, start);
        if (spec.endHz) oscillator.frequency.exponentialRampToValueAtTime(spec.endHz, end);
        envelope.gain.setValueAtTime(0.0001, start);
        envelope.gain.exponentialRampToValueAtTime(spec.gain, start + 0.008);
        envelope.gain.exponentialRampToValueAtTime(0.0001, end);
        oscillator.connect(envelope);
        envelope.connect(bus);
        oscillator.onended = () => {
            oscillator.disconnect();
            envelope.disconnect();
            ended();
        };
        oscillator.start(start);
        oscillator.stop(end + 0.005);
        return { source: oscillator, envelope };
    }
}
