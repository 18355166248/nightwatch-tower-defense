export interface EnemyArchetype {
    readonly id: 'clockwork-infantry';
    readonly maxHealth: number;
    readonly speedCellsPerSecond: number;
    readonly killReward: number;
}

export interface TowerArchetype {
    readonly id: 'rivet-gun';
    readonly rangeCells: number;
    readonly damage: number;
    readonly attackIntervalSeconds: number;
}

export interface WaveGroup {
    readonly enemy: EnemyArchetype;
    readonly count: number;
    readonly spawnIntervalSeconds: number;
}

export interface WaveDefinition {
    readonly wave: number;
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
    rangeCells: 2.6,
    damage: 7,
    attackIntervalSeconds: 0.35,
};

export const PHASE_B_WAVES: readonly WaveDefinition[] = [
    { wave: 1, groups: [{ enemy: CLOCKWORK_INFANTRY, count: 8, spawnIntervalSeconds: 0.6 }] },
    { wave: 2, groups: [{ enemy: CLOCKWORK_INFANTRY, count: 8, spawnIntervalSeconds: 0.58 }] },
    { wave: 3, groups: [{ enemy: CLOCKWORK_INFANTRY, count: 10, spawnIntervalSeconds: 0.56 }] },
    { wave: 4, groups: [{ enemy: CLOCKWORK_INFANTRY, count: 10, spawnIntervalSeconds: 0.54 }] },
    { wave: 5, groups: [{ enemy: CLOCKWORK_INFANTRY, count: 12, spawnIntervalSeconds: 0.52 }] },
    { wave: 6, groups: [{ enemy: CLOCKWORK_INFANTRY, count: 12, spawnIntervalSeconds: 0.5 }] },
    { wave: 7, groups: [{ enemy: CLOCKWORK_INFANTRY, count: 14, spawnIntervalSeconds: 0.48 }] },
    { wave: 8, groups: [{ enemy: CLOCKWORK_INFANTRY, count: 16, spawnIntervalSeconds: 0.46 }] },
];

export const PHASE_B_WAVE_ONE = PHASE_B_WAVES[0];
