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
