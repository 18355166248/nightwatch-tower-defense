import type { CombatEnemy, CombatTickResult, GridPoint, ShotEvent } from '../systems/WaveCombatRuntime';
import type { TowerId } from '../config/PhaseBCombatConfig';
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
    readonly impacts: readonly TimedFeedback[];
    readonly slowPulses: readonly SlowPulseFeedback[];
    readonly deaths: readonly DeathFeedback[];
    readonly rewards: readonly RewardFeedback[];
    readonly coreHits: readonly TimedFeedback[];
}

const TRACER_SECONDS = 0.1;
const IMPACT_SECONDS = 0.16;
// 与 0.1 秒弹道分离：2× 战斗时仍给范围圈约 0.25 秒真实可见时间。
const SLOW_PULSE_SECONDS = 0.5;
const REWARD_SECONDS = 0.7;
const CORE_HIT_SECONDS = 0.28;
const MAX_FEEDBACK_PER_CHANNEL = 64;

export function countCombatFeedback(snapshot: CombatFeedbackSnapshot): number {
    return snapshot.tracers.length + snapshot.impacts.length + snapshot.slowPulses.length + snapshot.deaths.length
        + snapshot.rewards.length + snapshot.coreHits.length;
}

/**
 * 战斗表现只消费一次性事件并管理短生命周期，不参与伤害、寻路或胜负计算。
 * 因此即使暂停战斗，已有反馈也能自然回到静止态，不会污染可复现的模拟结果。
 */
export class CombatFeedbackRuntime {
    private activeTracers: TracerFeedback[] = [];
    private activeImpacts: TimedFeedback[] = [];
    private activeSlowPulses: SlowPulseFeedback[] = [];
    private activeDeaths: DeathFeedback[] = [];
    private activeRewards: RewardFeedback[] = [];
    private activeCoreHits: TimedFeedback[] = [];

    public get snapshot(): CombatFeedbackSnapshot {
        return {
            tracers: this.activeTracers,
            impacts: this.activeImpacts,
            slowPulses: this.activeSlowPulses,
            deaths: this.activeDeaths,
            rewards: this.activeRewards,
            coreHits: this.activeCoreHits,
        };
    }

    public consume(result: CombatTickResult): void {
        this.activeTracers.push(...result.shots.map((shot) => this.tracerFor(shot)));
        this.activeImpacts.push(...result.shots.map((shot) => this.timed(shot.targetPoint, IMPACT_SECONDS)));
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
        this.activeSlowPulses = this.decay(this.activeSlowPulses, deltaSeconds);
        this.activeDeaths = this.decay(this.activeDeaths, deltaSeconds);
        this.activeRewards = this.decay(this.activeRewards, deltaSeconds);
        this.activeCoreHits = this.decay(this.activeCoreHits, deltaSeconds);
    }

    public clear(): void {
        this.activeTracers = [];
        this.activeImpacts = [];
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
        this.activeSlowPulses = this.activeSlowPulses.slice(-MAX_FEEDBACK_PER_CHANNEL);
        this.activeDeaths = this.activeDeaths.slice(-MAX_FEEDBACK_PER_CHANNEL);
        this.activeRewards = this.activeRewards.slice(-MAX_FEEDBACK_PER_CHANNEL);
        this.activeCoreHits = this.activeCoreHits.slice(-MAX_FEEDBACK_PER_CHANNEL);
    }
}
