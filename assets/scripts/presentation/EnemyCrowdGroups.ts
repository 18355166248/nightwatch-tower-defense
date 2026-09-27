import type { GridCell } from '../core/GridTypes';

export interface CrowdEnemyPosition {
    readonly fromCell: GridCell;
    readonly toCell: GridCell;
    readonly progress: number;
}

export interface EnemyCrowdGroup {
    readonly key: string;
    readonly count: number;
    readonly column: number;
    readonly row: number;
}

/** 同格近邻只增加视觉人数提示；不移动敌人，也不合并生命、索敌或伤害。 */
export function enemyCrowdGroups(enemies: readonly CrowdEnemyPosition[]): readonly EnemyCrowdGroup[] {
    const buckets = new Map<string, { count: number; column: number; row: number }>();
    for (const enemy of enemies) {
        const progress = Number.isFinite(enemy.progress) ? Math.max(0, Math.min(1, enemy.progress)) : 0;
        const column = enemy.fromCell.column + (enemy.toCell.column - enemy.fromCell.column) * progress;
        const row = enemy.fromCell.row + (enemy.toCell.row - enemy.fromCell.row) * progress;
        const key = `${Math.round(column)},${Math.round(row)}`;
        const bucket = buckets.get(key) ?? { count: 0, column: 0, row: 0 };
        bucket.count += 1;
        bucket.column += column;
        bucket.row += row;
        buckets.set(key, bucket);
    }
    return Array.from(buckets, ([key, bucket]) => ({
        key,
        count: bucket.count,
        column: bucket.column / bucket.count,
        row: bucket.row / bucket.count,
    })).filter(({ count }) => count >= 2);
}
