import type { PhaseBPoint } from './PhaseBLayout';

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
export function enemyStridePose(archetypeId: 'clockwork-infantry' | 'clockwork-runner', progress: number, spawnOrder: number): UnitVisualPose {
    const runner = archetypeId === 'clockwork-runner';
    const phase = enemyGaitPhase(archetypeId, progress, spawnOrder);
    const stride = Math.sin(phase);
    const bounce = Math.abs(stride);
    const compression = Math.cos(phase) * (runner ? 0.045 : 0.032);
    return {
        x: 0,
        y: bounce * (runner ? 8 : 6),
        scaleX: 1 + compression,
        scaleY: 1 - compression,
        angle: stride * (runner ? 4 : 2.5),
    };
}

/** 原图为 A 帧；另一帧只从格内进度选取，暂停和格间交接都不依赖额外计时器。 */
export function enemyGaitFrame(archetypeId: 'clockwork-infantry' | 'clockwork-runner', progress: number, spawnOrder: number): 0 | 1 {
    const turns = enemyGaitTurns(archetypeId, progress, spawnOrder);
    const withinTurn = turns - Math.floor(turns);
    return withinTurn >= 0.25 && withinTurn < 0.75 ? 1 : 0;
}

function enemyGaitPhase(archetypeId: 'clockwork-infantry' | 'clockwork-runner', progress: number, spawnOrder: number): number {
    return enemyGaitTurns(archetypeId, progress, spawnOrder) * Math.PI * 2;
}

function enemyGaitTurns(archetypeId: 'clockwork-infantry' | 'clockwork-runner', progress: number, spawnOrder: number): number {
    const cycles = archetypeId === 'clockwork-runner' ? 3 : 2;
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
