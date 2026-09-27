import type { PhaseBPoint } from './PhaseBLayout';
import type { EnemyId } from '../config/PhaseBCombatConfig';

const ENEMY_LANES: readonly PhaseBPoint[] = [
    { x: -0.17, y: -0.08 },
    { x: 0.17, y: 0.08 },
    { x: -0.17, y: 0.08 },
    { x: 0.17, y: -0.08 },
];

/** 同一路线的步兵只做稳定视觉错位，逻辑位置与索敌仍保持在路线中心。 */
export function enemyVisualOffset(spawnOrder: number, cellSize: number): PhaseBPoint {
    const lane = ENEMY_LANES[(Math.max(1, Math.floor(spawnOrder)) - 1) % ENEMY_LANES.length];
    return { x: lane.x * cellSize, y: lane.y * cellSize };
}

export interface UnitVisualPose {
    readonly x: number;
    readonly y: number;
    readonly scaleX: number;
    readonly scaleY: number;
    readonly angle: number;
}

const REST_POSE: UnitVisualPose = { x: 0, y: 0, scaleX: 1, scaleY: 1, angle: 0 };

/** 每格使用整数个步频周期，拐弯和暂停时都能从位置快照复原姿态，不依赖额外计时器。 */
export function enemyStridePose(archetypeId: EnemyId, progress: number, spawnOrder: number): UnitVisualPose {
    const runner = archetypeId === 'clockwork-runner';
    const phase = enemyGaitPhase(archetypeId, progress, spawnOrder);
    const stride = Math.sin(phase);
    const bounce = Math.abs(stride);
    const heavy = archetypeId === 'iron-canister-hauler';
    const compression = Math.cos(phase) * (heavy ? 0.012 : runner ? 0.045 : 0.032);
    return {
        x: 0,
        y: bounce * (heavy ? 2.5 : runner ? 8 : 6),
        scaleX: 1 + compression,
        scaleY: 1 - compression,
        angle: stride * (heavy ? 0.8 : runner ? 4 : 2.5),
    };
}

/** 原图为 A 帧；另一帧只从格内进度选取，暂停和格间交接都不依赖额外计时器。 */
export function enemyGaitFrame(archetypeId: EnemyId, progress: number, spawnOrder: number): 0 | 1 {
    const turns = enemyGaitTurns(archetypeId, progress, spawnOrder);
    const withinTurn = turns - Math.floor(turns);
    return withinTurn >= 0.25 && withinTurn < 0.75 ? 1 : 0;
}

function enemyGaitPhase(archetypeId: EnemyId, progress: number, spawnOrder: number): number {
    return enemyGaitTurns(archetypeId, progress, spawnOrder) * Math.PI * 2;
}

function enemyGaitTurns(archetypeId: EnemyId, progress: number, spawnOrder: number): number {
    const cycles = archetypeId === 'iron-canister-hauler' ? 1 : archetypeId === 'clockwork-runner' ? 3 : 2;
    return Math.max(0, Math.min(1, progress)) * cycles + (spawnOrder % 4) / 4;
}

/** 发射反馈只改变炮塔视觉姿态，归零后严格回到静止态，不移动逻辑塔位。 */
export function towerRecoilPose(
    towerId: 'rivet-gun' | 'frost-coil',
    remainingSeconds: number,
    durationSeconds: number,
    targetDirection: PhaseBPoint,
): UnitVisualPose {
    if (durationSeconds <= 0 || remainingSeconds <= 0) return REST_POSE;
    const life = Math.max(0, Math.min(1, remainingSeconds / durationSeconds));
    const recoil = life * life;
    const length = Math.hypot(targetDirection.x, targetDirection.y) || 1;
    const distance = (towerId === 'rivet-gun' ? 6 : 3.5) * recoil;
    return {
        x: -targetDirection.x / length * distance,
        y: -targetDirection.y / length * distance,
        scaleX: 1 + (towerId === 'rivet-gun' ? 0.06 : 0.08) * recoil,
        scaleY: 1 - (towerId === 'rivet-gun' ? 0.09 : 0.04) * recoil,
        angle: 0,
    };
}

/** 冷凝命中时只让舱内能量芯短暂外扩；固定机架和逻辑射程都不随之变化。 */
export function frostCorePulsePose(remainingSeconds: number, durationSeconds: number): UnitVisualPose {
    if (durationSeconds <= 0 || remainingSeconds <= 0) return REST_POSE;
    const life = Math.max(0, Math.min(1, remainingSeconds / durationSeconds));
    const pulse = life * life;
    return { x: 0, y: 0, scaleX: 1 + pulse * 0.16, scaleY: 1 + pulse * 0.1, angle: 0 };
}

/** 减速光效读取战斗快照的剩余时间，既能随暂停冻结，也不会额外保留表现状态。 */
export function enemySlowVisualStrength(remainingSeconds: number, durationSeconds: number): number {
    if (!Number.isFinite(remainingSeconds) || !Number.isFinite(durationSeconds) || durationSeconds <= 0 || remainingSeconds <= 0) return 0;
    return Math.max(0, Math.min(1, remainingSeconds / durationSeconds));
}

export function enemyDeathFeedbackSeconds(archetypeId: EnemyId): number {
    // 重装击杀频率低且威胁高，单独留出读得清的落地时间；常规敌人的消失必须短促。
    return archetypeId === 'iron-canister-hauler' ? 0.52 : archetypeId === 'clockwork-runner' ? 0.34 : 0.3;
}

export interface EnemyDeathPose {
    readonly y: number;
    readonly scaleX: number;
    readonly scaleY: number;
    readonly angle: number;
    readonly opacity: number;
    readonly ringRadiusCells: number;
    readonly ringOpacity: number;
    readonly rays: number;
}

/** 死亡姿态由反馈快照直接求值；暂停、重开或低帧率都不需要额外 Tween 状态。 */
export function enemyDeathPose(archetypeId: EnemyId, remainingSeconds: number, durationSeconds: number, spawnOrder: number): EnemyDeathPose {
    const progress = durationSeconds > 0 ? Math.max(0, Math.min(1, 1 - remainingSeconds / durationSeconds)) : 1;
    const easeOut = 1 - (1 - progress) * (1 - progress);
    const heavy = archetypeId === 'iron-canister-hauler';
    const runner = archetypeId === 'clockwork-runner';
    const sign = spawnOrder % 2 === 0 ? 1 : -1;
    return {
        y: -(heavy ? 13 : 8) * easeOut,
        scaleX: 1 + (heavy ? 0.13 : 0.07) * easeOut,
        scaleY: 1 - (heavy ? 0.48 : 0.58) * easeOut,
        angle: sign * (heavy ? 13 : runner ? 24 : 18) * easeOut,
        opacity: Math.round(255 * Math.pow(1 - progress, heavy ? 1.15 : 1.7)),
        ringRadiusCells: (heavy ? 0.3 : 0.19) + (heavy ? 0.55 : 0.26) * easeOut,
        ringOpacity: Math.round((heavy ? 225 : runner ? 125 : 75) * Math.pow(1 - progress, 1.4)),
        rays: heavy ? 8 : runner ? 4 : 0,
    };
}
