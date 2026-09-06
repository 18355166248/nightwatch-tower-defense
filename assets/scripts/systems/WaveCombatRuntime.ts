import type { EnemyArchetype, TowerArchetype, WaveDefinition } from '../config/PhaseBCombatConfig';
import { sameCell, type EnemyRouteState, type GridCell, type GridDefinition } from '../core/GridTypes';
import { FlowField } from './FlowField';

export interface CombatEnemy {
    readonly id: string;
    readonly archetype: EnemyArchetype;
    health: number;
    fromCell: GridCell;
    toCell: GridCell;
    progress: number;
    readonly spawnOrder: number;
}

export interface GridPoint {
    readonly column: number;
    readonly row: number;
}

export interface ShotEvent {
    readonly towerCell: GridCell;
    readonly targetId: string;
    readonly targetPoint: GridPoint;
    readonly damage: number;
    readonly lethal: boolean;
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

export class WaveCombatRuntime {
    private activeEnemies: CombatEnemy[] = [];
    private towerCooldowns = new Map<string, number>();
    private wave: WaveDefinition | null = null;
    private groupIndex = 0;
    private spawnedInGroup = 0;
    private spawnCountdown = 0;
    private nextEnemyId = 1;
    private nextSpawnOrder = 1;
    private spawningCompleted = false;
    private spawnedCount = 0;
    private killedCount = 0;
    private leakedCount = 0;

    public constructor(
        private readonly grid: GridDefinition,
        private readonly tower: TowerArchetype,
    ) {}

    public get enemies(): readonly CombatEnemy[] {
        return this.activeEnemies;
    }

    public get isSpawningComplete(): boolean {
        return this.spawningCompleted;
    }

    public get totals(): CombatTotals {
        return { spawned: this.spawnedCount, killed: this.killedCount, leaked: this.leakedCount };
    }

    public start(wave: WaveDefinition): void {
        if (this.wave || this.activeEnemies.length > 0) throw new Error('上一波未清空，不能启动新波次');
        if (wave.groups.length === 0) throw new Error('波次至少需要一个敌人分组');
        this.wave = wave;
        this.groupIndex = 0;
        this.spawnedInGroup = 0;
        this.spawnCountdown = 0;
        this.spawningCompleted = false;
    }

    public reset(): void {
        this.activeEnemies = [];
        this.towerCooldowns.clear();
        this.wave = null;
        this.groupIndex = 0;
        this.spawnedInGroup = 0;
        this.spawnCountdown = 0;
        this.nextEnemyId = 1;
        this.nextSpawnOrder = 1;
        this.spawningCompleted = false;
        this.spawnedCount = 0;
        this.killedCount = 0;
        this.leakedCount = 0;
    }

    public enemyRouteStates(): readonly EnemyRouteState[] {
        return this.activeEnemies.map(({ id, fromCell, toCell, progress }) => ({ id, fromCell, toCell, progress }));
    }

    public tick(
        deltaSeconds: number,
        flowField: FlowField,
        towerKeys: ReadonlySet<string>,
    ): CombatTickResult {
        if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) throw new RangeError('deltaSeconds 不能为负数');
        const spawningWasComplete = this.spawningCompleted;
        this.spawn(deltaSeconds, flowField);
        const leaked = this.moveEnemies(deltaSeconds, flowField);
        const { shots, killed } = this.fireTowers(deltaSeconds, flowField, towerKeys);
        return {
            shots,
            killed,
            leaked,
            spawningCompleted: !spawningWasComplete && this.spawningCompleted,
        };
    }

    private spawn(deltaSeconds: number, flowField: FlowField): void {
        if (!this.wave || this.spawningCompleted) return;
        const wave = this.wave;
        this.spawnCountdown -= deltaSeconds;
        while (this.spawnCountdown <= 0 && !this.spawningCompleted) {
            const group = wave.groups[this.groupIndex];
            const next = flowField.nextCell(this.grid.entry);
            if (!next) throw new Error('入口无可用路径，无法生成敌人');
            this.activeEnemies.push({
                id: `enemy-${this.nextEnemyId++}`,
                archetype: group.enemy,
                health: group.enemy.maxHealth,
                fromCell: this.grid.entry,
                toCell: next,
                progress: 0,
                spawnOrder: this.nextSpawnOrder++,
            });
            this.spawnedCount += 1;
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
    }

    private moveEnemies(deltaSeconds: number, flowField: FlowField): CombatEnemy[] {
        const leaked: CombatEnemy[] = [];
        for (const enemy of this.activeEnemies) {
            enemy.progress += deltaSeconds * enemy.archetype.speedCellsPerSecond;
            while (enemy.progress >= 1) {
                if (sameCell(enemy.toCell, this.grid.exit)) {
                    leaked.push(enemy);
                    break;
                }
                const next = flowField.nextCell(enemy.toCell, enemy.fromCell);
                if (!next) throw new Error(`敌人 ${enemy.id} 抵达格心后无非回头路线`);
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
        towerKeys: ReadonlySet<string>,
    ): { shots: ShotEvent[]; killed: CombatEnemy[] } {
        const shots: ShotEvent[] = [];
        const killed: CombatEnemy[] = [];
        for (const key of towerKeys) {
            const cooldown = (this.towerCooldowns.get(key) ?? 0) - deltaSeconds;
            if (cooldown > 0) {
                this.towerCooldowns.set(key, cooldown);
                continue;
            }
            const towerCell = this.cellFromKey(key);
            const target = this.pickTarget(towerCell, flowField);
            if (!target) {
                this.towerCooldowns.set(key, 0);
                continue;
            }
            const damage = Math.min(target.health, this.tower.damage);
            target.health -= damage;
            shots.push({
                towerCell,
                targetId: target.id,
                targetPoint: this.enemyPoint(target),
                damage,
                lethal: target.health <= 0,
            });
            // 保留本帧越过冷却零点的余量，避免 20/30/60 FPS 下累计射速不同。
            this.towerCooldowns.set(key, this.tower.attackIntervalSeconds + cooldown);
            if (target.health <= 0 && !killed.some((enemy) => enemy.id === target.id)) killed.push(target);
        }
        if (killed.length > 0) {
            this.killedCount += killed.length;
            const killedIds = new Set(killed.map((enemy) => enemy.id));
            this.activeEnemies = this.activeEnemies.filter((enemy) => !killedIds.has(enemy.id));
        }
        for (const key of [...this.towerCooldowns.keys()]) {
            if (!towerKeys.has(key)) this.towerCooldowns.delete(key);
        }
        return { shots, killed };
    }

    private pickTarget(towerCell: GridCell, flowField: FlowField): CombatEnemy | null {
        const candidates = this.activeEnemies.filter((enemy) => {
            // 同一帧内前一座塔可能已击杀目标，后续塔只从仍存活的敌人中重新选敌。
            if (enemy.health <= 0) return false;
            const x = enemy.fromCell.column + (enemy.toCell.column - enemy.fromCell.column) * enemy.progress;
            const y = enemy.fromCell.row + (enemy.toCell.row - enemy.fromCell.row) * enemy.progress;
            return Math.hypot(x - towerCell.column, y - towerCell.row) <= this.tower.rangeCells;
        });
        candidates.sort((left, right) => {
            // 先攻击沿当前路线最接近出口的敌人；并列时保留进入战场顺序，避免目标抖动。
            const leftDistance = flowField.distanceAt(left.toCell) + 1 - left.progress;
            const rightDistance = flowField.distanceAt(right.toCell) + 1 - right.progress;
            return leftDistance - rightDistance || left.spawnOrder - right.spawnOrder;
        });
        return candidates[0] ?? null;
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
