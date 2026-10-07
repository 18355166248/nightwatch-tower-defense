import type { EnemyArchetype, TowerArchetype, TowerId, WaveDefinition } from '../config/PhaseBCombatConfig';
import { sameCell, type EnemyRouteState, type GridCell, type GridDefinition } from '../core/GridTypes';
import { FlowField } from './FlowField';
import type { TowerDeployment } from './PlacementModel';
import { towerAtLevel } from './TowerLevelRules';
import { trafficEntryLane, trafficMove, type EnemyTrafficSettings, type TrafficLane } from './EnemyTrafficRules';
import { RouteMovementError } from './RouteDiagnostics';
import { resolveCombatDamage } from './CombatDamage';
import { TowerTargetLocks } from './TowerTargetLocks';

export interface CombatEnemy {
    readonly id: string;
    readonly archetype: EnemyArchetype;
    health: number;
    shield?: number;
    fromCell: GridCell;
    toCell: GridCell;
    progress: number;
    readonly spawnOrder: number;
    slowMultiplier: number;
    slowRemainingSeconds: number;
    trafficLane?: TrafficLane;
    trafficWaiting?: boolean;
}

export interface GridPoint {
    readonly column: number;
    readonly row: number;
}

export interface ShotEvent {
    readonly towerCell: GridCell;
    readonly towerId: TowerId;
    readonly targetId: string;
    readonly targetPoint: GridPoint;
    readonly damage: number;
    readonly shieldDamage?: number;
    readonly healthDamage?: number;
    readonly shieldBroken?: boolean;
    readonly lethal: boolean;
    readonly appliedSlow: boolean;
    readonly slowedEnemyIds?: readonly string[];
    readonly slowRadiusCells?: number;
}

export interface CombatTickResult {
    readonly shots: readonly ShotEvent[];
    readonly killed: readonly CombatEnemy[];
    readonly leaked: readonly CombatEnemy[];
    readonly spawningCompleted: boolean;
}

export interface CombatTotals {
    readonly spawned: number;
    readonly killed: number;
    readonly leaked: number;
}

export interface WaveSpawnProgress {
    readonly spawned: number;
    readonly total: number;
}

export class WaveCombatRuntime {
    private activeEnemies: CombatEnemy[] = [];
    private towerCooldowns = new Map<string, number>();
    private readonly targetLocks = new TowerTargetLocks();
    private wave: WaveDefinition | null = null;
    private groupIndex = 0;
    private spawnedInGroup = 0;
    private spawnCountdown = 0;
    private nextEnemyId = 1;
    private nextSpawnOrder = 1;
    private spawningCompleted = false;
    private spawnedCount = 0;
    private waveSpawnedCount = 0;
    private waveTotalCount = 0;
    private killedCount = 0;
    private leakedCount = 0;
    private readonly towersById = new Map<TowerId, TowerArchetype>();
    private readonly defaultTowerId: TowerId;

    public constructor(
        private readonly grid: GridDefinition,
        towerSource: TowerArchetype | readonly TowerArchetype[],
        private readonly traffic?: EnemyTrafficSettings,
    ) {
        if (traffic && (!Number.isFinite(traffic.headwayCells) || traffic.headwayCells <= 0 || traffic.headwayCells > 1)) {
            throw new RangeError('队列间距须大于0且不超过一格');
        }
        const towers = Array.isArray(towerSource) ? towerSource : [towerSource];
        if (towers.length === 0) throw new Error('战斗运行时至少需要一种炮塔');
        for (const tower of towers) this.towersById.set(tower.id, tower);
        this.defaultTowerId = towers[0].id;
    }

    public get enemies(): readonly CombatEnemy[] {
        return this.activeEnemies;
    }

    public get lockedTargets(): TowerTargetLocks['snapshot'] {return this.targetLocks.snapshot;}

    public get isSpawningComplete(): boolean {
        return this.spawningCompleted;
    }

    public get totals(): CombatTotals {
        return { spawned: this.spawnedCount, killed: this.killedCount, leaked: this.leakedCount };
    }

