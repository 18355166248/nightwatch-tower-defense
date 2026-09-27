import type { BattleSnapshot } from '../systems/BattleStateMachine';
import type { CombatTotals } from '../systems/WaveCombatRuntime';

export interface BattleResultViewModel {
    readonly kind: 'victory' | 'defeat';
    readonly title: string;
    readonly subtitle: string;
    readonly summary: string;
    readonly stats: readonly BattleResultStat[];
    readonly footnote: string;
    readonly actionLabel: string;
}

export interface BattleResultStat {
    readonly label: string;
    readonly value: string;
    readonly tone: 'gold' | 'success' | 'danger';
}

/** 把规则快照翻译为结算文案，渲染层无需理解胜负判断与统计字段。 */
export function buildBattleResultViewModel(
    battle: BattleSnapshot,
    totals: CombatTotals,
    gold: number,
    initialCoreHealth: number,
    totalWaves: number,
): BattleResultViewModel | null {
    if (battle.phase !== 'victory' && battle.phase !== 'defeat') return null;
    return {
        kind: battle.phase,
        title: battle.phase === 'victory' ? '防线守住了' : '核心失守',
        subtitle: battle.phase === 'victory'
            ? `第一关 · ${battle.wave}/${totalWaves} 波守住`
            : `第一关 · 止步第 ${battle.wave}/${totalWaves} 波`,
        summary: `击毁 ${totals.killed}/${totals.spawned}　漏怪 ${totals.leaked}\n核心 ${battle.coreHealth}/${initialCoreHealth}　金币 ${gold}`,
        stats: [
            { label: '击毁', value: `${totals.killed}/${totals.spawned}`, tone: 'gold' },
            { label: '漏怪', value: String(totals.leaked), tone: totals.leaked > 0 ? 'danger' : 'success' },
            { label: '核心', value: `${battle.coreHealth}/${initialCoreHealth}`, tone: battle.coreHealth > 3 ? 'success' : 'danger' },
            { label: '金币', value: String(gold), tone: 'gold' },
        ],
        footnote: '恢复开战前布防，可调整后再次挑战',
        actionLabel: '重新部署',
    };
}
