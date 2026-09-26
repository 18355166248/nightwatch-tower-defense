import {
    FIRST_LEVEL_OPENING,
    FIRST_LEVEL_REINFORCEMENTS,
    FIRST_LEVEL_SUGGESTED_PATH_DELTA,
    FIRST_LEVEL_SUGGESTED_TOWER_COUNT,
} from '../config/FirstLevelOpening';
import type { TowerId } from '../config/PhaseBCombatConfig';
import type { GridCell } from '../core/GridTypes';
import { cellKey } from '../core/GridTypes';
import type { BattlePhase } from '../systems/BattleStateMachine';

export type FirstLevelEntryMode = 'home' | 'guided' | 'free';
export type FirstLevelCoachStep = 'select' | 'place' | 'shape' | 'route' | 'ready' | 'reinforce' | 'combat';

export interface FirstLevelCoachContext {
    readonly preparing: boolean;
    readonly towerCount: number;
    readonly pathDelta: number;
    readonly previewAccepted: boolean | null;
    readonly inputMode: string;
    readonly gold: number;
    readonly phase: BattlePhase;
    readonly wave: number;
    readonly occupiedCells: ReadonlySet<string>;
    readonly guidedIntermissionHeld: boolean;
}

export interface FirstLevelExperienceSnapshot {
    readonly mode: FirstLevelEntryMode;
    readonly step: FirstLevelCoachStep | null;
    readonly guidanceText: string | null;
    readonly suggestedCell?: GridCell;
    readonly suggestedTowerId?: TowerId;
}

export const FIRST_LEVEL_START_BUTTON = { left: -340, right: 340, bottom: -345, top: -195 } as const;
export const FIRST_LEVEL_SKIP_INTRO_BUTTON = { left: -220, right: 220, bottom: -455, top: -365 } as const;
export const FIRST_LEVEL_SKIP_COACH_BUTTON = { left: 295, right: 455, bottom: 620, top: 695 } as const;

/** 入场与教学是独立的展示状态，不替代布塔门禁或战斗状态机。 */
export class FirstLevelExperience {
    private mode: FirstLevelEntryMode;

    public constructor(qaMode: boolean) {
        this.mode = qaMode ? 'free' : 'home';
    }

    public get entryMode(): FirstLevelEntryMode {
        return this.mode;
    }

    public begin(): void {
        if (this.mode === 'home') this.mode = 'guided';
    }

    public skip(): void {
        this.mode = 'free';
    }

    /** 教学模式波间等待玩家主动继续；自由模式仍按原倒计时自动推进。 */
    public shouldHoldIntermission(wave: number, totalWaves: number): boolean {
        return this.mode === 'guided' && wave >= 1 && wave < totalWaves;
    }

    public snapshot(context: FirstLevelCoachContext): FirstLevelExperienceSnapshot {
        if (this.mode !== 'guided') return { mode: this.mode, step: null, guidanceText: null };
        if (!context.preparing) {
            if (context.phase === 'countdown' || context.guidedIntermissionHeld) {
                const next = FIRST_LEVEL_REINFORCEMENTS.find(({ cell }) => !context.occupiedCells.has(cellKey(cell)));
                if (!next) {
                    return context.guidedIntermissionHeld
                        ? { mode: this.mode, step: 'ready', guidanceText: '推荐完成 · 下排可补机枪，或点 ▶ 开下一波' }
                        : { mode: this.mode, step: 'combat', guidanceText: '下一波即将到来，留意敌人和核心' };
                }
                const cost = next.towerId === 'frost-coil' ? 40 : 30;
                if (context.gold < cost) {
                    return context.guidedIntermissionHeld
                        ? { mode: this.mode, step: 'ready', guidanceText: context.gold >= 30
                            ? '暂缺金币买推荐塔 · 可自由补塔或点 ▶ 开下一波'
                            : '金币不足补塔 · 点 ▶ 开下一波' }
                        : { mode: this.mode, step: 'combat', guidanceText: '下一波即将到来，留意敌人和核心' };
                }
                const towerLabel = next.towerId === 'frost-coil' ? '冷凝' : '机枪';
                return {
                    mode: this.mode,
                    step: 'reinforce',
                    guidanceText: context.guidedIntermissionHeld
                        ? `第 ${context.wave} 波清场 · 点${towerLabel}补塔，再点 ▶ 开下一波`
                        : `第 ${context.wave} 波结束 · 用回款补${towerLabel}塔`,
                    suggestedCell: next.cell,
                    suggestedTowerId: next.towerId,
                };
            }
            return { mode: this.mode, step: 'combat', guidanceText: '战斗中也能补塔改路；注意漏怪会损失核心' };
        }
        if (context.previewAccepted !== null) {
            const ordinal = Math.min(context.towerCount + 1, FIRST_LEVEL_SUGGESTED_TOWER_COUNT);
            return {
                mode: this.mode,
                step: 'place',
                guidanceText: context.previewAccepted
                    ? `第 ${ordinal} 步 · 绿色可建造，再点同一格确认`
                    : `第 ${ordinal} 步 · 红色不能建造，换一个格子`,
            };
        }
        const nextOpening = FIRST_LEVEL_OPENING.find(({ cell }) => !context.occupiedCells.has(cellKey(cell)));
        if (context.towerCount === 0) {
            return context.inputMode === 'idle'
                ? { mode: this.mode, step: 'select', guidanceText: '第 1 步 · 点机枪塔，参考高亮格开始横向布防', suggestedCell: nextOpening?.cell, suggestedTowerId: 'rivet-gun' }
                : { mode: this.mode, step: 'place', guidanceText: '第 1 步 · 拖到格子落塔，或点格子预览', suggestedCell: nextOpening?.cell };
        }
        if (context.towerCount < FIRST_LEVEL_SUGGESTED_TOWER_COUNT) {
            const recommendedTower: TowerId = context.towerCount === 1 ? 'frost-coil' : 'rivet-gun';
            const cost = recommendedTower === 'frost-coil' ? 40 : 30;
            if (context.gold < cost) {
                return { mode: this.mode, step: 'route', guidanceText: '金币不够补齐横墙；准备时点已建塔可全额撤销调整' };
            }
            if (context.inputMode !== 'idle') {
                return { mode: this.mode, step: 'place', guidanceText: `第 ${context.towerCount + 1} 步 · 点高亮格预览，确认后建造`, suggestedCell: nextOpening?.cell };
            }
            return {
                mode: this.mode,
                step: 'shape',
                guidanceText: context.towerCount === 1
                    ? '第 2 步 · 选冷凝塔，沿入口下方横着补塔'
                    : `第 3 步 · 再点机枪塔，组成 4 塔横墙（${context.towerCount}/4）`,
                suggestedCell: nextOpening?.cell,
                suggestedTowerId: recommendedTower,
            };
        }
        if (context.pathDelta < FIRST_LEVEL_SUGGESTED_PATH_DELTA) {
            return { mode: this.mode, step: 'route', guidanceText: `第 3 步 · 路线还差 ${FIRST_LEVEL_SUGGESTED_PATH_DELTA - context.pathDelta} 格；调整横墙，点塔可撤销` };
        }
        return { mode: this.mode, step: 'ready', guidanceText: '第 4 步 · 横墙已成，点 ▶ 开始第一波' };
    }
}
