import { cellKey, isInsideGrid, sameCell, type GridCell } from '../core/GridTypes';
import type { FlowField } from './FlowField';
import { trafficPathGap } from './EnemyTrafficRules';
import type { PlacementMutation, TowerDeployment } from './PlacementModel';

export interface RouteActor {
    readonly id: string;
    readonly spawnOrder: number;
    readonly fromCell: GridCell;
    readonly toCell: GridCell;
    readonly progress: number;
    readonly archetype: { readonly speedCellsPerSecond: number };
    readonly slowMultiplier: number;
    readonly trafficLane?: 0 | 1;
    readonly trafficWaiting?: boolean;
}
export interface RouteContext { readonly mapVersion: number; readonly wave: number; readonly seconds: number; readonly flow: FlowField }
export interface RouteEvent {
    readonly seq: number;
    readonly seconds: number;
    readonly mapVersion: number;
    readonly wave: number;
    readonly kind: 'reset' | 'wave' | 'build' | 'sell' | 'upgrade' | 'spawn' | 'center' | 'lane' | 'killed' | 'leaked' | 'fault';
    readonly actor?: string;
    readonly from?: string;
    readonly to?: string;
    readonly lane?: number;
    readonly tower?: string;
    readonly level?: number;
    readonly gold?: number;
    readonly code?: string;
}
export interface RouteFault {
    readonly code: 'invalid-segment' | 'unreachable' | 'missing-next' | 'backtrack' | 'no-progress' | 'runtime-route-error';
    readonly mapVersion: number;
    readonly wave: number;
    readonly seconds: number;
    readonly actor: string;
    readonly from: string;
    readonly to: string;
    readonly previous: string | null;
    readonly idleSeconds: number;
    readonly localFlow: readonly { cell: string; distance: number; blocked: boolean; next: string | null }[];
    readonly recent: readonly RouteEvent[];
}
interface TrackedActor { from: GridCell; to: GridCell; progress: number; lane?: number; lastMotion: number; previous: GridCell | null }
interface RouteMapRecord { grid: string; version: number; towers: readonly TowerDeployment[] }

export class RouteDiagnosticError extends Error {
    public constructor(public readonly fault: RouteFault) {
        super(`路线诊断失败 ${JSON.stringify(fault)}`);
        this.name = 'RouteDiagnosticError';
    }
}
/** 仅用于路线运行时的已知错误；不会吞掉程序/资源/经济的未知异常。 */
export class RouteMovementError extends Error {
    public constructor(message: string, public readonly actor: RouteActor | null = null) { super(message); }
}

/** 模拟时钟驱动的看门狗与有界事件尾迹；不改地图、敌人、伤害或经济。 */
export class RouteDiagnostics {
    private readonly tracked = new Map<string, TrackedActor>();
    private readonly ring: RouteEvent[] = [];
    private cursor = 0;
    private sequence = 0;
    private lastMap: RouteMapRecord | null = null;
    private readonly maps = new Map<number, readonly string[]>();
    private currentFault: RouteFault | null = null;

    public constructor(private readonly policy: 'report' | 'throw' = 'throw', private readonly capacity = 2048) {
        if (!Number.isInteger(capacity) || capacity < 16 || capacity > 8192) throw new RangeError('路线日志容量须为16–8192');
    }
    public get fault(): RouteFault | null { return this.currentFault; }
    public get eventCount(): number { return this.sequence; }
    public get retainedCount(): number { return this.ring.length; }

    public reset(context: RouteContext, towers: readonly TowerDeployment[]): void {
        this.tracked.clear(); this.maps.clear(); this.ring.length = 0; this.cursor = 0; this.sequence = 0; this.currentFault = null;
        this.saveMap(context, towers);
        this.record(context, { kind: 'reset' });
    }

    public placement(mutation: PlacementMutation, context: RouteContext, towers: readonly TowerDeployment[]): void {
        this.saveMap(context, towers);
        this.record(context, { kind: mutation.kind, to: cellKey(mutation.cell), tower: mutation.towerId,
            level: mutation.level, gold: mutation.gold });
        // 保留尾迹涉及的占格版本，事件淘汰后释放旧版本；不能只给最终地图却声称能还原此前改路。
        const versions = new Set(this.events().map(event => event.mapVersion));
        versions.add(context.mapVersion);
        for (const version of this.maps.keys()) if (!versions.has(version)) this.maps.delete(version);
    }

