export interface EnemyArchetype {
    readonly id: 'clockwork-infantry' | 'clockwork-runner';
    readonly label: string;
    readonly maxHealth: number;
    readonly speedCellsPerSecond: number;
    readonly killReward: number;
}

export type TowerId = 'rivet-gun' | 'frost-coil';

export interface SlowEffect {
    readonly kind: 'slow';
    readonly speedMultiplier: number;
    readonly durationSeconds: number;
}

export interface TowerArchetype {
    readonly id: TowerId;
    readonly label: string;
    readonly cost: number;
    readonly rangeCells: number;
    readonly damage: number;
    readonly attackIntervalSeconds: number;
    readonly targetPriority?: 'nearest-exit' | 'fast-uncontrolled';
    readonly effect?: SlowEffect;
    readonly upgrade?: {
        readonly cost: number;
        readonly rangeCells: number;
        readonly damage: number;
        readonly attackIntervalSeconds: number;
        readonly effect?: SlowEffect;
    };
}

export interface WaveGroup {
    readonly enemy: EnemyArchetype;
    readonly count: number;
    readonly spawnIntervalSeconds: number;
}

export interface WaveDefinition {
    readonly wave: number;
    readonly clearReward: number;
    readonly groups: readonly WaveGroup[];
}

export const CLOCKWORK_INFANTRY: EnemyArchetype = {
    id: 'clockwork-infantry',
    label: '发条步兵',
    maxHealth: 85,
    speedCellsPerSecond: 1,
    killReward: 4,
};

/** 疾行机血量与步兵相同但移动快 60%；冷凝降速后低于步兵速度，形成明确应对。 */
export const CLOCKWORK_RUNNER: EnemyArchetype = {
    id: 'clockwork-runner',
    label: '疾行机',
    maxHealth: 85,
    speedCellsPerSecond: 1.6,
    killReward: 4,
};

export const RIVET_GUN: TowerArchetype = {
    id: 'rivet-gun',
    label: '机枪塔',
    cost: 30,
    rangeCells: 2.6,
    damage: 7,
    attackIntervalSeconds: 0.35,
    upgrade: { cost: 24, rangeCells: 2.8, damage: 11, attackIntervalSeconds: 0.31 },
};

export const FROST_COIL: TowerArchetype = {
    id: 'frost-coil',
    label: '冷凝塔',
    cost: 40,
    rangeCells: 3,
    damage: 4,
    attackIntervalSeconds: 0.6,
    targetPriority: 'fast-uncontrolled',
    effect: { kind: 'slow', speedMultiplier: 0.55, durationSeconds: 1.2 },
    upgrade: { cost: 32, rangeCells: 3.2, damage: 5, attackIntervalSeconds: 0.55, effect: { kind: 'slow', speedMultiplier: 0.5, durationSeconds: 1.5 } },
};

export const PHASE_B_TOWERS: readonly TowerArchetype[] = [RIVET_GUN, FROST_COIL];

export const PHASE_B_WAVES: readonly WaveDefinition[] = [
    // 前三波保持推荐构筑零漏时的总回款不变：把部分清场金移到更多击杀里，延长有敌人在场的教学段。
    { wave: 1, clearReward: 8, groups: [{ enemy: CLOCKWORK_INFANTRY, count: 9, spawnIntervalSeconds: 0.8 }] },
    { wave: 2, clearReward: 6, groups: [{ enemy: CLOCKWORK_INFANTRY, count: 9, spawnIntervalSeconds: 0.78 }] },
    // 第三波仍在步兵之后首次放出 2 只疾行机，形成不依赖空等的速度考核。
    { wave: 3, clearReward: 10, groups: [{ enemy: CLOCKWORK_INFANTRY, count: 11, spawnIntervalSeconds: 0.78 }, { enemy: CLOCKWORK_RUNNER, count: 2, spawnIntervalSeconds: 0.78 }] },
    { wave: 4, clearReward: 20, groups: [{ enemy: CLOCKWORK_INFANTRY, count: 6, spawnIntervalSeconds: 0.54 }, { enemy: CLOCKWORK_RUNNER, count: 4, spawnIntervalSeconds: 0.56 }] },
    { wave: 5, clearReward: 24, groups: [{ enemy: CLOCKWORK_INFANTRY, count: 8, spawnIntervalSeconds: 0.52 }, { enemy: CLOCKWORK_RUNNER, count: 4, spawnIntervalSeconds: 0.54 }] },
    { wave: 6, clearReward: 24, groups: [{ enemy: CLOCKWORK_INFANTRY, count: 7, spawnIntervalSeconds: 0.5 }, { enemy: CLOCKWORK_RUNNER, count: 5, spawnIntervalSeconds: 0.52 }] },
    { wave: 7, clearReward: 28, groups: [{ enemy: CLOCKWORK_INFANTRY, count: 8, spawnIntervalSeconds: 0.48 }, { enemy: CLOCKWORK_RUNNER, count: 6, spawnIntervalSeconds: 0.5 }] },
    { wave: 8, clearReward: 40, groups: [{ enemy: CLOCKWORK_INFANTRY, count: 8, spawnIntervalSeconds: 0.46 }, { enemy: CLOCKWORK_RUNNER, count: 8, spawnIntervalSeconds: 0.48 }] },
];

export const PHASE_B_WAVE_ONE = PHASE_B_WAVES[0];
