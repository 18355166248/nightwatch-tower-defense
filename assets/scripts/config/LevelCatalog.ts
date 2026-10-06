import { DEFAULT_GRID_ID } from './PhaseAGrids';
import { FIRST_LEVEL_STARTING_GOLD } from './FirstLevelOpening';
import { CLOCKWORK_RUNNER, IRON_CANISTER_HAULER, FIRST_LEVEL_WAVE_BLUEPRINTS, PHASE_B_WAVES, type WaveDefinition } from './PhaseBCombatConfig';
import type { GridId } from '../core/GridTypes';

export type LevelId = 'first-level' | 'second-level';
export interface LevelDefinition {
    readonly id: LevelId;
    readonly label: string;
    readonly title: string;
    readonly gridId: GridId;
    readonly startingGold: number;
    readonly waves: readonly WaveDefinition[];
    readonly nextLevel?: LevelId;
}

// 第二关提前混编并加强后段，保留基础奖励；多20起始金币给熟练玩家选择构筑，避免一漏怪就错过首个补塔预算。
const secondWaves: readonly WaveDefinition[] = FIRST_LEVEL_WAVE_BLUEPRINTS.map(wave => ({ ...wave,
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

/** 关卡只提供独立配置，共用建塔、寻路和战斗事务；首关数值保持原样。 */
export const LEVELS: Readonly<Record<LevelId, LevelDefinition>> = {
    'first-level': { id: 'first-level', label: '第一关', title: '新手关 · 夜城广场', gridId: DEFAULT_GRID_ID,
        startingGold: FIRST_LEVEL_STARTING_GOLD, waves: PHASE_B_WAVES, nextLevel: 'second-level' },
    'second-level': { id: 'second-level', label: '第二关', title: '高压防守', gridId: DEFAULT_GRID_ID,
        startingGold: 160, waves: secondWaves },
};
