import type { GridCell } from '../core/GridTypes';

export interface RouteChangeSnapshot {
    readonly cell: GridCell;
    readonly delta: number;
    readonly remainingSeconds: number;
    readonly durationSeconds: number;
}

const ROUTE_CHANGE_SECONDS = 0.9;

export function routeLengthDelta(before: number, after: number): number {
    if (!Number.isInteger(before) || !Number.isInteger(after) || before < 0 || after < 0) {
        throw new RangeError('路径长度必须为非负整数');
    }
    return after - before;
}

export function routeChangeText(delta: number): string {
    if (!Number.isInteger(delta)) throw new RangeError('路径变化必须为整数');
    return delta > 0 ? `路线 +${delta} 格` : delta < 0 ? `路线缩短 ${-delta} 格` : '路线不变';
}

/** 路线反馈只处理展示时间，位置和差值都来自已经提交的寻路结果。 */
export class RouteChangeFeedback {
    private active: RouteChangeSnapshot | null = null;

    public get snapshot(): RouteChangeSnapshot | null {
        return this.active;
    }

    public record(cell: GridCell, before: number, after: number): RouteChangeSnapshot {
        const delta = routeLengthDelta(before, after);
        this.active = { cell: { ...cell }, delta, durationSeconds: ROUTE_CHANGE_SECONDS, remainingSeconds: ROUTE_CHANGE_SECONDS };
        return this.active;
    }

    public advance(realSeconds: number): void {
        if (!Number.isFinite(realSeconds) || realSeconds < 0) throw new RangeError('展示时间不能为负数');
        if (!this.active) return;
        const remainingSeconds = Math.max(0, this.active.remainingSeconds - realSeconds);
        this.active = remainingSeconds > 0 ? { ...this.active, remainingSeconds } : null;
    }

    public clear(): void {
        this.active = null;
    }
}
