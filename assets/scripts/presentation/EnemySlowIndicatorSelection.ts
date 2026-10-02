import type { CrowdEnemyPosition } from './EnemyCrowdGroups';

export interface SlowIndicatorCandidate extends CrowdEnemyPosition {
    readonly id: string;
    readonly slowRemainingSeconds: number;
}

const MERGE_DISTANCE_SQUARED = 0.8 * 0.8;

/** 减速仍逐只生效；只给贴得太近的敌人保留一个冰环，避免密集群控盖住单位和道路。 */
export function visibleSlowIndicatorIds(enemies: readonly SlowIndicatorCandidate[]): ReadonlySet<string> {
    const visible: { id: string; column: number; row: number; remaining: number }[] = [];
    for (const enemy of enemies) {
        if (!(enemy.slowRemainingSeconds > 0)) continue;
        const progress = Number.isFinite(enemy.progress) ? Math.max(0, Math.min(1, enemy.progress)) : 0;
        const column = enemy.fromCell.column + (enemy.toCell.column - enemy.fromCell.column) * progress;
        const row = enemy.fromCell.row + (enemy.toCell.row - enemy.fromCell.row) * progress;
        if (!Number.isFinite(column) || !Number.isFinite(row)) continue;
        const nearby = visible.find((candidate) => (candidate.column - column) ** 2 + (candidate.row - row) ** 2 < MERGE_DISTANCE_SQUARED);
        if (!nearby) {
            visible.push({ id: enemy.id, column, row, remaining: enemy.slowRemainingSeconds });
        } else if (enemy.slowRemainingSeconds > nearby.remaining) {
            // 后到的高强度减速保留可见环，避免同群旧状态将过期时整体提示提前消失。
            nearby.id = enemy.id;
            nearby.remaining = enemy.slowRemainingSeconds;
        }
    }
    return new Set(visible.map(({ id }) => id));
}
