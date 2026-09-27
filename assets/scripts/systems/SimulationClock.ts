export interface SimulationClockOptions {
    readonly supportedScales?: readonly number[];
    readonly maxFrameDeltaSeconds?: number;
    readonly fixedStepSeconds?: number;
}

/** 统一生成玩法时间，避免各系统自行乘速后出现倒计时、战斗和反馈不同步。 */
export class SimulationClock {
    private readonly scales: readonly number[];
    private readonly maxFrameDeltaSeconds: number;
    private readonly fixedStepSeconds: number;
    private readonly maxStepsPerFrame: number;
    private accumulatedSeconds = 0;
    private scaleIndex = 0;

    public constructor(options: SimulationClockOptions = {}) {
        const scales = options.supportedScales ?? [1, 2];
        const maxFrameDeltaSeconds = options.maxFrameDeltaSeconds ?? 0.05;
        const fixedStepSeconds = options.fixedStepSeconds ?? 1 / 60;
        if (scales.length === 0 || scales.some((scale) => !Number.isFinite(scale) || scale <= 0)) {
            throw new RangeError('supportedScales 必须包含至少一个正数倍率');
        }
        if (!Number.isFinite(maxFrameDeltaSeconds) || maxFrameDeltaSeconds <= 0) {
            throw new RangeError('maxFrameDeltaSeconds 必须为正数');
        }
        if (!Number.isFinite(fixedStepSeconds) || fixedStepSeconds <= 0) {
            throw new RangeError('fixedStepSeconds 必须为正数');
        }
        this.scales = [...scales];
        this.maxFrameDeltaSeconds = maxFrameDeltaSeconds;
        this.fixedStepSeconds = fixedStepSeconds;
        this.maxStepsPerFrame = Math.ceil(maxFrameDeltaSeconds * Math.max(...scales) / fixedStepSeconds) + 1;
    }

    public get scale(): number {
        return this.scales[this.scaleIndex];
    }

    public cycleScale(): number {
        this.scaleIndex = (this.scaleIndex + 1) % this.scales.length;
        return this.scale;
    }

    public gameDeltaSeconds(realDeltaSeconds: number): number {
        if (!Number.isFinite(realDeltaSeconds) || realDeltaSeconds < 0) {
            throw new RangeError('realDeltaSeconds 不能为负数');
        }
        // 先限制单帧真实时间再乘倍率，后台恢复时不会用一帧补跑整段战斗。
        return Math.min(realDeltaSeconds, this.maxFrameDeltaSeconds) * this.scale;
    }

    public advance(realDeltaSeconds: number, step: (deltaSeconds: number) => void): number {
        this.accumulatedSeconds += this.gameDeltaSeconds(realDeltaSeconds);
        let steps = 0;
        // 每帧只做有限次固定步进；战斗、波间倒计时和反馈使用同一个玩法时间轴。
        while (this.accumulatedSeconds + 1e-9 >= this.fixedStepSeconds && steps < this.maxStepsPerFrame) {
            this.accumulatedSeconds = Math.max(0, this.accumulatedSeconds - this.fixedStepSeconds);
            step(this.fixedStepSeconds);
            steps += 1;
        }
        return steps;
    }

    public reset(): void {
        this.accumulatedSeconds = 0;
    }

    public resetToDefaultSpeed(): void {
        this.reset();
        this.scaleIndex = 0;
    }
}
