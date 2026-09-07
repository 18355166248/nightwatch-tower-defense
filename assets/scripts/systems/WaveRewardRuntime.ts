import type { WaveDefinition } from '../config/PhaseBCombatConfig';
import { EconomyLedger } from './EconomyLedger';

export interface WaveRewardSettlement {
    readonly credited: boolean;
    readonly wave: number;
    readonly amount: number;
    readonly totalAwarded: number;
    readonly gold: number;
}

/**
 * 清场奖励独立于战斗伤害和状态机；按连续波次幂等结算，避免同一清场帧重复发钱。
 */
export class WaveRewardRuntime {
    private lastSettledWave = 0;
    private awardedTotal = 0;

    public get totalAwarded(): number {
        return this.awardedTotal;
    }

    public settle(wave: WaveDefinition, economy: EconomyLedger): WaveRewardSettlement {
        if (wave.wave <= this.lastSettledWave) {
            return {
                credited: false,
                wave: wave.wave,
                amount: 0,
                totalAwarded: this.awardedTotal,
                gold: economy.balance,
            };
        }
        if (wave.wave !== this.lastSettledWave + 1) {
            throw new Error(`清场奖励必须连续结算：期望第 ${this.lastSettledWave + 1} 波，实际第 ${wave.wave} 波`);
        }
        economy.credit(wave.clearReward);
        this.lastSettledWave = wave.wave;
        this.awardedTotal += wave.clearReward;
        return {
            credited: true,
            wave: wave.wave,
            amount: wave.clearReward,
            totalAwarded: this.awardedTotal,
            gold: economy.balance,
        };
    }
}