    public get waveSpawnProgress(): WaveSpawnProgress {
        return { spawned: this.waveSpawnedCount, total: this.waveTotalCount };
    }

    public start(wave: WaveDefinition): void {
        if (this.wave || this.spawningCompleted || this.activeEnemies.length > 0) {
            throw new Error('上一波未完成清场交接，不能启动新波次');
        }
        if (wave.groups.length === 0) throw new Error('波次至少需要一个敌人分组');
        this.wave = wave;
        this.groupIndex = 0;
        this.spawnedInGroup = 0;
        this.spawnCountdown = 0;
        this.waveSpawnedCount = 0;
        this.waveTotalCount = wave.groups.reduce((count, group) => count + group.count, 0);
        this.spawningCompleted = false;
    }

    public completeWave(): void {
        if (!this.spawningCompleted || this.activeEnemies.length > 0) {
            throw new Error('只有完成生成且清场后才能结束当前波次');
        }
        // 波间休整清掉单波生成状态与炮塔冷却，但保留整局累计统计和敌人序号。
        this.wave = null;
        this.groupIndex = 0;
        this.spawnedInGroup = 0;
        this.spawnCountdown = 0;
        this.spawningCompleted = false;
        this.towerCooldowns.clear();
        this.targetLocks.clear();
    }

    public reset(): void {
        this.activeEnemies = [];
        this.towerCooldowns.clear();
        this.targetLocks.clear();
        this.wave = null;
        this.groupIndex = 0;
        this.spawnedInGroup = 0;
        this.spawnCountdown = 0;
        this.nextEnemyId = 1;
        this.nextSpawnOrder = 1;
        this.spawningCompleted = false;
        this.spawnedCount = 0;
        this.waveSpawnedCount = 0;
        this.waveTotalCount = 0;
        this.killedCount = 0;
        this.leakedCount = 0;
    }

    public enemyRouteStates(): readonly EnemyRouteState[] {
        return this.activeEnemies.map(({ id, fromCell, toCell, progress }) => ({ id, fromCell, toCell, progress }));
    }

