import { MUSIC_BAR_SECONDS, MUSIC_BUS_GAIN, MUSIC_LOOP_SECONDS, MUSIC_SAMPLE_RATE, renderFirstLevelMusic } from './FirstLevelMusicScore';
import type { MusicMood } from './FirstLevelMusicPolicy';

export interface MusicDiagnostics {
    readonly ready: boolean;
    readonly playing: boolean;
    readonly voices: number;
    readonly mood: MusicMood;
    readonly intensityActive: boolean;
    readonly intensityPending: boolean;
    readonly positionSeconds: number;
    readonly ducked: boolean;
    readonly starts: number;
}
export const SILENT_MUSIC_DIAGNOSTICS: MusicDiagnostics = {
    ready: false, playing: false, voices: 0, mood: 'off', intensityActive: false,
    intensityPending: false, positionSeconds: 0, ducked: false, starts: 0,
};

/** 两个固定循环声部走 Music 总线；不进入 12 短音预算，不随模拟速度或敌人数反复重启。 */
export class BrowserLayeredMusic {
    private readonly output: GainNode;
    private readonly layerGains: readonly GainNode[];
    private buffers: readonly AudioBuffer[] | null = null;
    private sources: AudioBufferSourceNode[] = [];
    private loading = false;
    private failed = false;
    private disposed = false;
    private mood: MusicMood = 'off';
    private enabled = true;
    private offset = 0;
    private startedAt = 0;
    private starts = 0;
    private intensity = false;
    private pendingIntensity = false;
    private transitionAt = Infinity;
    private duckUntil = 0;

    public constructor(private readonly context: AudioContext, master: GainNode,
        private readonly render: () => Promise<readonly Float32Array[]> = () =>
            renderFirstLevelMusic(() => new Promise((resolve) => setTimeout(resolve, 0)))) {
        this.output = context.createGain();
        this.output.gain.value = MUSIC_BUS_GAIN;
        this.output.connect(master);
        this.layerGains = [context.createGain(), context.createGain()];
        for (const layer of this.layerGains) layer.connect(this.output);
    }

    public get diagnostics(): MusicDiagnostics {
        this.settleTransition();
        return { ready: this.buffers !== null, playing: this.sources.length === 2, voices: this.sources.length,
            mood: this.mood, intensityActive: this.sources.length === 2 && this.intensity,
            intensityPending: this.transitionAt !== Infinity, positionSeconds: this.position(),
            ducked: this.context.currentTime < this.duckUntil, starts: this.starts };
    }

    public sync(mood: MusicMood): void {
        this.mood = mood;
        if (mood === 'off') { this.stop(true); return; }
        if (mood === 'paused' || !this.enabled || this.context.state !== 'running') { this.stop(false); return; }
        if (!this.buffers) { this.prepare(); return; }
        if (this.sources.length === 0 && !this.start()) return;
        this.settleTransition();
        const requested = mood === 'intense';
        if (requested === (this.transitionAt !== Infinity ? this.pendingIntensity : this.intensity)) return;
        // 两层一直同相循环，只在下一个小节渐变强度；用 AudioContext 时钟，不用游戏 delta。
        const now = this.context.currentTime;
        const toBar = MUSIC_BAR_SECONDS - this.position() % MUSIC_BAR_SECONDS;
        const param = this.layerGains[1].gain;
        param.cancelScheduledValues(now);
        param.setValueAtTime(param.value, now);
        this.transitionAt = now + toBar;
        this.pendingIntensity = requested;
        param.setTargetAtTime(requested ? 0.8 : 0, this.transitionAt, 0.35);
    }

    public setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        if (!enabled) this.stop(false);
    }

    public duck(duration: number): void {
        if (this.sources.length === 0) return;
        const now = this.context.currentTime;
        this.duckUntil = Math.max(this.duckUntil, now + duration + 0.2);
        const param = this.output.gain;
        param.cancelScheduledValues(now);
        param.setValueAtTime(param.value, now);
        param.setTargetAtTime(MUSIC_BUS_GAIN * Math.pow(10, -10 / 20), now, 0.02);
        param.setTargetAtTime(MUSIC_BUS_GAIN, this.duckUntil, 0.3);
    }

    public suspend(): void { this.stop(false); }

    public close(): void {
        this.disposed = true;
        this.stop(true);
        this.buffers = null;
        for (const layer of this.layerGains) layer.disconnect();
        this.output.disconnect();
    }

    private prepare(): void {
        if (this.loading || this.failed || this.disposed) return;
        this.loading = true;
        void this.render().then((stems) => {
            // 生成期间可暂停、静音或销毁；成功不代表获得播放授权，下一次 sync 再决定是否启动。
            if (this.disposed || this.context.state === 'closed') return;
            this.buffers = stems.map((samples) => {
                const buffer = this.context.createBuffer(1, samples.length, MUSIC_SAMPLE_RATE);
                buffer.getChannelData(0).set(samples);
                return buffer;
            });
        }).catch(() => { this.failed = true; }).finally(() => { this.loading = false; });
    }

    private start(): boolean {
        const now = this.context.currentTime;
        const startAt = now + 0.03;
        const created: AudioBufferSourceNode[] = [];
        try {
            this.intensity = this.mood === 'intense';
            this.transitionAt = Infinity;
            this.output.gain.cancelScheduledValues(now);
            this.output.gain.setValueAtTime(MUSIC_BUS_GAIN, now);
            this.duckUntil = 0;
            for (let index = 0; index < 2; index += 1) {
                const source = this.context.createBufferSource();
                created.push(source);
                source.buffer = this.buffers![index];
                source.loop = true;
                source.loopEnd = MUSIC_LOOP_SECONDS;
                const layer = this.layerGains[index];
                layer.gain.cancelScheduledValues(now);
                layer.gain.setValueAtTime(0, now);
                layer.gain.setTargetAtTime(index === 0 ? 1 : this.intensity ? 0.8 : 0, startAt, 0.2);
                source.connect(layer);
                source.start(startAt, this.offset);
            }
            this.sources = created;
            this.startedAt = startAt;
            this.starts += 1;
            return true;
        } catch {
            // 整组启动失败清理已创建层，SFX 和无声玩法照常运行，不留下一条孤立循环。
            for (const source of created) { try { source.stop(); } catch { /* 未启动音源也可能拒绝 stop。 */ } source.disconnect(); }
            this.failed = true;
            this.buffers = null;
            return false;
        }
    }

    private position(): number {
        return (this.offset + (this.sources.length ? Math.max(0, this.context.currentTime - this.startedAt) : 0)) % MUSIC_LOOP_SECONDS;
    }

    private settleTransition(): void {
        if (this.context.currentTime < this.transitionAt) return;
        this.intensity = this.pendingIntensity;
        this.transitionAt = Infinity;
    }

    private stop(reset: boolean): void {
        this.offset = reset ? 0 : this.position();
        for (const source of this.sources) { try { source.stop(); } catch { /* 已停止无需重试。 */ } source.disconnect(); }
        this.sources = [];
        this.transitionAt = Infinity;
        this.duckUntil = 0;
        if (reset) this.intensity = false;
    }
}
