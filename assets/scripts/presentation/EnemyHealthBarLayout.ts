import type { PhaseBRect } from './PhaseBLayout';

export interface EnemyHealthBarCandidate {
    readonly id: string;
    readonly spawnOrder: number;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly ratio: number;
}

export interface EnemyHealthBarPlacement extends EnemyHealthBarCandidate {
    readonly anchorX: number;
    readonly anchorY: number;
}

const HEIGHT = 7;
const GAP = 4;

export function healthBarsOverlap(a: EnemyHealthBarCandidate, b: EnemyHealthBarCandidate): boolean {
    return Math.abs(a.x - b.x) < (a.width + b.width) / 2 + GAP - 1e-6
        && Math.abs(a.y - b.y) < HEIGHT + GAP - 1e-6;
}

/** 只排布受伤信息，不动敌人。局部有限槽位优先最小位移，挤满时保留真实血条而非隐去单位生命。 */
export function layoutEnemyHealthBars(candidates: readonly EnemyHealthBarCandidate[], bounds: PhaseBRect): readonly EnemyHealthBarPlacement[] {
    const placed: EnemyHealthBarPlacement[] = [];
    if (![bounds.left, bounds.right, bounds.bottom, bounds.top].every(Number.isFinite)
        || bounds.right <= bounds.left || bounds.top - bounds.bottom < HEIGHT) return placed;
    // 稳定出生序打破同点并列；输入数组重排或减弱动态不会改变同一快照的布局。
    const valid = candidates.filter((bar) => [bar.x, bar.y, bar.width, bar.ratio, bar.spawnOrder].every(Number.isFinite)
        && bar.width > 0 && bar.width <= bounds.right - bounds.left && bar.ratio > 0 && bar.ratio < 1)
        .slice().sort((a, b) => a.spawnOrder - b.spawnOrder || a.id.localeCompare(b.id));
    for (const bar of valid) {
        const anchorX = Math.max(bounds.left + bar.width / 2, Math.min(bounds.right - bar.width / 2, bar.x));
        const anchorY = Math.max(bounds.bottom, Math.min(bounds.top - HEIGHT, bar.y));
        let best: EnemyHealthBarPlacement | null = null;
        let bestCollisions = Infinity;
        let bestDistance = Infinity;
        for (let row = 0; row <= 4; row += 1) {
            for (const column of [0, -1, 1]) {
                const x = Math.max(bounds.left + bar.width / 2, Math.min(bounds.right - bar.width / 2,
                    anchorX + column * (bar.width + GAP * 2)));
                const y = Math.max(bounds.bottom, Math.min(bounds.top - HEIGHT, anchorY + row * (HEIGHT + GAP)));
                const point = { ...bar, x, y, anchorX, anchorY };
                const collisions = placed.filter((other) => healthBarsOverlap(point, other)).length;
                const distance = (x - anchorX) ** 2 + (y - anchorY) ** 2;
                if (collisions < bestCollisions || collisions === bestCollisions && distance < bestDistance) {
                    best = point;
                    bestCollisions = collisions;
                    bestDistance = distance;
                }
            }
        }
        if (best) placed.push(best);
    }
    return placed;
}

/** 诊断统计真实输出的冲突对，不把“布局已调用”当成密集群全部避让成功。 */
export function healthBarOverlapCount(bars: readonly EnemyHealthBarPlacement[]): number {
    let count = 0;
    for (let a = 0; a < bars.length; a += 1) {
        for (let b = a + 1; b < bars.length; b += 1) if (healthBarsOverlap(bars[a], bars[b])) count += 1;
    }
    return count;
}
