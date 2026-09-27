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
    const groups = Array.from(buckets, ([key, bucket]) => ({
        key,
        count: bucket.count,
        column: bucket.column / bucket.count,
        row: bucket.row / bucket.count,
    })).filter(({ count }) => count >= 2);
    const visible: { key: string; count: number; column: number; row: number }[] = [];
    for (const group of groups) {
        // 两个相邻格的徽标会比敌人切图更早相撞；只在人数提示层合并，生命和攻击目标仍逐只保留。
        const nearby = visible.find((candidate) => Math.abs(candidate.column - group.column) < 0.9
            && Math.abs(candidate.row - group.row) < 0.7);
        if (!nearby) {
            visible.push({ ...group });
            continue;
        }
        const count = nearby.count + group.count;
        nearby.column = (nearby.column * nearby.count + group.column * group.count) / count;
        nearby.row = (nearby.row * nearby.count + group.row * group.count) / count;
        nearby.count = count;
    }
    return visible;
}
