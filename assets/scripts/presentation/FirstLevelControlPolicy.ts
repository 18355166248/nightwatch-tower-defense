import type { BattlePhase } from '../systems/BattleStateMachine';

/** 战前和教学待命由底栏独占开波；中央按钮只在运行中的战斗阶段承担暂停。 */
export function centerPauseVisible(preparing: boolean, phase: BattlePhase, guidedIntermissionHeld: boolean): boolean {
    return !preparing && !guidedIntermissionHeld
        && (phase === 'countdown' || phase === 'spawning' || phase === 'clearing');
}

/** 教学波间虽处于paused，仍是布防窗口；不能跟用户暂停一起把操作建议隐藏。 */
export function firstLevelGuidanceVisible(phase: BattlePhase, guided: boolean, waveStartActive: boolean, inspected: boolean): boolean {
    return !inspected && (phase === 'preparing' || guided && phase === 'paused' && waveStartActive);
}