    public wave(context: RouteContext): void { this.record(context, { kind: 'wave' }); }

    public departed(kind: 'killed' | 'leaked', actors: readonly RouteActor[], context: RouteContext): void {
        for (const actor of actors) {
            this.record(context, { kind, actor: actor.id, from: cellKey(actor.fromCell), to: cellKey(actor.toCell) });
            this.tracked.delete(actor.id);
        }
    }

    /** 每个固定步之前检查：异常时不再执行下一次战斗事务；暂停不调用，墙钟不参与。 */
    public inspect(actors: readonly RouteActor[], context: RouteContext): RouteFault | null {
        if (this.currentFault) return this.currentFault;
        const { flow, seconds } = context;
        if (!Number.isFinite(seconds) || seconds < 0) throw new RangeError('路线诊断需要有效模拟时间');
        const active = new Set(actors.map(actor => actor.id));
        for (const id of this.tracked.keys()) if (!active.has(id)) this.tracked.delete(id);
        for (const actor of actors) {
            const old = this.tracked.get(actor.id);
            const oldLane = old?.lane;
            const changed = old && (!sameCell(old.from, actor.fromCell) || !sameCell(old.to, actor.toCell));
            if (changed && !sameCell(old.to, actor.fromCell)) return this.fail('invalid-segment', actor, context);
            if (changed && sameCell(old.from, actor.toCell)) return this.fail('backtrack', actor, context);
            if (!old || changed || actor.progress > old.progress + 1e-7) {
                this.tracked.set(actor.id, { from: { ...actor.fromCell }, to: { ...actor.toCell }, progress: actor.progress,
                    lane: actor.trafficLane, lastMotion: seconds, previous: changed ? old.from : old?.previous ?? null });
            } else {
                // 极小单步也要累计；仅在真实前进时更新锚点，不能让后退抖动或改地图刷新宽限。
                if (actor.trafficLane !== old.lane) old.lane = actor.trafficLane;
            }
            if (!old) this.record(context, { kind: 'spawn', actor: actor.id, from: cellKey(actor.fromCell), to: cellKey(actor.toCell), lane: actor.trafficLane });
            else if (changed) this.record(context, { kind: 'center', actor: actor.id, from: cellKey(actor.fromCell), to: cellKey(actor.toCell), lane: actor.trafficLane });
            else if (actor.trafficLane !== oldLane) this.record(context, { kind: 'lane', actor: actor.id, lane: actor.trafficLane });
            const distance = Math.abs(actor.fromCell.column - actor.toCell.column) + Math.abs(actor.fromCell.row - actor.toCell.row);
            if (distance !== 1 || !isInsideGrid(flow.grid, actor.fromCell) || !isInsideGrid(flow.grid, actor.toCell)
                || !Number.isFinite(actor.progress) || actor.progress < 0 || actor.progress >= 1
                || flow.blocked.has(cellKey(actor.fromCell)) || flow.blocked.has(cellKey(actor.toCell))) {
                return this.fail('invalid-segment', actor, context);
            }
            if (!flow.isReachable(actor.toCell)) return this.fail('unreachable', actor, context);
            if (!sameCell(actor.toCell, flow.grid.exit)) {
                const next = flow.nextCell(actor.toCell, actor.fromCell);
                if (!next) return this.fail('missing-next', actor, context);
                if (sameCell(next, actor.fromCell)) return this.fail('backtrack', actor, context);
            }
        }
        for (const actor of actors) {
            const tracked = this.tracked.get(actor.id)!;
            // 允许低速/持续减速走完至少三格的时间；正常运动哪怕很慢也不断刷新进度。
            const grace = Math.max(8, 3 / Math.max(0.03, actor.archetype.speedCellsPerSecond * actor.slowMultiplier));
            if (seconds - tracked.lastMotion < grace) continue;
            if (this.queueHasMovingFront(actor, actors, context, new Set(), grace)) continue;
            return this.fail('no-progress', actor, context);
        }
        return null;
    }

    public runtimeFailure(actor: RouteActor | null, context: RouteContext): RouteFault {
        return this.fail('runtime-route-error', actor, context);
    }

