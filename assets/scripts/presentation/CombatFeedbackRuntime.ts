import type { CombatEnemy, CombatTickResult, GridPoint, ShotEvent } from '../systems/WaveCombatRuntime';
import type { TowerId } from '../config/PhaseBCombatConfig';
import type { BattlePhase } from '../systems/BattleStateMachine';
import { enemyDeathFeedbackSeconds } from './UnitVisualMotion';

export interface TimedFeedback {
    readonly point: GridPoint;
    readonly remainingSeconds: number;
    readonly durationSeconds: number;
}

export interface TracerFeedback extends TimedFeedback {
    readonly origin: GridPoint;
    readonly targetId: string;
    readonly damage: number;
    readonly lethal: boolean;
    readonly towerId: TowerId;
    readonly appliedSlow: boolean;
}

export interface ImpactFeedback extends TimedFeedback {
    readonly targetId: string;
    readonly origin: GridPoint;
    readonly towerId: TowerId;
    readonly lethal: boolean;
}

export interface TowerAimFeedback extends TimedFeedback {
    readonly targetId: string;
    readonly origin: GridPoint;
    readonly towerId: TowerId;
}

export interface SlowPulseFeedback extends TimedFeedback {
    readonly radiusCells: number;
    readonly affectedEnemyCount: number;
}

export interface RewardFeedback extends TimedFeedback {
    readonly amount: number;
}

export interface DeathFeedback extends TimedFeedback {
    readonly enemyId: string;
    readonly archetypeId: CombatEnemy['archetype']['id'];
    readonly spawnOrder: number;
}

export interface CombatFeedbackSnapshot {
    readonly tracers: readonly TracerFeedback[];
    readonly impacts: readonly ImpactFeedback[];
    readonly aims: readonly TowerAimFeedback[];
    readonly slowPulses: readonly SlowPulseFeedback[];
    readonly deaths: readonly DeathFeedback[];
    readonly rewards: readonly RewardFeedback[];
    readonly coreHits: readonly TimedFeedback[];
}

// 双倍速下仍保留约 0.08 秒真实可见时间；短弹迹只属于表现层，不延迟已经发生的命中。
const TRACER_SECONDS = 0.16;
const IMPACT_SECONDS = 0.16;
// 略长于机枪基础射击间隔；连射可持续摆头，停火后自行回正。
const TOWER_AIM_SECONDS = 0.48;
// 与 0.1 秒弹道分离：2× 战斗时仍给范围圈约 0.25 秒真实可见时间。
const SLOW_PULSE_SECONDS = 0.5;
const REWARD_SECONDS = 0.7;
const CORE_HIT_SECONDS = 0.28;
const MAX_FEEDBACK_PER_CHANNEL = 64;

/** 教学波间只暂停战斗以便布防；若没有真正的暂停菜单，短反馈仍须自行收尾。 */
export function shouldAdvanceFeedbackWhileGuidedHold(phase: BattlePhase, guidedIntermissionHeld: boolean, pauseVisible: boolean): boolean {
    return phase === 'paused' && guidedIntermissionHeld && !pauseVisible;
}

export function countCombatFeedback(snapshot: CombatFeedbackSnapshot): number {
    return snapshot.tracers.length + snapshot.impacts.length + snapshot.aims.length + snapshot.slowPulses.length + snapshot.deaths.length
        + snapshot.rewards.length + snapshot.coreHits.length;
}

/**
 * 战斗表现只消费一次性事件并管理短生命周期，不参与伤害、寻路或胜负计算。
 * 因此即使暂停战斗，已有反馈也能自然回到静止态，不会污染可复现的模拟结果。
 */
export class CombatFeedbackRuntime {
    private activeTracers: TracerFeedback[] = [];
    private activeImpacts: ImpactFeedback[] = [];
    private activeAims: TowerAimFeedback[] = [];
    private activeSlowPulses: SlowPulseFeedback[] = [];
    private activeDeaths: DeathFeedback[] = [];
    private activeRewards: RewardFeedback[] = [];
    private activeCoreHits: TimedFeedback[] = [];

    public get snapshot(): CombatFeedbackSnapshot {
        return {
            tracers: this.activeTracers,
            impacts: this.activeImpacts,
            aims: this.activeAims,
            slowPulses: this.activeSlowPulses,
            deaths: this.activeDeaths,
            rewards: this.activeRewards,
            coreHits: this.activeCoreHits,
        };
    }

