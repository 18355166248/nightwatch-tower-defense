import {
    FIRST_LEVEL_OPENING,
    FIRST_LEVEL_REINFORCEMENTS,
    FIRST_LEVEL_SUGGESTED_PATH_DELTA,
    FIRST_LEVEL_SUGGESTED_TOWER_COUNT,
} from '../config/FirstLevelOpening';
import type { TowerId } from '../config/PhaseBCombatConfig';
import { FROST_COIL, RIVET_GUN } from '../config/PhaseBCombatConfig';
import type { GridCell } from '../core/GridTypes';
import { cellKey } from '../core/GridTypes';
import type { BattlePhase } from '../systems/BattleStateMachine';
import { nextGuidedUpgrade } from './FirstLevelUpgradeCoach';

export type FirstLevelEntryMode = 'home' | 'guided' | 'free';
export type FirstLevelCoachStep = 'select' | 'place' | 'shape' | 'route' | 'ready' | 'reinforce' | 'upgrade' | 'combat';

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
    readonly towerLevelsByCell: ReadonlyMap<string, number>;
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

    public returnHome(): void {
        this.mode = 'home';
    }

    /** 教学模式波间等待玩家主动继续；自由模式仍按原倒计时自动推进。 */
    public shouldHoldIntermission(wave: number, totalWaves: number): boolean {
        return this.mode === 'guided' && wave >= 1 && wave < totalWaves;
    }

    public snapshot(context: FirstLevelCoachContext): FirstLevelExperienceSnapshot {
        if (this.mode !== 'guided') return { mode: this.mode, step: null, guidanceText: null };
        if (!context.preparing) {
            if (context.phase === 'countdown' || context.guidedIntermissionHeld) {
                const upgrade = context.guidedIntermissionHeld ? nextGuidedUpgrade(context) : null;
                if (upgrade) {
                    return { mode: this.mode, step: 'upgrade', guidanceText: upgrade.guidanceText, suggestedCell: upgrade.cell };
                }
                const next = FIRST_LEVEL_REINFORCEMENTS.find(({ afterWave, cell }) =>
                    afterWave <= context.wave && !context.occupiedCells.has(cellKey(cell)));
                if (!next) {
                    const hasFuturePlan = FIRST_LEVEL_REINFORCEMENTS.some(({ cell }) => !context.occupiedCells.has(cellKey(cell)));
                    return context.guidedIntermissionHeld
                        ? { mode: this.mode, step: 'ready', guidanceText: hasFuturePlan
                            ? '本轮布防完成 · 点 ▶ 开下一波'
                            : '推荐完成 · 可自由加固，或点 ▶ 开下一波' }
                        : { mode: this.mode, step: 'combat', guidanceText: '下一波即将到来，留意敌人和核心' };
                }
                const cost = next.towerId === 'frost-coil' ? FROST_COIL.cost : RIVET_GUN.cost;
                if (context.gold < cost) {
                    return context.guidedIntermissionHeld
                        ? { mode: this.mode, step: 'ready', guidanceText: context.gold >= RIVET_GUN.cost
                            ? '暂缺金币买推荐塔 · 可自由补塔或点 ▶ 开下一波'
                            : '金币不足补塔 · 点 ▶ 开下一波' }
                        : { mode: this.mode, step: 'combat', guidanceText: '下一波即将到来，留意敌人和核心' };
                }
                return {
                    mode: this.mode,
                    step: 'reinforce',
                    guidanceText: context.guidedIntermissionHeld
                        ? `第 ${context.wave} 波清场 · ${next.coachHint}，再点 ▶`
                        : `第 ${context.wave} 波结束 · ${next.coachHint}`,
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
                    ? `推荐布防 ${ordinal}/${FIRST_LEVEL_SUGGESTED_TOWER_COUNT} · 绿色可建\n再点同一格确认`
                    : `推荐布防 ${ordinal}/${FIRST_LEVEL_SUGGESTED_TOWER_COUNT} · 红色不可建\n换一个格子`,
            };
        }
        const nextOpening = FIRST_LEVEL_OPENING.find(({ cell }) => !context.occupiedCells.has(cellKey(cell)));
        if (context.towerCount === 0) {
            return context.inputMode === 'idle'
                ? { mode: this.mode, step: 'select', guidanceText: `推荐布防 1/${FIRST_LEVEL_SUGGESTED_TOWER_COUNT} · 点机枪塔\n照高亮格摆出第一座`, suggestedCell: nextOpening?.cell, suggestedTowerId: 'rivet-gun' }
                : { mode: this.mode, step: 'place', guidanceText: `推荐布防 1/${FIRST_LEVEL_SUGGESTED_TOWER_COUNT} · 已选机枪\n拖到高亮格，或点两次确认`, suggestedCell: nextOpening?.cell };
        }
        if (context.towerCount < FIRST_LEVEL_SUGGESTED_TOWER_COUNT) {
            const recommendedTower: TowerId = context.towerCount === 1 ? 'frost-coil' : 'rivet-gun';
            const cost = recommendedTower === 'frost-coil' ? FROST_COIL.cost : RIVET_GUN.cost;
            if (context.gold < cost) {
                return { mode: this.mode, step: 'route', guidanceText: '金币不足以补齐横墙\n点已建塔全额撤销后调整' };
            }
            if (context.inputMode !== 'idle') {
                return { mode: this.mode, step: 'place', guidanceText: `推荐布防 ${context.towerCount + 1}/${FIRST_LEVEL_SUGGESTED_TOWER_COUNT} · 已选炮塔\n点高亮格预览，再点确认`, suggestedCell: nextOpening?.cell };
            }
            return {
                mode: this.mode,
                step: 'shape',
                guidanceText: context.towerCount === 1
                    ? `推荐布防 2/${FIRST_LEVEL_SUGGESTED_TOWER_COUNT} · 选冷凝塔\n贴着上一塔横向补塔`
                    : `推荐布防 ${context.towerCount + 1}/${FIRST_LEVEL_SUGGESTED_TOWER_COUNT} · 选机枪塔\n继续横向补齐墙`,
                suggestedCell: nextOpening?.cell,
                suggestedTowerId: recommendedTower,
            };
        }
        if (context.pathDelta < FIRST_LEVEL_SUGGESTED_PATH_DELTA) {
            const openingCells = new Set(FIRST_LEVEL_OPENING.map(({ cell }) => cellKey(cell)));
            const misplacedKey = Array.from(context.occupiedCells).sort().find((key) => !openingCells.has(key));
            const misplacedCell = misplacedKey ? this.cellFromKey(misplacedKey) : undefined;
            // 偏位塔可在准备态全额撤销；只给出一座确定的恢复目标，不替玩家自动改阵。
            return { mode: this.mode, step: 'route',
                guidanceText: `路线还差 ${FIRST_LEVEL_SUGGESTED_PATH_DELTA - context.pathDelta} 格\n${misplacedCell ? '点高亮塔两次撤销，再按提示重建' : '点已建塔两次撤销，换位挡住直路'}`,
                suggestedCell: misplacedCell };
        }
        return { mode: this.mode, step: 'ready', guidanceText: `推荐布防 ${FIRST_LEVEL_SUGGESTED_TOWER_COUNT}/${FIRST_LEVEL_SUGGESTED_TOWER_COUNT} · 绕路 +${context.pathDelta} 格\n点 ▶ 开始第一波` };
    }

    private cellFromKey(key: string): GridCell {
        const [column, row] = key.split(',').map(Number);
        return { column, row };
    }
}