    public export(): { schema: 1; scope: 'bounded-route-tail'; dropped: number; map: RouteMapRecord | null; maps: readonly { version: number; blocked: readonly string[] }[]; events: readonly RouteEvent[]; fault: RouteFault | null } {
        // 这是可定位格心/改路的尾迹，不伪装成包含全部输入和数值配置的完整录像。
        return JSON.parse(JSON.stringify({ schema: 1, scope: 'bounded-route-tail', dropped: this.sequence - this.ring.length,
            map: this.lastMap, maps: Array.from(this.maps, ([version, blocked]) => ({ version, blocked })), events: this.events(), fault: this.currentFault }));
    }

    private queueHasMovingFront(actor: RouteActor, actors: readonly RouteActor[], context: RouteContext, seen: Set<string>, grace: number): boolean {
        if (!actor.trafficWaiting || actor.trafficLane === undefined || seen.has(actor.id)) return false;
        seen.add(actor.id);
        // 等待只有能追溯到真实前排才豁免；循环互等/假waiting不能永久屏蔽看门狗。
        const front = actors.filter(peer => peer.id !== actor.id && peer.trafficLane === actor.trafficLane)
            .map(peer => ({ peer, gap: trafficPathGap(actor, peer, context.flow, 0.71) }))
            .filter(({ gap }) => gap !== null && gap >= -1e-9 && gap < 0.701)
            .sort((a, b) => a.gap! - b.gap!)[0]?.peer;
        if (!front) return false;
        const track = this.tracked.get(front.id);
        if (track && context.seconds - track.lastMotion < grace) return true;
        return this.queueHasMovingFront(front, actors, context, seen, grace);
    }

    private fail(code: RouteFault['code'], actor: RouteActor | null, context: RouteContext): RouteFault {
        if (this.currentFault) return this.currentFault;
        const cell = actor?.toCell ?? context.flow.grid.entry;
        const localFlow: RouteFault['localFlow'][number][] = [];
        for (let row = cell.row - 1; row <= cell.row + 1; row += 1) for (let column = cell.column - 1; column <= cell.column + 1; column += 1) {
            const at = { column, row };
            if (!isInsideGrid(context.flow.grid, at)) continue;
            const next = context.flow.nextCell(at, sameCell(at, cell) ? actor?.fromCell : undefined);
            localFlow.push({ cell: cellKey(at), distance: context.flow.distanceAt(at), blocked: context.flow.blocked.has(cellKey(at)), next: next ? cellKey(next) : null });
        }
        const track = actor ? this.tracked.get(actor.id) : undefined;
        this.record(context, { kind: 'fault', actor: actor?.id ?? 'entry', code });
        this.currentFault = { code, mapVersion: context.mapVersion, wave: context.wave, seconds: context.seconds,
            actor: actor?.id ?? 'entry', from: cellKey(actor?.fromCell ?? cell), to: cellKey(cell), previous: track?.previous ? cellKey(track.previous) : null,
            idleSeconds: track ? context.seconds - track.lastMotion : 0, localFlow, recent: this.events().slice(-12) };
        if (this.policy === 'throw') throw new RouteDiagnosticError(this.currentFault);
        return this.currentFault;
    }

    private saveMap(context: RouteContext, towers: readonly TowerDeployment[]): void {
        this.lastMap = { grid: context.flow.grid.id, version: context.mapVersion, towers: towers.map(tower => ({ ...tower, cell: { ...tower.cell } })) };
        if (!this.maps.has(context.mapVersion)) this.maps.set(context.mapVersion, Array.from(context.flow.blocked).sort());
    }
    private record(context: RouteContext, data: Omit<RouteEvent, 'seq' | 'seconds' | 'mapVersion' | 'wave'>): void {
        const event: RouteEvent = { ...data, seq: ++this.sequence, seconds: context.seconds, mapVersion: context.mapVersion, wave: context.wave };
        if (this.ring.length < this.capacity) this.ring.push(event);
        else { this.ring[this.cursor] = event; this.cursor = (this.cursor + 1) % this.capacity; }
    }
    private events(): RouteEvent[] { return [...this.ring.slice(this.cursor), ...this.ring.slice(0, this.cursor)]; }
}
