import { DEFAULT_GRID_ID } from './PhaseAGrids';
import { FIRST_LEVEL_STARTING_GOLD } from './FirstLevelOpening';
import { CLOCKWORK_RUNNER, IRON_CANISTER_HAULER, FIRST_LEVEL_WAVE_BLUEPRINTS, PHASE_B_WAVES, type WaveDefinition } from './PhaseBCombatConfig';
import type { GridId } from '../core/GridTypes';

export type LevelId = keyof typeof LEVEL_DATA;
export interface LevelDefinition {
    readonly id: LevelId;
    readonly label: string;
    readonly title: string;
    readonly gridId: GridId;
    readonly startingGold: number;
    readonly waves: readonly WaveDefinition[];
    readonly nextLevel?: LevelId;
    readonly campaign: { readonly district: string; readonly briefing: string; readonly difficulty: string; readonly guided: boolean };
}

// 第二关提前混编并加强后段，保留基础奖励；多20起始金币给熟练玩家选择构筑，避免一漏怪就错过首个补塔预算。
export const SECOND_LEVEL_BASE_WAVES: readonly WaveDefinition[] = FIRST_LEVEL_WAVE_BLUEPRINTS.map(wave => ({ ...wave,
    groups: wave.wave === 2 ? [
        { enemy: { ...wave.groups[0].enemy, maxHealth: 94, speedCellsPerSecond: 1.05 }, count: 7, spawnIntervalSeconds: 0.5525 },
        { enemy: { ...CLOCKWORK_RUNNER, maxHealth: 94, speedCellsPerSecond: 1.7 }, count: 3, spawnIntervalSeconds: 0.55 },
    ] : wave.wave === 4 ? [
        { ...wave.groups[0], count: 4, enemy: { ...wave.groups[0].enemy, maxHealth: 94, speedCellsPerSecond: 1.05 }, spawnIntervalSeconds: 0.459 },
        { ...wave.groups[1], enemy: { ...CLOCKWORK_RUNNER, maxHealth: 94, speedCellsPerSecond: 1.68 }, spawnIntervalSeconds: 0.476 },
        { enemy: { ...IRON_CANISTER_HAULER, maxHealth: 384, speedCellsPerSecond: 0.68 }, count: 2, spawnIntervalSeconds: 0.8 },
    ] : wave.groups.map(group => ({ ...group,
        spawnIntervalSeconds: group.spawnIntervalSeconds * (wave.wave >= 6 ? 0.65 : 0.85),
        enemy: { ...group.enemy,
            maxHealth: Math.round(group.enemy.maxHealth * (wave.wave >= 6 ? 1.5 : wave.wave === 5 ? 1.2 : 1.1)),
            speedCellsPerSecond: group.enemy.speedCellsPerSecond * (wave.wave >= 6 ? 1.6 : 1.05),
        },
    })),
}));

// 第二关前五波也提高生命、移速和出怪密度，促使玩家更早补塔与升级；末三波保留已加强的强度。
// 赏金不提高，避免更强的敌人反而送来升级红利。
const secondWaves: readonly WaveDefinition[] = SECOND_LEVEL_BASE_WAVES.map(wave => ({ ...wave,
    groups: wave.groups.map(group => ({ ...group,
        spawnIntervalSeconds: group.spawnIntervalSeconds * (wave.wave >= 6 ? 0.7 : wave.wave >= 3 ? 0.75 : 1) * (wave.wave <= 5 ? 0.9 : 1),
        enemy: { ...group.enemy,
            maxHealth: Math.round(group.enemy.maxHealth * (wave.wave >= 6 ? 1.29 : wave.wave >= 4 ? 1.15 : wave.wave === 3 ? 1.1 : 1) * (wave.wave <= 5 ? 1.06 : 1)),
            speedCellsPerSecond: group.enemy.speedCellsPerSecond * (wave.wave >= 4 ? 1.15 : 1) * (wave.wave <= 5 ? 1.03 : 1),
        },
    })),
}));

/** 关卡只提供独立配置，共用建塔、寻路和战斗事务；首关数值保持原样。 */
const LEVEL_DATA = {
    'first-level': { id: 'first-level' as const, label: '第一关', title: '新手关 · 夜城广场', gridId: DEFAULT_GRID_ID,
        startingGold: FIRST_LEVEL_STARTING_GOLD, waves: PHASE_B_WAVES, nextLevel: 'second-level' as const,
        campaign: { district: '夜城广场', briefing: '在广场建立第一道防线，学习布塔、改路与升级。', difficulty: '新手教学', guided: true } },
    'second-level': { id: 'second-level' as const, label: '第二关', title: '高压防守', gridId: DEFAULT_GRID_ID,
        startingGold: 160, waves: secondWaves,
        campaign: { district: '铸铁街巷', briefing: '快行者与重装混编来袭，提前升级，守住街巷。', difficulty: '高压挑战', guided: false } },
};

export const LEVELS: Readonly<Record<LevelId, LevelDefinition>> = LEVEL_DATA;
