import {
    FIRST_LEVEL_OPENING,
    FIRST_LEVEL_REINFORCEMENTS,
    FIRST_LEVEL_SUGGESTED_PATH_DELTA,
    FIRST_LEVEL_SUGGESTED_TOWER_COUNT,
} from '../config/FirstLevelOpening';
import type { TowerId } from '../config/PhaseBCombatConfig';
import { FROST_COIL, RIVET_GUN } from '../config/PhaseBCombatConfig';
import type { GridCell } from '../core/GridTypes';
import { cellKey, sameCell } from '../core/GridTypes';
import { FIRST_WAVE_MIN_PATH_DELTA, FIRST_WAVE_MIN_TOWER_COUNT, type BattlePhase } from '../systems/BattleStateMachine';
import { nextGuidedUpgrade } from './FirstLevelUpgradeCoach';
import { waveStartActionText } from './PhaseBHudText';

export type FirstLevelTutorialStatus = 'idle' | 'active' | 'completed' | 'skipped' | 'interrupted';

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
    readonly canStartFirstWave?: boolean;
    readonly readyToFinishTutorial?: boolean;
}

export const FIRST_LEVEL_START_BUTTON = { left: -425, right: 425, bottom: -590, top: -435 } as const;
export const FIRST_LEVEL_SKIP_INTRO_BUTTON = { left: -425, right: 425, bottom: -760, top: -605 } as const;
export const FIRST_LEVEL_HOME_SETTINGS_BUTTON = { left: 295, right: 450, bottom: 670, top: 825 } as const;
export const FIRST_LEVEL_SKIP_COACH_BUTTON = { left: 340, right: 490, bottom: 620, top: 775 } as const;

/** 升级按钮只在玩家选中推荐塔后出现；不能给尚未渲染的按钮画空高亮框。 */
export function shouldOutlineGuidedUpgrade(suggestedCell: GridCell | undefined, inspectedCell: GridCell | null): boolean {
    return Boolean(suggestedCell && inspectedCell && sameCell(suggestedCell, inspectedCell));
}

/** 入场与教学是独立的展示状态，不替代布塔门禁或战斗状态机。 */
export class FirstLevelExperience {
    private mode: FirstLevelEntryMode;
    private tutorialStatus: FirstLevelTutorialStatus = 'idle';

    public constructor(qaMode: boolean) {
        this.mode = qaMode ? 'free' : 'home';
    }

    public get entryMode(): FirstLevelEntryMode {
        return this.mode;
    }

    public begin(): void {
        if (this.mode === 'home') { this.mode = 'guided'; this.tutorialStatus = 'active'; }
    }

    public get status(): FirstLevelTutorialStatus { return this.tutorialStatus; }

    /** 完成与跳过分开记录；退出后不再产生教学高亮或波间等待，重复结束保持幂等。 */
    public finish(reason: 'completed' | 'skipped' | 'interrupted' = 'completed'): void {
        if (this.mode !== 'guided') return;
        this.mode = 'free'; this.tutorialStatus = reason;
    }

    public skip(): void {
        if (this.mode === 'guided') this.finish('skipped');
        else { this.mode = 'free'; this.tutorialStatus = 'skipped'; }
    }

