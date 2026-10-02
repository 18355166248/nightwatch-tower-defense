export interface RenderBudgetCounters {
    readonly textureBytes?: unknown;
    readonly bufferBytes?: unknown;
    readonly drawCalls?: unknown;
}

/** Cocos的Texture2D公开的是GFX视图；沿公开viewInfo找到真正分配，循环/断链视为未知。 */
export function textureAllocationOwner<T extends { readonly isTextureView: boolean; readonly viewInfo: { readonly texture: T | null } }>(texture: T | null): T | null {
    const visited = new Set<T>();
    while (texture?.isTextureView) {
        if (visited.has(texture)) return null;
        visited.add(texture);
        texture = texture.viewInfo.texture;
    }
    return texture;
}

function nonnegativeInteger(value: unknown): number | null {
    return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

/** GFX账面分配不是驱动/进程内存；缺计数时返回null，禁止用0伪装预算通过。 */
export function renderBudgetSummary(counters: RenderBudgetCounters | null, cachedTextureBytes: unknown, previousPeak: unknown = null) {
    const textureBytes = nonnegativeInteger(counters?.textureBytes);
    const cached = nonnegativeInteger(cachedTextureBytes);
    const peak = nonnegativeInteger(previousPeak);
    return {
        rendererTextureBytes: textureBytes,
        rendererTexturePeakBytes: textureBytes === null ? peak : Math.max(textureBytes, peak ?? 0),
        rendererBufferBytes: nonnegativeInteger(counters?.bufferBytes),
        rendererDrawCalls: nonnegativeInteger(counters?.drawCalls),
        rendererCachedTextureBytes: cached,
        // 未归类部分可含文字、引擎内置图和渲染目标；不能仅凭差值认定某项泄漏。
        rendererUncataloguedTextureBytes: textureBytes !== null && cached !== null && textureBytes >= cached ? textureBytes - cached : null,
    };
}
