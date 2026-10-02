import type { GridCell } from '../core/GridTypes';
import { enemyVisualOffset } from './UnitVisualMotion';

export interface CrowdLayoutEnemy {
    readonly id: string;
    readonly spawnOrder: number;
    readonly fromCell: GridCell;
    readonly toCell: GridCell;
    readonly progress: number;
    readonly trafficLane?: 0 | 1;
}

export interface CrowdOffset { readonly column: number; readonly row: number }
export const CROWD_MIN_DISTANCE = 0.4;
export const CROWD_MAX_OFFSET = 0.28;

function point(enemy: CrowdLayoutEnemy): CrowdOffset {
    return {
        column: enemy.fromCell.column + (enemy.toCell.column - enemy.fromCell.column) * enemy.progress,
        row: enemy.fromCell.row + (enemy.toCell.row - enemy.fromCell.row) * enemy.progress,
    };
}

function baseOffset(enemy: CrowdLayoutEnemy): CrowdOffset {
    if (enemy.trafficLane !== undefined) {
        // 排队列号来自规则层；按当前正交路段的侧向显示，转弯仍由原平滑与走廊约束收敛。
        const side = enemy.trafficLane === 0 ? -0.23 : 0.23;
        return { column: (enemy.toCell.row - enemy.fromCell.row) * side,
            row: -(enemy.toCell.column - enemy.fromCell.column) * side };
    }
    const offset = enemyVisualOffset(enemy.spawnOrder, 1);
    return { column: offset.x, row: -offset.y };
}

/** 只允许脚点留在当前已承诺的两格走廊内；拐弯不能斜切到未承诺的邻格。 */
function constrain(enemy: CrowdLayoutEnemy, offset: CrowdOffset): CrowdOffset {
    const center = point(enemy);
    let column = Math.max(Math.min(enemy.fromCell.column, enemy.toCell.column) - CROWD_MAX_OFFSET - center.column,
        Math.min(Math.max(enemy.fromCell.column, enemy.toCell.column) + CROWD_MAX_OFFSET - center.column, offset.column));
    let row = Math.max(Math.min(enemy.fromCell.row, enemy.toCell.row) - CROWD_MAX_OFFSET - center.row,
        Math.min(Math.max(enemy.fromCell.row, enemy.toCell.row) + CROWD_MAX_OFFSET - center.row, offset.row));
    const length = Math.hypot(column, row);
    if (length > CROWD_MAX_OFFSET) {
        column *= CROWD_MAX_OFFSET / length;
        row *= CROWD_MAX_OFFSET / length;
    }
    return { column, row };
}

/** 有界视觉避让，不改路径、速度、射程或伤害。空间不足时允许余下重叠，不推人穿墙。 */
export function layoutEnemyCrowd(source: readonly CrowdLayoutEnemy[]): ReadonlyMap<string, CrowdOffset> {
    const enemies = Array.from(source).sort((a, b) => a.spawnOrder - b.spawnOrder || a.id.localeCompare(b.id));
    let offsets = enemies.map(baseOffset);
    const centers = enemies.map(point);
    for (let pass = 0; pass < 6; pass += 1) {
        const forces = enemies.map(() => ({ column: 0, row: 0, neighbours: 0 }));
        for (let a = 0; a < enemies.length; a += 1) {
            for (let b = a + 1; b < enemies.length; b += 1) {
                let column = centers[a].column + offsets[a].column - centers[b].column - offsets[b].column;
                let row = centers[a].row + offsets[a].row - centers[b].row - offsets[b].row;
                const distance = Math.hypot(column, row);
                if (distance >= CROWD_MIN_DISTANCE) continue;
                // 同一点也要有确定的分离方向，不能依赖逐帧随机数造成抖动。
                if (distance < 0.000001) {
                    const angle = (enemies[a].spawnOrder * 7 + enemies[b].spawnOrder * 11) * 2.399963;
                    column = Math.cos(angle);
                    row = Math.sin(angle);
                } else {
                    column /= distance;
                    row /= distance;
                }
                const push = (CROWD_MIN_DISTANCE - distance) * 0.5;
                forces[a].column += column * push;
                forces[a].row += row * push;
                forces[b].column -= column * push;
                forces[b].row -= row * push;
                forces[a].neighbours += 1;
                forces[b].neighbours += 1;
            }
        }
        offsets = offsets.map((offset, index) => constrain(enemies[index], {
            column: offset.column + forces[index].column / Math.max(1, forces[index].neighbours),
            row: offset.row + forces[index].row / Math.max(1, forces[index].neighbours),
        }));
    }
    return new Map(enemies.map((enemy, index) => [enemy.id, offsets[index]]));
}

export function crowdNearCoincidentPairs(enemies: readonly CrowdLayoutEnemy[], offsets: ReadonlyMap<string, CrowdOffset>): number {
    let pairs = 0;
    for (let a = 0; a < enemies.length; a += 1) {
        const pa = point(enemies[a]);
        const oa = offsets.get(enemies[a].id) ?? baseOffset(enemies[a]);
        for (let b = a + 1; b < enemies.length; b += 1) {
            const pb = point(enemies[b]);
            const ob = offsets.get(enemies[b].id) ?? baseOffset(enemies[b]);
            if (Math.hypot(pa.column + oa.column - pb.column - ob.column,
                pa.row + oa.row - pb.row - ob.row) < 0.1) pairs += 1;
        }
    }
    return pairs;
}

/** 视觉位移用模拟时间平滑；暂停冻结，重开清零，离场缓存只保留给短尸影。 */
export class EnemyCrowdPresentation {
    private readonly offsets = new Map<string, CrowdOffset>();
    private lastSeconds = 0;

    public sample(enemies: readonly CrowdLayoutEnemy[], seconds: number): ReadonlyMap<string, CrowdOffset> {
        if (seconds < this.lastSeconds || seconds === 0) this.offsets.clear();
        const delta = Math.max(0, seconds - this.lastSeconds);
        this.lastSeconds = seconds;
        const blend = 1 - Math.exp(-delta / 0.09);
        const targets = layoutEnemyCrowd(enemies);
        for (const enemy of enemies) {
            const target = targets.get(enemy.id)!;
            const previous = this.offsets.get(enemy.id);
            this.offsets.set(enemy.id, constrain(enemy, previous ? {
                column: previous.column + (target.column - previous.column) * blend,
                row: previous.row + (target.row - previous.row) * blend,
            } : baseOffset(enemy)));
        }
        return this.offsets;
    }

    public get(id: string): CrowdOffset | undefined { return this.offsets.get(id); }

    public retain(ids: ReadonlySet<string>): void {
        for (const id of Array.from(this.offsets.keys())) if (!ids.has(id)) this.offsets.delete(id);
    }

    public reset(): void { this.offsets.clear(); this.lastSeconds = 0; }
}
