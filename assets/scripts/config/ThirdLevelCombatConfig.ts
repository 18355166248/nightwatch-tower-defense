import { CLOCKWORK_INFANTRY, CLOCKWORK_RUNNER, IRON_CANISTER_HAULER, PHASE_B_TOWERS,
    type EnemyArchetype, type TowerArchetype, type WaveDefinition } from './PhaseBCombatConfig';

export const SIEGE_TANK: EnemyArchetype = { id: 'siege-tank', label: '护甲坦克',
    maxHealth: 580, armorReduction: 0.65, speedCellsPerSecond: 0.48, killReward: 8 };
export const SHIELD_GUARD: EnemyArchetype = { id: 'shield-guard', label: '护盾兵',
    maxHealth: 150, maxShield: 160, speedCellsPerSecond: 1.15, killReward: 5 };
export const PIERCING_CANNON: TowerArchetype = { id: 'piercing-cannon', label: '穿甲炮',
    cost: 60, rangeCells: 3.2, damage: 48, attackIntervalSeconds: 1.35,
    targetPriority: 'armored', armorIgnore: 0.9, shieldDamageMultiplier: 0.6,
    upgrade: { cost: 45, rangeCells: 3.4, damage: 75, attackIntervalSeconds: 1.25 },
    finalUpgrade: { cost: 75, rangeCells: 3.7, damage: 110, attackIntervalSeconds: 1.12 } };
export const ARC_TOWER: TowerArchetype = { id: 'arc-tower', label: '电弧塔',
    cost: 65, rangeCells: 3, damage: 14, attackIntervalSeconds: 0.65,
    targetPriority: 'shielded', shieldDamageMultiplier: 2.5,
    upgrade: { cost: 45, rangeCells: 3.3, damage: 20, attackIntervalSeconds: 0.6 },
    finalUpgrade: { cost: 70, rangeCells: 3.6, damage: 28, attackIntervalSeconds: 0.55 } };

// 旧关卡仍消费双塔目录，完整目录仅供配塔与第三关；不能让新增塔改变教学回放。
export const ALL_TOWERS: readonly TowerArchetype[] = [...PHASE_B_TOWERS, PIERCING_CANNON, ARC_TOWER];
export const THIRD_LEVEL_STARTING_GOLD = 200;
export const THIRD_LEVEL_CORE_HEALTH = 10;
const infantry = { ...CLOCKWORK_INFANTRY, maxHealth: 100, speedCellsPerSecond: 1.15 };
const runner = { ...CLOCKWORK_RUNNER, maxHealth: 100, speedCellsPerSecond: 1.85 };
const hauler = { ...IRON_CANISTER_HAULER, maxHealth: 420, speedCellsPerSecond: 0.8 };
const group = (enemy: EnemyArchetype, count: number, interval: number) => ({ enemy, count, spawnIntervalSeconds: interval });

/** 每关独立复制波表，避免第三关调参污染前两关共享原型。 */
export const THIRD_LEVEL_WAVE_BLUEPRINTS: readonly WaveDefinition[] = [
    { wave: 1, clearReward: 12, groups: [group(infantry, 9, 0.65), group(SIEGE_TANK, 2, 1.4)] },
    { wave: 2, clearReward: 14, groups: [group(infantry, 8, 0.65), group(SHIELD_GUARD, 6, 0.9)] },
    { wave: 3, clearReward: 18, groups: [group(infantry, 6, 0.65), group(runner, 8, 0.55), group(SIEGE_TANK, 3, 1.4)] },
    { wave: 4, clearReward: 22, groups: [group(SHIELD_GUARD, 8, 0.9), group(hauler, 4, 1)] },
    { wave: 5, clearReward: 24, groups: [group(SIEGE_TANK, 6, 1.4), group(SHIELD_GUARD, 6, 0.9)] },
    { wave: 6, clearReward: 26, groups: [group(infantry, 14, 0.65), group(runner, 12, 0.55), group(SHIELD_GUARD, 10, 0.9), group(SIEGE_TANK, 6, 1.4)] },
    { wave: 7, clearReward: 28, groups: [group(hauler, 10, 1), group(runner, 18, 0.55), group(SIEGE_TANK, 8, 1.4), group(SHIELD_GUARD, 8, 0.9)] },
    { wave: 8, clearReward: 36, groups: [group(infantry, 18, 0.65), group(runner, 20, 0.55), group(SHIELD_GUARD, 14, 0.9), group(SIEGE_TANK, 10, 1.4)] },
];

// 前三波给克制阵容成型留出容错，后五波及奖励保持原强度；独立复制避免污染图鉴原型和前两关。
export const THIRD_LEVEL_WAVES: readonly WaveDefinition[] = THIRD_LEVEL_WAVE_BLUEPRINTS.map(wave => ({
    ...wave, groups: wave.groups.map(item => ({ ...item,
        enemy: { ...item.enemy, maxHealth: wave.wave <= 3 ? Math.round(item.enemy.maxHealth * 0.92) : item.enemy.maxHealth },
        spawnIntervalSeconds: item.spawnIntervalSeconds * (wave.wave >= 6 ? 0.8 : wave.wave >= 4 ? 0.9 : 1),
    })),
}));
