export type BattlePhase = 'preparing' | 'spawning' | 'clearing' | 'countdown' | 'paused' | 'victory' | 'defeat';

export type StartRejectReason = 'needs-two-towers' | 'needs-path-delta' | 'wrong-phase';

export interface BattleSnapshot {
    readonly phase: BattlePhase;
    readonly wave: number;
    readonly coreHealth: number;
    readonly countdownSeconds: number;
}

export interface StartResult {
    readonly accepted: boolean;
    readonly reason?: StartRejectReason;
}

export class BattleStateMachine {
    private currentPhase: BattlePhase = 'preparing';
    private resumePhase: Exclude<BattlePhase, 'paused'> | null = null;
    private currentWave = 0;
    private currentCoreHealth: number;
    private remainingCountdown = 0;

    public constructor(
        private readonly totalWaves = 8,
        coreHealth = 10,
        private readonly interWaveSeconds = 8,
    ) {
        if (!Number.isInteger(totalWaves) || totalWaves <= 0) throw new RangeError('totalWaves 必须为正整数');
        if (!Number.isInteger(coreHealth) || coreHealth <= 0) throw new RangeError('coreHealth 必须为正整数');
        if (!Number.isFinite(interWaveSeconds) || interWaveSeconds < 0) throw new RangeError('interWaveSeconds 不能为负数');
        this.currentCoreHealth = coreHealth;
    }

    public get snapshot(): BattleSnapshot {
        return {
            phase: this.currentPhase,
            wave: this.currentWave,
            coreHealth: this.currentCoreHealth,
            countdownSeconds: this.remainingCountdown,
        };
    }

    public startFirstWave(towerCount: number, pathDelta: number): StartResult {
        if (this.currentPhase !== 'preparing' || this.currentWave !== 0) return { accepted: false, reason: 'wrong-phase' };
        if (towerCount < 2) return { accepted: false, reason: 'needs-two-towers' };
        if (pathDelta < 2) return { accepted: false, reason: 'needs-path-delta' };
        this.currentWave = 1;
        this.currentPhase = 'spawning';
        return { accepted: true };
    }

    public markSpawningComplete(activeEnemyCount: number): void {
        if (this.currentPhase !== 'spawning') throw new Error('只有生成阶段可以标记生成完成');
        this.currentPhase = 'clearing';
        this.resolveWaveIfClear(activeEnemyCount);
    }

    public resolveEnemyKilled(activeEnemyCountAfterRemoval: number): void {
        this.resolveCombatOutcome(0, activeEnemyCountAfterRemoval);
    }

    public resolveEnemyLeak(activeEnemyCountAfterRemoval: number): void {
        this.resolveEnemyLeaks(1, activeEnemyCountAfterRemoval);
    }

    public resolveEnemyLeaks(count: number, activeEnemyCountAfterRemoval: number): void {
        this.resolveCombatOutcome(count, activeEnemyCountAfterRemoval);
    }

    public resolveCombatOutcome(leakCount: number, activeEnemyCountAfterRemoval: number): void {
        this.requireCombatPhase();
        if (!Number.isInteger(leakCount) || leakCount < 0) throw new RangeError('leakCount 不能为负数');
        this.currentCoreHealth = Math.max(0, this.currentCoreHealth - leakCount);
        if (this.currentCoreHealth === 0) {
            // 失败要求立即终止生成和倒计时，不再等待场上其他敌人结算。
            this.currentPhase = 'defeat';
            this.remainingCountdown = 0;
            return;
        }
        this.resolveWaveIfClear(activeEnemyCountAfterRemoval);
    }

    public advance(deltaSeconds: number): void {
        if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) throw new RangeError('deltaSeconds 不能为负数');
        if (this.currentPhase !== 'countdown') return;
        this.remainingCountdown = Math.max(0, this.remainingCountdown - deltaSeconds);
        if (this.remainingCountdown > 0) return;
        this.beginNextWave();
    }

    public startNextWaveEarly(): boolean {
        if (this.currentPhase !== 'countdown') return false;
        // 提前开波与自然倒计时使用相同的目标状态，调用方只需走统一的波次启动入口。
        this.beginNextWave();
        return true;
    }

    public startNextWaveFromHeldIntermission(): boolean {
        if (this.currentPhase !== 'paused' || this.resumePhase !== 'countdown') return false;
        // 教学清场已经无限时等待玩家布防；按继续即开波，不再让玩家等倒计时或二次点击。
        this.resumePhase = null;
        this.beginNextWave();
        return true;
    }

    private beginNextWave(): void {
        this.remainingCountdown = 0;
        this.currentWave += 1;
        this.currentPhase = 'spawning';
    }

    public pause(): boolean {
        if (this.currentPhase === 'paused' || this.currentPhase === 'preparing'
            || this.currentPhase === 'victory' || this.currentPhase === 'defeat') return false;
        // 暂停保留原阶段与倒计时，恢复时不得统一跳回 Preparing。
        this.resumePhase = this.currentPhase;
        this.currentPhase = 'paused';
        return true;
    }

    public resume(): boolean {
        if (this.currentPhase !== 'paused' || !this.resumePhase) return false;
        this.currentPhase = this.resumePhase;
        this.resumePhase = null;
        return true;
    }

    private resolveWaveIfClear(activeEnemyCount: number): void {
        if (!Number.isInteger(activeEnemyCount) || activeEnemyCount < 0) throw new RangeError('activeEnemyCount 不能为负数');
        if (this.currentPhase !== 'clearing' || activeEnemyCount > 0) return;
        if (this.currentWave >= this.totalWaves) {
            this.currentPhase = 'victory';
            this.remainingCountdown = 0;
            return;
        }
        this.currentPhase = 'countdown';
        this.remainingCountdown = this.interWaveSeconds;
    }

    private requireCombatPhase(): void {
        if (this.currentPhase !== 'spawning' && this.currentPhase !== 'clearing') {
            throw new Error('只有战斗阶段可以结算敌人');
        }
    }
}
