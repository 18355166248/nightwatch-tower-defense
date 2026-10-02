import type { GridCell } from '../core/GridTypes';
import { DIRECTIONAL_FACINGS, parseDirectionalSpriteLayout, type DirectionalFrameRect,
    type DirectionalSpriteLayout, type UnitFacing } from './DirectionalSpriteLayout';

export const WALK_DIRECTIONS = DIRECTIONAL_FACINGS;
export type WalkDirection = UnitFacing;
export type WalkFrameRect = DirectionalFrameRect;
export type DirectionalWalkLayout = DirectionalSpriteLayout;

/** 美术对比不进入玩法/存档分区；默认仍使用现有图，只有明确预览参数才启用新候选。 */
export function infantryRigCandidateEnabled(search: string): boolean {
    return new URLSearchParams(search).get('unitArt') === 'rig-candidate';
}

/** 从已承诺的路段取朝向，不从屏幕旋转/视觉偏移推断，也不改变敌人的寻路位置。 */
export function walkDirection(from: GridCell, to: GridCell): WalkDirection {
    const dx = to.column - from.column;
    const dy = to.row - from.row;
    if (Math.abs(dx) + Math.abs(dy) !== 1) return 'down';
    return dx === -1 ? 'left' : dx === 1 ? 'right' : dy === -1 ? 'up' : 'down';
}

/** 格内两整圈保持跨格相位闭合；暂停/减速随同一个移动进度，减弱动态仍保持正确朝向。 */
export function directionalWalkFrame(progress: number, spawnOrder: number, reducedMotion: boolean): number {
    if (reducedMotion || !Number.isFinite(progress)) return 0;
    const offset = Number.isInteger(spawnOrder) && spawnOrder >= 0 ? spawnOrder % 4 : 0;
    const phase = Math.max(0, Math.min(1, progress)) * 8 + offset;
    return Math.floor(phase + 1e-9) % 4;
}

/** 只接受完整同画布四方向表；损坏 manifest 直接回退旧动作，不猜格数/朝向/末帧。 */
export function parseDirectionalWalkLayout(value: unknown): DirectionalWalkLayout | null {
    return parseDirectionalSpriteLayout(value, 'walk');
}

/** 源图 ground-anchor 是模型地面中心投影，不是每帧 bbox 最低点；接触斑与身体共用它。 */
export function directionalWalkRegistrationY(anchorY: number, groundY: number, displaySize: number): number {
    return groundY - (0.5 - anchorY) * displaySize;
}
