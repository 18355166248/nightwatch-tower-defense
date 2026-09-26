export type EnemyId = 'clockwork-infantry' | 'clockwork-runner' | 'iron-canister-hauler';

export interface EnemyArchetype {
    readonly id: EnemyId;
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
    /** 命中点附近的控制半径；伤害仍只结算主目标。 */
    readonly pulseRadiusCells?: number;
}

export interface TowerUpgrade {
    readonly cost: number;
    readonly rangeCells: number;
    readonly damage: number;
    readonly attackIntervalSeconds: number;
    readonly effect?: SlowEffect;
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
    readonly upgrade?: TowerUpgrade;
    readonly finalUpgrade?: TowerUpgrade;
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
    killReward: 2,
};

/** 厚甲血量让冷凝控制与后期升级成为真实选择；高密度波次降低单体赏金，避免金币无上限膨胀。 */
export const IRON_CANISTER_HAULER: EnemyArchetype = {
    id: 'iron-canister-hauler',
    label: '铁罐搬运者',
    maxHealth: 320,
    speedCellsPerSecond: 0.62,
    killReward: 5,
};

export const RIVET_GUN: TowerArchetype = {
    id: 'rivet-gun',
    label: '机枪塔',
    cost: 30,
    rangeCells: 2.6,
    damage: 7,
    attackIntervalSeconds: 0.35,
    upgrade: { cost: 24, rangeCells: 2.8, damage: 11, attackIntervalSeconds: 0.31 },
    finalUpgrade: { cost: 42, rangeCells: 3.2, damage: 18, attackIntervalSeconds: 0.27 },
};

export const FROST_COIL: TowerArchetype = {
    id: 'frost-coil',
    label: '冷凝塔',
    cost: 40,
    rangeCells: 3,
    damage: 4,
    attackIntervalSeconds: 0.6,
    targetPriority: 'fast-uncontrolled',
    effect: { kind: 'slow', speedMultiplier: 0.25, durationSeconds: 1.2, pulseRadiusCells: 1.5 },
    upgrade: { cost: 32, rangeCells: 3.2, damage: 5, attackIntervalSeconds: 0.55, effect: { kind: 'slow', speedMultiplier: 0.18, durationSeconds: 1.5, pulseRadiusCells: 1.7 } },
    finalUpgrade: { cost: 48, rangeCells: 3.5, damage: 8, attackIntervalSeconds: 0.48, effect: { kind: 'slow', speedMultiplier: 0.11, durationSeconds: 1.8, pulseRadiusCells: 1.9 } },
};

export const PHASE_B_TOWERS: readonly TowerArchetype[] = [RIVET_GUN, FROST_COIL];

export const PHASE_B_WAVES: readonly WaveDefinition[] = [
    // 前三波保持推荐构筑零漏时的总回款不变：把部分清场金移到更多击杀里，延长有敌人在场的教学段。
    { wave: 1, clearReward: 8, groups: [{ enemy: CLOCKWORK_INFANTRY, count: 9, spawnIntervalSeconds: 0.8 }] },
    // 第一波后多一座上路机枪；第二、三波压紧生成间隔，保持双敌同屏而不靠空场等待拖时长。
    { wave: 2, clearReward: 6, groups: [{ enemy: CLOCKWORK_INFANTRY, count: 9, spawnIntervalSeconds: 0.65 }] },
    // 第三波仍在步兵之后首次放出 2 只疾行机，形成不依赖空等的速度考核。
    { wave: 3, clearReward: 10, groups: [{ enemy: CLOCKWORK_INFANTRY, count: 11, spawnIntervalSeconds: 0.65 }, { enemy: CLOCKWORK_RUNNER, count: 2, spawnIntervalSeconds: 0.65 }] },
    { wave: 4, clearReward: 20, groups: [{ enemy: CLOCKWORK_INFANTRY, count: 6, spawnIntervalSeconds: 0.54 }, { enemy: CLOCKWORK_RUNNER, count: 4, spawnIntervalSeconds: 0.56 }] },
    // 第五波先隔离展示重装；后段再加密三类敌人。冷凝脉冲和升级承担后期压力，不靠拉长空刷怪间隔凑局长。
    { wave: 5, clearReward: 24, groups: [{ enemy: IRON_CANISTER_HAULER, count: 9, spawnIntervalSeconds: 1.15 }] },
    { wave: 6, clearReward: 24, groups: [{ enemy: CLOCKWORK_INFANTRY, count: 20, spawnIntervalSeconds: 0.68 }, { enemy: CLOCKWORK_RUNNER, count: 16, spawnIntervalSeconds: 0.62 }, { enemy: IRON_CANISTER_HAULER, count: 8, spawnIntervalSeconds: 1 }] },
    { wave: 7, clearReward: 28, groups: [{ enemy: CLOCKWORK_RUNNER, count: 35, spawnIntervalSeconds: 0.55 }, { enemy: IRON_CANISTER_HAULER, count: 13, spawnIntervalSeconds: 0.95 }] },
    { wave: 8, clearReward: 40, groups: [{ enemy: CLOCKWORK_INFANTRY, count: 31, spawnIntervalSeconds: 0.52 }, { enemy: CLOCKWORK_RUNNER, count: 22, spawnIntervalSeconds: 0.5 }, { enemy: IRON_CANISTER_HAULER, count: 18, spawnIntervalSeconds: 0.85 }] },
];

export const PHASE_B_WAVE_ONE = PHASE_B_WAVES[0];
