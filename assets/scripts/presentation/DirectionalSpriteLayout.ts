export const DIRECTIONAL_FACINGS = ['down', 'left', 'up', 'right'] as const;
export type UnitFacing = typeof DIRECTIONAL_FACINGS[number];
export type DirectionalClip = 'walk' | 'collapse';
export interface DirectionalFrameRect {
    readonly x: number;
    readonly y: number;
    readonly w: number;
    readonly h: number;
    readonly durationMs: number;
}
export interface DirectionalSpriteLayout {
    readonly anchor: readonly [number, number];
    readonly frames: Readonly<Record<UnitFacing, readonly DirectionalFrameRect[]>>;
    readonly textureWidth: number;
    readonly textureHeight: number;
}

/** 四方向动作共享切格校验；行走必须循环、死亡必须单次，不能只按文件名猜时间语义。 */
export function parseDirectionalSpriteLayout(value: unknown, clip: DirectionalClip): DirectionalSpriteLayout | null {
    if (typeof value !== 'object' || value === null) return null;
    const data = value as { version?: unknown; kind?: unknown; anchor?: unknown; states?: unknown };
    if (data.version !== 1 || data.kind !== 'motion' || !Array.isArray(data.anchor) || data.anchor.length !== 2
        || !data.anchor.every((n) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1)
        || !Array.isArray(data.states) || data.states.length !== 4) return null;
    const frames = {} as Record<UnitFacing, DirectionalFrameRect[]>;
    const occupied = new Set<string>();
    let cellSize = 0;
    let textureWidth = 0;
    let textureHeight = 0;
    for (const item of data.states) {
        if (typeof item !== 'object' || item === null) return null;
        const state = item as { name?: unknown; loop?: unknown; frames?: unknown };
        const direction = DIRECTIONAL_FACINGS.find((key) => state.name === `${clip}-${key}`);
        if (!direction || frames[direction] || state.loop !== (clip === 'walk')
            || !Array.isArray(state.frames) || state.frames.length !== 4) return null;
        const row: DirectionalFrameRect[] = [];
        for (const entry of state.frames) {
            if (typeof entry !== 'object' || entry === null) return null;
            const rect = entry as DirectionalFrameRect;
            if (![rect.x, rect.y, rect.w, rect.h, rect.durationMs].every(Number.isInteger)
                || rect.x < 0 || rect.y < 0 || rect.w <= 0 || rect.w > 512 || rect.w !== rect.h
                || rect.durationMs <= 0 || rect.durationMs > 1000) return null;
            if (cellSize === 0) cellSize = rect.w;
            if (rect.w !== cellSize || rect.x % cellSize !== 0 || rect.y % cellSize !== 0) return null;
            const key = `${rect.x},${rect.y}`;
            if (occupied.has(key)) return null;
            occupied.add(key);
            textureWidth = Math.max(textureWidth, rect.x + cellSize);
            textureHeight = Math.max(textureHeight, rect.y + cellSize);
            row.push({ x: rect.x, y: rect.y, w: rect.w, h: rect.h, durationMs: rect.durationMs });
        }
        frames[direction] = row;
    }
    if (textureWidth !== cellSize * 4 || textureHeight !== cellSize * 4) return null;
    return { anchor: [data.anchor[0], data.anchor[1]], frames, textureWidth, textureHeight };
}
