import type { BattleSnapshot } from '../systems/BattleStateMachine';
import type { CombatTotals } from '../systems/WaveCombatRuntime';

export interface BattleResultViewModel {
    readonly kind: 'victory' | 'defeat';
    readonly title: string;
    readonly subtitle: string;
    readonly summary: string;
    readonly stats: readonly BattleResultStat[];
    readonly runDetails: readonly BattleResultStat[];
    readonly footnote: string;
    readonly actionLabel: string;
    readonly homeActionLabel: string;
}

export interface BattleResultStat {
    readonly label: string;
    readonly value: string;
    readonly tone: 'gold' | 'success' | 'danger';
}

export interface BattleResultContext {
    readonly levelLabel?: string;
    readonly nextLevelLabel?: string;
    readonly initialCoreHealth: number;
    readonly totalWaves: number;
    readonly elapsedSeconds: number;
    readonly towerCount: number;
    readonly upgradeCount: number;
    readonly bestSeconds: number | null;
    readonly newRecord: boolean;
    readonly bestRemainingHealth: number | null;
    readonly bestCoreHealthCapacity: number;
    readonly newHealthRecord: boolean;
}

export function formatRunDuration(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0) throw new RangeError('局内时长必须为非负数');
    const whole = Math.floor(seconds);
    return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
}

/** 把规则快照翻译为结算文案，渲染层无需理解胜负判断与统计字段。 */
export function buildBattleResultViewModel(
    battle: BattleSnapshot,
    totals: CombatTotals,
    gold: number,
    context: BattleResultContext,
): BattleResultViewModel | null {
    if (battle.phase !== 'victory' && battle.phase !== 'defeat') return null;
    const { initialCoreHealth, totalWaves, elapsedSeconds, towerCount, upgradeCount, bestSeconds, newRecord,
        bestRemainingHealth, bestCoreHealthCapacity, newHealthRecord } = context;
    const recordLines = [
        bestSeconds !== null ? `${battle.phase === 'victory' && newRecord ? '新最快' : '最快'} ${formatRunDuration(bestSeconds)}` : null,
        bestRemainingHealth !== null
            // 本局生命可能来自失败测试夹具；历史战绩使用自己的标准关卡容量。
            ? `${battle.phase === 'victory' && newHealthRecord ? '新核心纪录' : '最佳核心'} ${bestRemainingHealth}/${bestCoreHealthCapacity}` : null,
    ];
    const recordFootnote = recordLines.filter((line): line is string => line !== null).join(' · ');
    return {
        kind: battle.phase,
        title: battle.phase === 'victory' ? '防线守住了' : '核心失守',
        subtitle: battle.phase === 'victory'
            ? `${context.levelLabel ?? '第一关'} · ${battle.wave}/${totalWaves} 波守住`
            : `${context.levelLabel ?? '第一关'} · 止步第 ${battle.wave}/${totalWaves} 波`,
        summary: `击毁 ${totals.killed}/${totals.spawned}　漏怪 ${totals.leaked}\n核心 ${battle.coreHealth}/${initialCoreHealth}　金币 ${gold}`,
        stats: [
            { label: '击毁', value: `${totals.killed}/${totals.spawned}`, tone: 'gold' },
            { label: '漏怪', value: String(totals.leaked), tone: totals.leaked > 0 ? 'danger' : 'success' },
            { label: '核心', value: `${battle.coreHealth}/${initialCoreHealth}`, tone: battle.coreHealth > 3 ? 'success' : 'danger' },
            { label: '金币', value: String(gold), tone: 'gold' },
        ],
        runDetails: [
            { label: '局内用时', value: formatRunDuration(elapsedSeconds), tone: 'gold' },
            { label: '建塔', value: String(towerCount), tone: 'gold' },
            { label: '升级', value: String(upgradeCount), tone: 'gold' },
        ],
        footnote: recordFootnote || (battle.phase === 'victory' ? `${context.levelLabel ?? '首关'}已守住` : '调整布防后可再次挑战'),
        actionLabel: battle.phase === 'victory' && context.nextLevelLabel ? `挑战${context.nextLevelLabel}` : '重新部署',
        homeActionLabel: '返回首页',
    };
}