    public tick(
        deltaSeconds: number,
        flowField: FlowField,
        towerSource: ReadonlySet<string> | readonly TowerDeployment[],
    ): CombatTickResult {
        if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) throw new RangeError('deltaSeconds 不能为负数');
        if (this.traffic && deltaSeconds > 1 / 60 + 1e-9) {
            if (deltaSeconds > 1) throw new RangeError('队列单次推进不得超过一秒，请使用固定步进');
            // 长帧也先逐固定步进生成/移动/射击，不能一次刷出多人再在入口强行叠放。
            const shots: ShotEvent[] = [], killed: CombatEnemy[] = [], leaked: CombatEnemy[] = [];
            let spawningCompleted = false;
            for (let remaining = deltaSeconds; remaining > 1e-9; remaining -= 1 / 60) {
                const result = this.tick(Math.min(remaining, 1 / 60), flowField, towerSource);
                shots.push(...result.shots); killed.push(...result.killed); leaked.push(...result.leaked);
                spawningCompleted ||= result.spawningCompleted;
            }
            return { shots, killed, leaked, spawningCompleted };
        }
        const spawningWasComplete = this.spawningCompleted;
        const spawnedTravelSeconds = this.spawn(deltaSeconds, flowField);
        const leaked = this.moveEnemies(deltaSeconds, flowField, spawnedTravelSeconds);
        const deployments: readonly TowerDeployment[] = Array.isArray(towerSource)
            ? towerSource as readonly TowerDeployment[]
            : Array.from(towerSource as ReadonlySet<string>, (key) => ({
                cell: this.cellFromKey(key),
                towerId: this.defaultTowerId,
            }));
        const { shots, killed } = this.fireTowers(deltaSeconds, flowField, deployments);
        return {
            shots,
            killed,
            leaked,
            spawningCompleted: !spawningWasComplete && this.spawningCompleted,
        };
    }

    private spawn(deltaSeconds: number, flowField: FlowField): ReadonlyMap<string, number> {
        const spawnedTravelSeconds = new Map<string, number>();
        if (!this.wave || this.spawningCompleted) return spawnedTravelSeconds;
        const wave = this.wave;
        this.spawnCountdown -= deltaSeconds;
        while (this.spawnCountdown <= 0 && !this.spawningCompleted) {
            const group = wave.groups[this.groupIndex];
            const next = flowField.nextCell(this.grid.entry);
            if (!next) throw new RouteMovementError('入口无可用路径，无法生成敌人');
            const trafficLane = this.traffic ? trafficEntryLane({ id: `enemy-${this.nextEnemyId}`,
                spawnOrder: this.nextSpawnOrder, fromCell: this.grid.entry, toCell: next, progress: 0 },
                this.activeEnemies, flowField, this.traffic) : undefined;
            if (trafficLane === null) {
                // 两列入口都满时待进场数量仍留在波表，不能算已生成或清场；不累积负余量造成后续爆发刷怪。
                this.spawnCountdown = 0;
                break;
            }
            const id = `enemy-${this.nextEnemyId++}`;
            // 倒计时的负余量是本帧刷出后真正经过的时间；不能让新敌人白走整帧。
            spawnedTravelSeconds.set(id, Math.min(deltaSeconds, Math.max(0, -this.spawnCountdown)));
            this.activeEnemies.push({
                id,
                archetype: group.enemy,
                health: group.enemy.maxHealth,
                shield: group.enemy.maxShield ?? 0,
                fromCell: this.grid.entry,
                toCell: next,
                progress: 0,
                spawnOrder: this.nextSpawnOrder++,
                slowMultiplier: 1,
                slowRemainingSeconds: 0,
                ...(this.traffic ? { trafficLane: trafficLane as TrafficLane, trafficWaiting: false } : {}),
            });
            this.spawnedCount += 1;
            this.waveSpawnedCount += 1;
            this.spawnedInGroup += 1;
            this.spawnCountdown += group.spawnIntervalSeconds;
            if (this.spawnedInGroup < group.count) continue;
            this.groupIndex += 1;
            this.spawnedInGroup = 0;
            if (this.groupIndex >= wave.groups.length) {
                this.spawningCompleted = true;
                this.wave = null;
            } else {
                this.spawnCountdown += 1.5;
            }
        }
        return spawnedTravelSeconds;
    }

    private moveEnemies(deltaSeconds: number, flowField: FlowField, spawnedTravelSeconds: ReadonlyMap<string, number>): CombatEnemy[] {
        const leaked: CombatEnemy[] = [];
        const movementOrder = this.traffic ? Array.from(this.activeEnemies).sort((a, b) =>
            (flowField.distanceAt(a.toCell) + 1 - a.progress) - (flowField.distanceAt(b.toCell) + 1 - b.progress)
            || a.spawnOrder - b.spawnOrder) : this.activeEnemies;
        for (const enemy of movementOrder) {
            const travelDeltaSeconds = spawnedTravelSeconds.get(enemy.id) ?? deltaSeconds;
            // 状态恰好在长帧中到期时分段积分，避免整帧都按减速或原速计算造成帧率差异。
            const slowedSeconds = Math.min(travelDeltaSeconds, enemy.slowRemainingSeconds);
            const normalSeconds = travelDeltaSeconds - slowedSeconds;
            const travelSeconds = slowedSeconds * enemy.slowMultiplier + normalSeconds;
            enemy.slowRemainingSeconds = Math.max(0, enemy.slowRemainingSeconds - travelDeltaSeconds);
            if (enemy.slowRemainingSeconds === 0) enemy.slowMultiplier = 1;
            const desiredDistance = travelSeconds * enemy.archetype.speedCellsPerSecond;
            const movement = this.traffic ? trafficMove(enemy, desiredDistance, this.activeEnemies, flowField, this.traffic) : null;
            if (movement) { enemy.trafficLane = movement.lane; enemy.trafficWaiting = movement.waiting; }
            enemy.progress += movement?.distance ?? desiredDistance;
            while (enemy.progress >= 1) {
                if (sameCell(enemy.toCell, this.grid.exit)) {
                    leaked.push(enemy);
                    break;
                }
                const next = flowField.nextCell(enemy.toCell, enemy.fromCell);
                if (!next) throw new RouteMovementError(`敌人 ${enemy.id} 抵达格心后无非回头路线`, enemy);
                enemy.fromCell = enemy.toCell;
                enemy.toCell = next;
                enemy.progress -= 1;
            }
        }
        if (leaked.length > 0) {
            this.leakedCount += leaked.length;
            const leakedIds = new Set(leaked.map((enemy) => enemy.id));
            this.activeEnemies = this.activeEnemies.filter((enemy) => !leakedIds.has(enemy.id));
        }
        return leaked;
    }

    private fireTowers(
        deltaSeconds: number,
        flowField: FlowField,
        deployments: readonly TowerDeployment[],
    ): { shots: ShotEvent[]; killed: CombatEnemy[] } {
        const shots: ShotEvent[] = [];
        const killed: CombatEnemy[] = [];
        const activeTowerKeys = new Set<string>();
        for (const deployment of deployments) {
            const key = `${deployment.cell.column},${deployment.cell.row}`;
            activeTowerKeys.add(key);
            const baseTower = this.towersById.get(deployment.towerId);
            if (!baseTower) throw new Error(`战斗运行时未知塔种：${deployment.towerId}`);
            const tower = towerAtLevel(baseTower, deployment.level ?? 1);
            const cooldown = (this.towerCooldowns.get(key) ?? 0) - deltaSeconds;
            if (cooldown > 0) {
                this.towerCooldowns.set(key, cooldown);
                continue;
            }
            const towerCell = deployment.cell;
            const target = this.pickTarget(key, towerCell, tower, flowField);
            if (!target) {
                this.towerCooldowns.set(key, 0);
                continue;
            }
            const resolved = resolveCombatDamage(target.health, target.shield ?? 0, target.archetype, tower);
            const damage = resolved.healthDamage;
            target.health = Math.max(0, target.health - damage);
            target.shield = Math.max(0, (target.shield ?? 0) - resolved.shieldDamage);
            const targetPoint = this.enemyPoint(target);
            // 冷凝仍只对主目标造成伤害；短脉冲给同一小群敌人施加控制，避免纯机枪在密集波次始终更优。
            const slowedEnemyIds = tower.effect?.kind === 'slow'
                ? this.applySlowPulse(targetPoint, tower.effect.speedMultiplier, tower.effect.durationSeconds,
                    tower.effect.pulseRadiusCells ?? 0, target)
                : [];
            shots.push({
                towerCell,
                towerId: tower.id,
                targetId: target.id,
                targetPoint,
                damage,
                healthDamage: resolved.healthDamage,
                shieldDamage: resolved.shieldDamage,
                shieldBroken: resolved.shieldBroken,
                lethal: target.health <= 0,
                appliedSlow: slowedEnemyIds.length > 0,
                slowedEnemyIds,
                slowRadiusCells: tower.effect?.pulseRadiusCells,
            });
            // 保留本帧越过冷却零点的余量，避免 20/30/60 FPS 下累计射速不同。
            this.towerCooldowns.set(key, tower.attackIntervalSeconds + cooldown);
            if (target.health <= 0 && !killed.some((enemy) => enemy.id === target.id)) killed.push(target);
        }
        if (killed.length > 0) {
            this.killedCount += killed.length;
            const killedIds = new Set(killed.map((enemy) => enemy.id));
            this.activeEnemies = this.activeEnemies.filter((enemy) => !killedIds.has(enemy.id));
        }
        for (const key of [...this.towerCooldowns.keys()]) {
            if (!activeTowerKeys.has(key)) this.towerCooldowns.delete(key);
        }
        this.targetLocks.retain(activeTowerKeys,new Set(this.activeEnemies.map(enemy=>enemy.id)));
        return { shots, killed };
    }

    private applySlowPulse(point: GridPoint, multiplier: number, durationSeconds: number,
        radiusCells: number, primary: CombatEnemy): string[] {
        const affected: string[] = [];
        for (const enemy of this.activeEnemies) {
            if (enemy.health <= 0) continue;
            if (enemy !== primary) {
                if (radiusCells <= 0) continue;
                const other = this.enemyPoint(enemy);
                if (Math.hypot(other.column - point.column, other.row - point.row) > radiusCells) continue;
            }
            // 重复命中只取更强的减速并刷新持续时间，不能叠乘成永久冻结。
            enemy.slowMultiplier = Math.min(enemy.slowMultiplier, multiplier);
            enemy.slowRemainingSeconds = Math.max(enemy.slowRemainingSeconds, durationSeconds);
            affected.push(enemy.id);
        }
        return affected;
    }

    private pickTarget(key:string, towerCell: GridCell, tower: TowerArchetype, flowField: FlowField): CombatEnemy | null {
        const candidates = this.activeEnemies.filter((enemy) => {
            // 同一帧内前一座塔可能已击杀目标，后续塔只从仍存活的敌人中重新选敌。
            if (enemy.health <= 0) return false;
            const x = enemy.fromCell.column + (enemy.toCell.column - enemy.fromCell.column) * enemy.progress;
            const y = enemy.fromCell.row + (enemy.toCell.row - enemy.fromCell.row) * enemy.progress;
            return Math.hypot(x - towerCell.column, y - towerCell.row) <= tower.rangeCells;
        });
        const counterClass = (enemy: CombatEnemy): number => tower.targetPriority === 'armored'
            ? Number((enemy.archetype.armorReduction ?? 0) > 0)
            : tower.targetPriority === 'shielded' ? Number((enemy.shield ?? 0) > 0) : 0;
        candidates.sort((left, right) => {
            const counterOrder = counterClass(right) - counterClass(left);
            if (counterOrder !== 0) return counterOrder;
            if (tower.targetPriority === 'fast-uncontrolled') {
                // 控制塔优先压制疾行威胁；同速目标优先补未减速者，避免反复刷新一只敌人而放走整队。
                const speedOrder = right.archetype.speedCellsPerSecond - left.archetype.speedCellsPerSecond;
                if (speedOrder !== 0) return speedOrder;
                const controlOrder = Number(left.slowRemainingSeconds > 0) - Number(right.slowRemainingSeconds > 0);
                if (controlOrder !== 0) return controlOrder;
            }
            // 先攻击沿当前路线最接近出口的敌人；并列时保留进入战场顺序，避免目标抖动。
            const leftDistance = flowField.distanceAt(left.toCell) + 1 - left.progress;
            const rightDistance = flowField.distanceAt(right.toCell) + 1 - right.progress;
            return leftDistance - rightDistance || left.spawnOrder - right.spawnOrder;
        });
        return this.targetLocks.choose(key,tower.id,candidates,(locked,best)=>{
            // 锁定不能推翻出口优先/冷凝控制优先策略；只在同威胁层级和数值误差内保持原目标。
            // 新出现的克制目标必须抢占锁定；破盾后电弧塔可转向仍有盾的敌人。
            if (counterClass(locked) !== counterClass(best)) return false;
            if(tower.targetPriority==='fast-uncontrolled'
                && (locked.archetype.speedCellsPerSecond!==best.archetype.speedCellsPerSecond
                    || (locked.slowRemainingSeconds>0)!==(best.slowRemainingSeconds>0)))return false;
            const distance=(enemy:CombatEnemy)=>flowField.distanceAt(enemy.toCell)+1-enemy.progress;
            return distance(locked)<=distance(best)+1e-6;
        });
    }

    private enemyPoint(enemy: CombatEnemy): GridPoint {
        return {
            column: enemy.fromCell.column + (enemy.toCell.column - enemy.fromCell.column) * enemy.progress,
            row: enemy.fromCell.row + (enemy.toCell.row - enemy.fromCell.row) * enemy.progress,
        };
    }

    private cellFromKey(key: string): GridCell {
        const [column, row] = key.split(',').map(Number);
        if (!Number.isInteger(column) || !Number.isInteger(row)) throw new Error(`非法塔坐标：${key}`);
        return { column, row };
    }
}