    public returnHome(): void {
        this.tutorialStatus = 'idle';
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
                        ? { mode: this.mode, step: 'ready', readyToFinishTutorial: context.wave === 1, guidanceText: hasFuturePlan
                            ? `本轮布防完成\n${waveStartActionText('next')}`
                            : `推荐完成 · 可自由加固\n或${waveStartActionText('next')}` }
                        : { mode: this.mode, step: 'combat', guidanceText: '下一波即将到来，留意敌人和核心' };
                }
                const cost = next.towerId === 'frost-coil' ? FROST_COIL.cost : RIVET_GUN.cost;
                if (context.gold < cost) {
                    return context.guidedIntermissionHeld
                        ? { mode: this.mode, step: 'ready', readyToFinishTutorial: context.wave === 1, guidanceText: context.gold >= RIVET_GUN.cost
                            ? `暂缺金币 · 可自由补塔\n或${waveStartActionText('next')}`
                            : `金币不足补塔\n${waveStartActionText('next')}` }
                        : { mode: this.mode, step: 'combat', guidanceText: '下一波即将到来，留意敌人和核心' };
                }
                return {
                    mode: this.mode,
                    step: 'reinforce',
                    guidanceText: context.guidedIntermissionHeld
                        ? `${next.coachHint}\n再${waveStartActionText('next')}`
                        : `第 ${context.wave} 波结束 · ${next.coachHint}`,
                    suggestedCell: next.cell,
                    suggestedTowerId: next.towerId,
                };
            }
            return { mode: this.mode, step: 'combat', guidanceText: '战斗中也能补塔改路；注意漏怪会损失核心' };
        }
        const canStartFirstWave = context.towerCount >= FIRST_WAVE_MIN_TOWER_COUNT
            && context.pathDelta >= FIRST_WAVE_MIN_PATH_DELTA;
        const nextOpeningIndex = FIRST_LEVEL_OPENING.findIndex(({ cell }) => !context.occupiedCells.has(cellKey(cell)));
        const nextOpening = FIRST_LEVEL_OPENING[nextOpeningIndex];
        if (context.previewAccepted !== null) {
            const ordinal = Math.max(1, Math.min(nextOpeningIndex + 1, FIRST_LEVEL_SUGGESTED_TOWER_COUNT));
            const guidanceText = context.previewAccepted
                ? canStartFirstWave ? `绿色可建 · 再点确认\n或${waveStartActionText('first')}`
                    : `推荐布防 ${ordinal}/${FIRST_LEVEL_SUGGESTED_TOWER_COUNT} · 绿色可建\n再点同一格确认`
                : canStartFirstWave ? `红色不可建 · 换格预览\n或${waveStartActionText('first')}`
                    : `推荐布防 ${ordinal}/${FIRST_LEVEL_SUGGESTED_TOWER_COUNT} · 红色不可建\n换一个格子`;
            return {
                mode: this.mode,
                step: 'place',
                guidanceText,
                canStartFirstWave,
            };
        }
        const openingCells = new Set(FIRST_LEVEL_OPENING.map(({ cell }) => cellKey(cell)));
        const misplacedKey = Array.from(context.occupiedCells).sort().find((key) => !openingCells.has(key));
        const missingOpeningCost = FIRST_LEVEL_OPENING.reduce((sum, { cell, towerId }) =>
            sum + (context.occupiedCells.has(cellKey(cell)) ? 0 : towerId === 'frost-coil' ? FROST_COIL.cost : RIVET_GUN.cost), 0);
        // 偏位塔已耗掉双段防线预算时先教全额撤销，避免继续提示买塔进入预算死路。
        if (misplacedKey && !canStartFirstWave && context.gold < missingOpeningCost) {
            return { mode: this.mode, step: 'route',
                guidanceText: '偏位塔占用推荐预算\n点高亮塔，再点下方全额撤销',
                suggestedCell: this.cellFromKey(misplacedKey) };
        }
        if (context.towerCount === 0) {
            return context.inputMode === 'idle'
                ? { mode: this.mode, step: 'select', guidanceText: `推荐布防 1/${FIRST_LEVEL_SUGGESTED_TOWER_COUNT} · 点机枪塔\n点上路高亮格，逼敌改道`, suggestedCell: nextOpening?.cell, suggestedTowerId: 'rivet-gun' }
                : { mode: this.mode, step: 'place', guidanceText: `推荐布防 1/${FIRST_LEVEL_SUGGESTED_TOWER_COUNT} · 已选机枪\n点上路高亮格，预览改道`, suggestedCell: nextOpening?.cell };
        }
        if (context.towerCount < FIRST_LEVEL_SUGGESTED_TOWER_COUNT) {
            // 塔种随推荐塔位数据走，调整教学顺序时不会把冷凝提示误绑到机枪位置。
            const recommendedTower: TowerId = nextOpening?.towerId ?? 'rivet-gun';
            const recommendedName = recommendedTower === 'frost-coil' ? '冷凝' : '机枪';
            const cost = recommendedTower === 'frost-coil' ? FROST_COIL.cost : RIVET_GUN.cost;
            const openingStep = nextOpeningIndex + 1;
            if (context.gold < cost) {
                return canStartFirstWave
                    ? { mode: this.mode, step: 'ready', guidanceText: `防线未补齐 · 金币不足\n${waveStartActionText('first')}挑战`, canStartFirstWave }
                    : { mode: this.mode, step: 'route', guidanceText: '金币不足以补齐防线\n点已建塔，再点下方全额撤销' };
            }
            if (context.inputMode !== 'idle') {
                return { mode: this.mode, step: 'place', guidanceText: canStartFirstWave
                    ? `可提前开波 · 建议补塔\n补高亮格，或${waveStartActionText('first')}`
                    : `推荐布防 ${openingStep}/${FIRST_LEVEL_SUGGESTED_TOWER_COUNT} · 已选炮塔\n点高亮格预览，再点确认`,
                    suggestedCell: nextOpening?.cell, canStartFirstWave };
            }
            // 自由偏位后从“第一个尚缺的推荐塔位”恢复，不把累计塔数误当推荐步骤。
            const openingHint = context.towerCount === nextOpeningIndex
                ? nextOpeningIndex === 1 ? '再选机枪\n堵上路右侧高亮格，观察改道'
                    : nextOpeningIndex === 2 ? '选冷凝塔\n守住中段高亮格'
                        : '选机枪塔\n补中段高亮格，延长路线'
                : `选${recommendedName}塔\n照高亮格补齐推荐防线`;
            return {
                mode: this.mode,
                step: 'shape',
                guidanceText: canStartFirstWave
                    ? `${context.towerCount === FIRST_WAVE_MIN_TOWER_COUNT ? '两塔火力薄弱' : '防线未补齐'} · 选${recommendedName}补位\n或${waveStartActionText('first')}挑战`
                    : `推荐布防 ${openingStep}/${FIRST_LEVEL_SUGGESTED_TOWER_COUNT} · ${openingHint}`,
                suggestedCell: nextOpening?.cell,
                suggestedTowerId: recommendedTower,
                canStartFirstWave,
            };
        }
        if (context.pathDelta < FIRST_LEVEL_SUGGESTED_PATH_DELTA) {
            if (canStartFirstWave) {
                return { mode: this.mode, step: 'ready', canStartFirstWave,
                    guidanceText: `绕路 +${context.pathDelta} 格，建议 +${FIRST_LEVEL_SUGGESTED_PATH_DELTA} 格\n或${waveStartActionText('first')}` };
            }
            const misplacedCell = misplacedKey ? this.cellFromKey(misplacedKey) : undefined;
            // 偏位塔可在准备态全额撤销；只给出一座确定的恢复目标，不替玩家自动改阵。
            return { mode: this.mode, step: 'route',
                guidanceText: `开波路线还差 ${FIRST_WAVE_MIN_PATH_DELTA - context.pathDelta} 格\n${misplacedCell ? '点高亮塔，再点下方撤销并重建' : '点已建塔，再点下方撤销换位'}`,
                suggestedCell: misplacedCell };
        }
        return { mode: this.mode, step: 'ready', canStartFirstWave, guidanceText: `推荐布防 ${FIRST_LEVEL_SUGGESTED_TOWER_COUNT}/${FIRST_LEVEL_SUGGESTED_TOWER_COUNT} · 绕路 +${context.pathDelta} 格\n${waveStartActionText('first')}` };
    }

    private cellFromKey(key: string): GridCell {
        const [column, row] = key.split(',').map(Number);
        return { column, row };
    }
}
