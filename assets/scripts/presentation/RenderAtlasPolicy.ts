export interface RenderAtlasManager {
    readonly enabled: boolean;
    readonly atlasCount: number;
    textureSize: number;
    maxAtlasCount: number;
    maxFrameSize: number;
}

export type RenderAtlasPolicyStatus = 'default' | 'small-atlas-applied' | 'small-atlas-disabled' | 'small-atlas-too-late';

/** 小图集仅为显式候选；不重置已打包SpriteFrame，不修改全局图片缓存清理策略。 */
export function applyRenderAtlasPolicy(manager: RenderAtlasManager, search: string): RenderAtlasPolicyStatus {
    if (new URLSearchParams(search).get('renderBudget') !== 'small-atlas') return 'default';
    if (!manager.enabled) return 'small-atlas-disabled';
    if (manager.atlasCount > 0) return 'small-atlas-too-late';
    // 在创建首关视图之前设上限；超过容量的碎图走原纹理，不丢图，也不为大动画图集再分配副本。
    manager.textureSize = 512;
    manager.maxAtlasCount = 2;
    manager.maxFrameSize = 128;
    return 'small-atlas-applied';
}
