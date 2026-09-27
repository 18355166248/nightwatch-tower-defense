import type { TowerArchetype, TowerId } from '../config/PhaseBCombatConfig';
import type { BattlePhase } from '../systems/BattleStateMachine';
import { towerAtLevel } from '../systems/TowerLevelRules';

export interface WaveStartButtonViewModel {
    readonly label: string;
    readonly active: boolean;
}

/** 同一按钮在首波、自然波间和教学待命中分别承担开波动作，文案与可用态必须同步。 */
export function waveStartButtonViewModel(
    phase: BattlePhase,
    firstWaveReady: boolean,
    guidedIntermissionHeld: boolean,
    countdownSeconds: number,
): WaveStartButtonViewModel {
    if (phase === 'preparing') return firstWaveReady
        ? { label: '开始\n第一波', active: true }
        : { label: '第一波\n先布防', active: false };
    if (phase === 'countdown') return { label: `提前开波\n${Math.ceil(countdownSeconds)} 秒`, active: true };
    if (phase === 'paused' && guidedIntermissionHeld) return { label: '开始\n下一波', active: true };
    return { label: '提前开波\n等待中', active: false };
}

/** 金币已有独立数值卡片，事件行只保留发生了什么，避免短屏顶部重复挤字。 */
export function hudEventText(statusText: string): string {
    return statusText.replace(/\s*·\s*(?:剩余)?金币\s*\d+\s*$/, '');
}

/** 塔属性留在单行事件槽；撤销限制与升级操作分别由帮助行和按钮承载。 */
export function towerInspectionSummary(baseTower: TowerArchetype, level: number): string {
    const tower = towerAtLevel(baseTower, level);
    return tower.effect
        ? `${tower.label} Lv${level} · ${tower.rangeCells}格 · 范围减速${Math.round((1 - tower.effect.speedMultiplier) * 100)}%`
        : `${tower.label} Lv${level} · ${tower.rangeCells}格 · 伤害${tower.damage}`;
}

/** 选塔说明始终从实际配置生成，调数值后不能继续显示旧的减速百分比。 */
export function towerSelectionSummary(tower: TowerArchetype): string {
    return tower.effect
        ? `已选${tower.label} · 范围减速${Math.round((1 - tower.effect.speedMultiplier) * 100)}% · ${tower.effect.durationSeconds}秒`
        : `已选${tower.label} · 稳定单体输出`;
}

/** 升级提示对应真实定位；冷凝升级主要买到群控强度，不应沿用机枪的火力文案。 */
export function towerUpgradeSuccessText(towerId: TowerId, level: number): string {
    return towerId === 'frost-coil'
        ? `冷凝塔升至 Lv${level} · 范围减速增强`
        : `机枪塔升至 Lv${level} · 火力与射程提升`;
}

export type WaveClearTone = 'clean' | 'damaged' | 'critical';

/** 清场不等于零损；只根据本波漏怪和当前核心余量分级，不拿累计漏怪误报当前波次。 */
export function waveClearTone(leakedThisWave: number, coreHealth: number): WaveClearTone {
    if (leakedThisWave <= 0) return 'clean';
    return coreHealth <= 3 ? 'critical' : 'damaged';
}

/** 击杀金币已逐只入账；带损局优先报告危险和总回款，避免窄屏事件行截掉漏怪。 */
export function waveClearIncomeText(wave: number, killGold: number, clearGold: number, leakedThisWave = 0, coreHealth = 10): string {
    const totalGold = killGold + clearGold;
    const tone = waveClearTone(leakedThisWave, coreHealth);
    if (tone !== 'clean') return `第 ${wave} 波${tone === 'critical' ? '险守' : '有损守住'} · 漏 ${leakedThisWave} · 回款 +${totalGold}`;
    return `第 ${wave} 波守住 · 本波 +${totalGold}（清场 +${clearGold}）`;
}
