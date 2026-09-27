import type { BattlePhase } from './BattleStateMachine';

/** 只累计局内逻辑秒数：暂停和教学波间等待不计时，2× 也不会刷快纪录。 */
export class BattleRunClock {
    private running = false;
    private seconds = 0;

    public get elapsedSeconds(): number {
        return this.seconds;
    }

    public start(): void {
        this.seconds = 0;
        this.running = true;
    }

    public advance(stepSeconds: number, phase: BattlePhase): void {
        if (!Number.isFinite(stepSeconds) || stepSeconds < 0) throw new RangeError('计时步长必须为非负数');
        if (this.running && (phase === 'spawning' || phase === 'clearing' || phase === 'countdown')) {
            this.seconds += stepSeconds;
        }
    }

    public reset(): void {
        this.running = false;
        this.seconds = 0;
    }
}
