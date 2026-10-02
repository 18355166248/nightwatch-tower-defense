import type { FirstLevelSoundCue } from './FirstLevelSoundRecipes';
export type { FirstLevelSoundCue } from './FirstLevelSoundRecipes';
import type { MusicMood } from './FirstLevelMusicPolicy';
import { SILENT_MUSIC_DIAGNOSTICS, type MusicDiagnostics } from './BrowserLayeredMusic';

export interface FirstLevelSoundSink {
    unlock(): void;
    play(cue: FirstLevelSoundCue): boolean | void;
    setMuted(muted: boolean): void;
    setVolumeStep(step: 1 | 2 | 3 | 4): void;
    suspend(): void;
    close(): void;
    readonly ready: boolean;
    readonly activeVoiceCount?: number;
    syncMusic?(mood: MusicMood): void;
    readonly musicDiagnostics?: MusicDiagnostics;
}

const MIN_INTERVAL_MS: Readonly<Record<FirstLevelSoundCue, number>> = {
    ui: 70,
    pickup: 100,
    place: 100,
    upgrade: 220,
    sell: 180,
    reject: 220,
    'rivet-shot': 95,
    'frost-shot': 150,
    'metal-hit': 180,
    'frost-hit': 180,
    kill: 190,
    'infantry-death': 220,
    'runner-death': 220,
    'hauler-death': 220,
    'core-hit': 260,
    'core-critical': 1000,
    'wave-start': 450,
    'wave-clear': 450,
    victory: 1000,
    defeat: 1000,
};

/** 声音只消费交互与战斗事件；限频、静音与发声实现均不反向影响模拟。 */
export class FirstLevelSoundDirector {
    private enabled = true;
    private readonly lastPlayed = new Map<FirstLevelSoundCue, number>();
    private lastDeathMs = -Infinity;
    private acceptedCount = 0;
    private lastCue: FirstLevelSoundCue | null = null;
    private readonly cueCounts = new Map<FirstLevelSoundCue, number>();

    public constructor(private readonly sink: FirstLevelSoundSink) {}

    public get isEnabled(): boolean {
        return this.enabled;
    }

    public get isReady(): boolean {
        return this.enabled && this.sink.ready;
    }

    public updateMusic(mood: MusicMood): void { this.sink.syncMusic?.(mood); }
    public get musicDiagnostics(): MusicDiagnostics { return this.sink.musicDiagnostics ?? SILENT_MUSIC_DIAGNOSTICS; }

    public get diagnostics(): { readonly acceptedCount: number; readonly lastCue: FirstLevelSoundCue | null; readonly activeVoices: number; readonly cueCounts: Readonly<Record<string, number>> } {
        const cueCounts: Record<string, number> = {};
        for (const [cue, count] of Array.from(this.cueCounts.entries())) cueCounts[cue] = count;
        return { acceptedCount: this.acceptedCount, lastCue: this.lastCue, activeVoices: this.sink.activeVoiceCount ?? 0,
            cueCounts };
    }

    public unlockFromGesture(): void {
        if (this.enabled) this.sink.unlock();
    }

    public toggle(): boolean {
        this.enabled = !this.enabled;
        this.sink.setMuted(!this.enabled);
        if (this.enabled) this.sink.unlock();
        return this.enabled;
    }

    /** 启动读取存档及设置页调整走同一入口，避免静音 UI 与实际总线状态分叉。 */
    public configure(enabled: boolean, volumeStep: 1 | 2 | 3 | 4): void {
        this.enabled = enabled;
        this.sink.setVolumeStep(volumeStep);
        this.sink.setMuted(!enabled);
        // 恢复存档发生在首个手势前，此处不得主动创建 AudioContext。
    }

    public play(cue: FirstLevelSoundCue, nowMs: number): boolean {
        if (!this.enabled || !Number.isFinite(nowMs)) return false;
        const last = this.lastPlayed.get(cue) ?? -Infinity;
        if (nowMs - last < MIN_INTERVAL_MS[cue]) return false;
        const death = cue.endsWith('-death') || cue === 'kill';
        // 密集混编不能绕过单 cue 限频，三类死亡共享总节奏，重装仍可占据更高声部优先级。
        if (death && nowMs - this.lastDeathMs < 220) return false;
        if (this.sink.play(cue) === false) return false;
        this.lastPlayed.set(cue, nowMs);
        if (death) this.lastDeathMs = nowMs;
        this.acceptedCount += 1;
        this.lastCue = cue;
        this.cueCounts.set(cue, (this.cueCounts.get(cue) ?? 0) + 1);
        return true;
    }

    public suspend(): void {
        this.sink.suspend();
    }

    public close(): void {
        this.sink.close();
    }
}
