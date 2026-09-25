export type FirstLevelSoundCue = 'ui' | 'place' | 'reject' | 'rivet-shot' | 'frost-shot'
    | 'kill' | 'core-hit' | 'wave-start' | 'wave-clear' | 'victory' | 'defeat';

export interface FirstLevelSoundSink {
    unlock(): void;
    play(cue: FirstLevelSoundCue): void;
    setMuted(muted: boolean): void;
    suspend(): void;
    close(): void;
    readonly ready: boolean;
}

const MIN_INTERVAL_MS: Readonly<Record<FirstLevelSoundCue, number>> = {
    ui: 70,
    place: 100,
    reject: 220,
    'rivet-shot': 95,
    'frost-shot': 150,
    kill: 190,
    'core-hit': 260,
    'wave-start': 450,
    'wave-clear': 450,
    victory: 1000,
    defeat: 1000,
};

/** 声音只消费交互与战斗事件；限频、静音与发声实现均不反向影响模拟。 */
export class FirstLevelSoundDirector {
    private enabled = true;
    private readonly lastPlayed = new Map<FirstLevelSoundCue, number>();

    public constructor(private readonly sink: FirstLevelSoundSink) {}

    public get isEnabled(): boolean {
        return this.enabled;
    }

    public get isReady(): boolean {
        return this.enabled && this.sink.ready;
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

    public play(cue: FirstLevelSoundCue, nowMs: number): boolean {
        if (!this.enabled) return false;
        const last = this.lastPlayed.get(cue) ?? -Infinity;
        if (nowMs - last < MIN_INTERVAL_MS[cue]) return false;
        this.lastPlayed.set(cue, nowMs);
        this.sink.play(cue);
        return true;
    }

    public suspend(): void {
        this.sink.suspend();
    }

    public close(): void {
        this.sink.close();
    }
}
