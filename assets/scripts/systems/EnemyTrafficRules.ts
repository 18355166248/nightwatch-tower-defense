import { sameCell, type GridCell } from '../core/GridTypes';
import type { FlowField } from './FlowField';

export type TrafficLane = 0 | 1;
export interface EnemyTrafficSettings { readonly headwayCells: number; readonly allowPassing: boolean }
export const TWO_LANE_TRAFFIC: EnemyTrafficSettings = { headwayCells: 0.7, allowPassing: true };
export interface TrafficEnemy {
    readonly id: string;
    readonly spawnOrder: number;
    readonly fromCell: GridCell;
    readonly toCell: GridCell;
    readonly progress: number;
    readonly trafficLane?: TrafficLane;
}

/** 距离沿已承诺路段计算；只查局部流场方向，不重建BFS，不提前改写下一格。 */
export function trafficPathGap(follower: TrafficEnemy, leader: TrafficEnemy, flow: FlowField, lookahead: number): number | null {
    if (sameCell(follower.fromCell, leader.fromCell) && sameCell(follower.toCell, leader.toCell)) {
        return leader.progress - follower.progress;
    }
    // 两个支路并入同一格时，按到格心的剩余距离预留交接空隙，不能在格心再硬分离。
    if (sameCell(follower.toCell, leader.toCell)) return leader.progress - follower.progress;
    let current = follower.toCell;
    let previous = follower.fromCell;
    let distance = 1 - follower.progress;
    const limit = Math.min(flow.grid.columns * flow.grid.rows, Math.ceil(lookahead) + 2);
    for (let i = 0; i < limit && distance <= lookahead; i += 1) {
        if (sameCell(current, leader.fromCell)) {
            const next = flow.nextCell(current, previous);
            if (next && sameCell(next, leader.toCell)) return distance + leader.progress;
            return null;
        }
        const next = flow.nextCell(current, previous);
        if (!next) return null;
        previous = current;
        current = next;
        distance += 1;
    }
    return null;
}

export function trafficFrontGap(enemy: TrafficEnemy, lane: TrafficLane, peers: readonly TrafficEnemy[], flow: FlowField, lookahead: number): number {
    let nearest = Infinity;
    for (const peer of peers) {
        // 本步已经到出口的单位不继续占队列；离场仍由战斗运行时正常计漏，不能静默删除。
        if (peer.id === enemy.id || peer.trafficLane !== lane || peer.progress >= 1) continue;
        const gap = trafficPathGap(enemy, peer, flow, lookahead);
        if (gap === null || gap < -1e-9 || Math.abs(gap) < 1e-9 && peer.spawnOrder > enemy.spawnOrder) continue;
        nearest = Math.min(nearest, Math.max(0, gap));
    }
    return nearest;
}

export function trafficEntryLane(enemy: TrafficEnemy, peers: readonly TrafficEnemy[], flow: FlowField, settings: EnemyTrafficSettings): TrafficLane | null {
    const preferred: TrafficLane = enemy.spawnOrder % 2 === 1 ? 0 : 1;
    for (const lane of [preferred, (1 - preferred) as TrafficLane]) {
        if (trafficFrontGap(enemy, lane, peers, flow, settings.headwayCells) >= settings.headwayCells - 1e-9) return lane;
    }
    return null;
}

export interface TrafficMove { readonly lane: TrafficLane; readonly distance: number; readonly waiting: boolean }

/** 前排先走、后排只使用剩余空间；不倒推位置，也不把等待时间补跑成瞬移。 */
export function trafficMove(enemy: TrafficEnemy, desiredDistance: number, peers: readonly TrafficEnemy[], flow: FlowField, settings: EnemyTrafficSettings): TrafficMove {
    const lane = enemy.trafficLane ?? 0;
    const lookahead = desiredDistance + settings.headwayCells;
    const budget = (candidate: TrafficLane) => Math.min(desiredDistance,
        Math.max(0, trafficFrontGap(enemy, candidate, peers, flow, lookahead) - settings.headwayCells));
    const distance = budget(lane);
    if (settings.allowPassing && distance + 1e-9 < desiredDistance) {
        const other: TrafficLane = lane === 0 ? 1 : 0;
        // 只有前后窗口都足够时换列超越；不能把自己插进另一列后排的最小队距内。
        const rearClear = peers.every((peer) => {
            if (peer.id === enemy.id || peer.trafficLane !== other || peer.progress >= 1) return true;
            const gap = trafficPathGap(peer, enemy, flow, settings.headwayCells);
            return gap === null || gap < -1e-9 || gap >= settings.headwayCells - 1e-9;
        });
        if (rearClear && budget(other) >= desiredDistance - 1e-9) return { lane: other, distance: desiredDistance, waiting: false };
    }
    return { lane, distance, waiting: distance + 1e-9 < desiredDistance };
}

/** 首关默认双列；旧移动仅作显式对照，QA/美术参数不再改变交通规则。 */
export function firstLevelEnemyTraffic(search: string): EnemyTrafficSettings | undefined {
    return new URLSearchParams(search).get('enemyTraffic') === 'legacy' ? undefined : TWO_LANE_TRAFFIC;
}
