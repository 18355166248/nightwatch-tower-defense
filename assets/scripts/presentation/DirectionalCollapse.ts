import type { DirectionalFrameRect, DirectionalSpriteLayout } from './DirectionalSpriteLayout';

/** 一次性动作按 manifest 累积时长取帧，越过末帧只停住，不像行走那样取余重新站起来。 */
export function directionalCollapseFrame(remainingSeconds: number, durationSeconds: number,
    frames: readonly DirectionalFrameRect[], reducedMotion: boolean): number {
    if (frames.length === 0) return 0;
    if (reducedMotion || !Number.isFinite(remainingSeconds) || !Number.isFinite(durationSeconds) || durationSeconds <= 0) return frames.length - 1;
    const elapsedMs = Math.max(0, durationSeconds - remainingSeconds) * 1000;
    let boundary = 0;
    for (let index = 0; index < frames.length; index++) {
        boundary += frames[index].durationMs;
        if (elapsedMs + 1e-6 < boundary) return index;
    }
    return frames.length - 1;
}

/** 让倾倒前段保持可读；仅最后75ms淡出，死亡反馈的总寿命仍由战斗表现配置决定。 */
export function directionalCollapseOpacity(remainingSeconds: number): number {
    if (!Number.isFinite(remainingSeconds)) return 0;
    return Math.round(255 * Math.max(0, Math.min(1, remainingSeconds / .075)));
}

/** 大死亡画布必须与行走保持像素比例和地面投影，否则就回退最后走路帧，不能突然变大。 */
export function compatibleDirectionalCollapse(walk: DirectionalSpriteLayout | null,
    collapse: DirectionalSpriteLayout | null, durationSeconds: number): boolean {
    if (!walk || !collapse || !Number.isFinite(durationSeconds) || durationSeconds <= 0) return false;
    const ratio = collapse.frames.down[0].w / walk.frames.down[0].w;
    if (ratio !== 2 || Math.abs(collapse.anchor[0] - walk.anchor[0]) > 1e-6
        || Math.abs((collapse.anchor[1] - .5) * ratio - (walk.anchor[1] - .5)) > 1e-6) return false;
    return Object.values(collapse.frames).every(frames =>
        Math.abs(frames.reduce((total, frame) => total + frame.durationMs, 0) - durationSeconds * 1000) < 1e-6);
}