    public consume(result: CombatTickResult): void {
        this.activeTracers.push(...result.shots.map((shot) => this.tracerFor(shot)));
        // 命中只携带已有的射击事实；表现层据此区分铜火花与冷凝晶芒，不反向影响伤害。
        this.activeImpacts.push(...result.shots.map((shot) => ({
            ...this.timed(shot.targetPoint, IMPACT_SECONDS),
            origin: { column: shot.towerCell.column, row: shot.towerCell.row },
            towerId: shot.towerId,
            targetId: shot.targetId,
            lethal: shot.lethal,
        })));
        if (result.shots.length > 0) {
            const latestByTower = new Map<string, TowerAimFeedback>(this.activeAims.map((aim) => [`${aim.origin.column},${aim.origin.row}`, aim]));
            for (const shot of result.shots) {
                if (shot.towerId !== 'rivet-gun') continue;
                const aim: TowerAimFeedback = {
                    ...this.timed(shot.targetPoint, TOWER_AIM_SECONDS),
                    origin: { column: shot.towerCell.column, row: shot.towerCell.row },
                    towerId: shot.towerId,
                    targetId: shot.targetId,
                };
                latestByTower.set(`${aim.origin.column},${aim.origin.row}`, aim);
            }
            // 同一炮塔只保留最近一次瞄准，连续开火不累积旧目标或额外节点。
            this.activeAims = Array.from(latestByTower.values());
        }
        this.activeSlowPulses.push(...result.shots.flatMap((shot) => {
            const affectedEnemyCount = shot.slowedEnemyIds?.length ?? Number(shot.appliedSlow);
            if (!shot.appliedSlow || !shot.slowRadiusCells || affectedEnemyCount === 0) return [];
            return [{ ...this.timed(shot.targetPoint, SLOW_PULSE_SECONDS),
                radiusCells: shot.slowRadiusCells, affectedEnemyCount }];
        }));
        this.activeDeaths.push(...result.killed.map((enemy) => ({
            ...this.timed(this.enemyPoint(enemy), enemyDeathFeedbackSeconds(enemy.archetype.id)),
            enemyId: enemy.id,
            archetypeId: enemy.archetype.id,
            spawnOrder: enemy.spawnOrder,
        })));
        this.activeRewards.push(...result.killed.map((enemy) => ({
            ...this.timed(this.enemyPoint(enemy), REWARD_SECONDS),
            amount: enemy.archetype.killReward,
        })));
        this.activeCoreHits.push(...result.leaked.map(() => this.timed({ column: -1, row: -1 }, CORE_HIT_SECONDS)));
        this.trimChannels();
    }

    public advance(deltaSeconds: number): void {
        if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) throw new RangeError('deltaSeconds 不能为负数');
        this.activeTracers = this.decay(this.activeTracers, deltaSeconds);
        this.activeImpacts = this.decay(this.activeImpacts, deltaSeconds);
        this.activeAims = this.decay(this.activeAims, deltaSeconds);
        this.activeSlowPulses = this.decay(this.activeSlowPulses, deltaSeconds);
        this.activeDeaths = this.decay(this.activeDeaths, deltaSeconds);
        this.activeRewards = this.decay(this.activeRewards, deltaSeconds);
        this.activeCoreHits = this.decay(this.activeCoreHits, deltaSeconds);
    }

    public clear(): void {
        this.activeTracers = [];
        this.activeImpacts = [];
        this.activeAims = [];
        this.activeSlowPulses = [];
        this.activeDeaths = [];
        this.activeRewards = [];
        this.activeCoreHits = [];
    }

    private tracerFor(shot: ShotEvent): TracerFeedback {
        return {
            ...this.timed(shot.targetPoint, TRACER_SECONDS),
            origin: { column: shot.towerCell.column, row: shot.towerCell.row },
            targetId: shot.targetId,
            damage: shot.damage,
            lethal: shot.lethal,
            towerId: shot.towerId,
            appliedSlow: shot.appliedSlow,
        };
    }

    private timed(point: GridPoint, durationSeconds: number): TimedFeedback {
        return { point, durationSeconds, remainingSeconds: durationSeconds };
    }

    private enemyPoint(enemy: CombatEnemy): GridPoint {
        return {
            column: enemy.fromCell.column + (enemy.toCell.column - enemy.fromCell.column) * enemy.progress,
            row: enemy.fromCell.row + (enemy.toCell.row - enemy.fromCell.row) * enemy.progress,
        };
    }

    private decay<T extends TimedFeedback>(items: readonly T[], deltaSeconds: number): T[] {
        return items
            .map((item) => ({ ...item, remainingSeconds: item.remainingSeconds - deltaSeconds }))
            .filter((item) => item.remainingSeconds > 0) as T[];
    }

    private trimChannels(): void {
        this.activeTracers = this.activeTracers.slice(-MAX_FEEDBACK_PER_CHANNEL);
        this.activeImpacts = this.activeImpacts.slice(-MAX_FEEDBACK_PER_CHANNEL);
        this.activeAims = this.activeAims.slice(-MAX_FEEDBACK_PER_CHANNEL);
        this.activeSlowPulses = this.activeSlowPulses.slice(-MAX_FEEDBACK_PER_CHANNEL);
        this.activeDeaths = this.activeDeaths.slice(-MAX_FEEDBACK_PER_CHANNEL);
        this.activeRewards = this.activeRewards.slice(-MAX_FEEDBACK_PER_CHANNEL);
        this.activeCoreHits = this.activeCoreHits.slice(-MAX_FEEDBACK_PER_CHANNEL);
    }
}
