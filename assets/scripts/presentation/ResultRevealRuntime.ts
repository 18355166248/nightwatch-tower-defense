const REVEAL_SECONDS = 0.55;

/** 结算入场只走真实时间与视觉插值，不暂停战斗时钟，也不锁住重新部署输入。 */
export class ResultRevealRuntime {
    private remainingSeconds = 0;

    public get progress(): number {
        return 1 - this.remainingSeconds / REVEAL_SECONDS;
    }

    public begin(): void {
        this.remainingSeconds = REVEAL_SECONDS;
    }

    public advance(deltaSeconds: number): void {
        if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) throw new RangeError('deltaSeconds 不能为负数');
        this.remainingSeconds = Math.max(0, this.remainingSeconds - deltaSeconds);
    }

    public clear(): void {
        this.remainingSeconds = 0;
    }
}

export function resultRevealEase(progress: number): number {
    const clamped = Math.max(0, Math.min(1, progress));
    return 1 - (1 - clamped) ** 3;
}
