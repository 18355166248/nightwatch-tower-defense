import type { BattleSnapshot } from '../systems/BattleStateMachine';
import type { CombatTotals } from '../systems/WaveCombatRuntime';

export interface BattleResultViewModel {
    readonly kind: 'victory' | 'defeat';
    readonly title: string;
    readonly summary: string;
    readonly actionLabel: string;
}

/** 把规则快照翻译为结算文案，渲染层无需理解胜负判断与统计字段。 */
export function buildBattleResultViewModel(
    battle: BattleSnapshot,
    totals: CombatTotals,
    gold: number,
    initialCoreHealth: number,
): BattleResultViewModel | null {
    if (battle.phase !== 'victory' && battle.phase !== 'defeat') return null;
    return {
        kind: battle.phase,
        title: battle.phase === 'victory' ? '防线守住了' : '核心失守',
        summary: `击毁 ${totals.killed}/${totals.spawned}　漏怪 ${totals.leaked}\n核心 ${battle.coreHealth}/${initialCoreHealth}　金币 ${gold}`,
        actionLabel: '重新部署',
    };
}
