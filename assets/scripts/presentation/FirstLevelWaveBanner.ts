import type { BattlePhase } from '../systems/BattleStateMachine';
import type { WaveSpawnProgress } from '../systems/WaveCombatRuntime';

export interface FirstLevelWaveBannerState extends WaveSpawnProgress {
    readonly wave: number;
    readonly activeEnemies: number;
    readonly phase: BattlePhase;
}

/** 波内清屏不等于清场；进度提示从真实生成数和场上数推导，不读取会被事件覆盖的状态文案。 */
export function firstLevelWaveBanner(state: FirstLevelWaveBannerState): string {
    if (state.wave === 0 || state.phase === 'preparing') return '第一关 · 守住夜城入口';
    if (state.activeEnemies === 0 && state.spawned === state.total && state.total > 0) {
        return `第 ${state.wave} 波守住 · 下一波待命`;
    }
    return `第 ${state.wave} 波 · 已来 ${state.spawned}/${state.total} · 场上 ${state.activeEnemies}`;
}
