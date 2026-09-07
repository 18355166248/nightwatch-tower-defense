export interface EnemyArchetype {
    readonly id: 'clockwork-infantry';
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
    maxHealth: 85,
    speedCellsPerSecond: 1,
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
    { wave: 1, clearReward: 20, groups: [{ enemy: CLOCKWORK_INFANTRY, count: 8, spawnIntervalSeconds: 0.6 }] },
    { wave: 2, clearReward: 18, groups: [{ enemy: CLOCKWORK_INFANTRY, count: 8, spawnIntervalSeconds: 0.58 }] },
    { wave: 3, clearReward: 22, groups: [{ enemy: CLOCKWORK_INFANTRY, count: 10, spawnIntervalSeconds: 0.56 }] },
    { wave: 4, clearReward: 20, groups: [{ enemy: CLOCKWORK_INFANTRY, count: 10, spawnIntervalSeconds: 0.54 }] },
    { wave: 5, clearReward: 24, groups: [{ enemy: CLOCKWORK_INFANTRY, count: 12, spawnIntervalSeconds: 0.52 }] },
    { wave: 6, clearReward: 24, groups: [{ enemy: CLOCKWORK_INFANTRY, count: 12, spawnIntervalSeconds: 0.5 }] },
    { wave: 7, clearReward: 28, groups: [{ enemy: CLOCKWORK_INFANTRY, count: 14, spawnIntervalSeconds: 0.48 }] },
    { wave: 8, clearReward: 40, groups: [{ enemy: CLOCKWORK_INFANTRY, count: 16, spawnIntervalSeconds: 0.46 }] },
];

export const PHASE_B_WAVE_ONE = PHASE_B_WAVES[0];
