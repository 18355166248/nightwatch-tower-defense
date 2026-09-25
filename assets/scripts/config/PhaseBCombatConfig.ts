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
    readonly effect?: SlowEffect;
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
};

export const FROST_COIL: TowerArchetype = {
    id: 'frost-coil',
    label: '冷凝塔',
    cost: 40,
    rangeCells: 3,
    damage: 4,
    attackIntervalSeconds: 0.65,
    effect: { kind: 'slow', speedMultiplier: 0.55, durationSeconds: 1.2 },
};

export const PHASE_B_TOWERS: readonly TowerArchetype[] = [RIVET_GUN, FROST_COIL];

export const PHASE_B_WAVES: readonly WaveDefinition[] = [
    // 前两波只教部署与回款；推荐开局恰好守住 6 只，击杀收入与旧 8 只波次相同。
    { wave: 1, clearReward: 20, groups: [{ enemy: CLOCKWORK_INFANTRY, count: 6, spawnIntervalSeconds: 0.6 }] },
    { wave: 2, clearReward: 18, groups: [{ enemy: CLOCKWORK_INFANTRY, count: 6, spawnIntervalSeconds: 0.58 }] },
    // 第三波首次在步兵后放出少量疾行机；此后逐渐加量，开始考验改路和减速。
    { wave: 3, clearReward: 22, groups: [{ enemy: CLOCKWORK_INFANTRY, count: 8, spawnIntervalSeconds: 0.56 }, { enemy: CLOCKWORK_RUNNER, count: 2, spawnIntervalSeconds: 0.58 }] },
    { wave: 4, clearReward: 20, groups: [{ enemy: CLOCKWORK_INFANTRY, count: 6, spawnIntervalSeconds: 0.54 }, { enemy: CLOCKWORK_RUNNER, count: 4, spawnIntervalSeconds: 0.56 }] },
    { wave: 5, clearReward: 24, groups: [{ enemy: CLOCKWORK_INFANTRY, count: 8, spawnIntervalSeconds: 0.52 }, { enemy: CLOCKWORK_RUNNER, count: 4, spawnIntervalSeconds: 0.54 }] },
    { wave: 6, clearReward: 24, groups: [{ enemy: CLOCKWORK_INFANTRY, count: 7, spawnIntervalSeconds: 0.5 }, { enemy: CLOCKWORK_RUNNER, count: 5, spawnIntervalSeconds: 0.52 }] },
    { wave: 7, clearReward: 28, groups: [{ enemy: CLOCKWORK_INFANTRY, count: 8, spawnIntervalSeconds: 0.48 }, { enemy: CLOCKWORK_RUNNER, count: 6, spawnIntervalSeconds: 0.5 }] },
    { wave: 8, clearReward: 40, groups: [{ enemy: CLOCKWORK_INFANTRY, count: 8, spawnIntervalSeconds: 0.46 }, { enemy: CLOCKWORK_RUNNER, count: 8, spawnIntervalSeconds: 0.48 }] },
];

export const PHASE_B_WAVE_ONE = PHASE_B_WAVES[0];
