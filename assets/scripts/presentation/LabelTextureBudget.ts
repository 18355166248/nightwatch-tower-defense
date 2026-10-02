export interface LabelTextureReference {
    readonly owner: object;
    readonly bytes: number;
    readonly visible: boolean;
    readonly path: string;
    readonly sharedWithResource: boolean;
}

/** 按真正分配去重；仍有可见持有者或资源缓存持有者时，不算可独立回收的隐藏文字。 */
export function labelTextureBudget(references: readonly LabelTextureReference[], supported = true) {
    if (!supported || references.some(reference => !Number.isSafeInteger(reference.bytes) || reference.bytes < 0)) return {
        rendererLabelBudgetSupported: false,
        rendererLabelTextureBytes: null,
        rendererHiddenLabelTextureBytes: null,
        rendererLabelTextureCount: null,
        rendererHiddenLabelTextureCount: null,
        rendererLabelResourceOverlapBytes: null,
        rendererLargestLabelTextures: [] as { bytes: number; visible: boolean; sharedWithResource: boolean; paths: string[] }[],
    };
    const owners = new Map<object, { bytes: number; visible: boolean; shared: boolean; paths: string[] }>();
    for (const reference of references) {
        const previous = owners.get(reference.owner);
        if (previous) {
            previous.visible ||= reference.visible;
            previous.shared ||= reference.sharedWithResource;
            previous.paths.push(reference.path);
        } else owners.set(reference.owner, { bytes: reference.bytes, visible: reference.visible,
            shared: reference.sharedWithResource, paths: [reference.path] });
    }
    // Creator发布转译的loose数组展开不会展开Map迭代器；显式Array.from，避免空对象/NaN计数。
    const allocations = Array.from(owners.values());
    const hidden = allocations.filter(allocation => !allocation.visible && !allocation.shared);
    return {
        rendererLabelBudgetSupported: true,
        rendererLabelTextureBytes: allocations.reduce((sum, allocation) => sum + allocation.bytes, 0),
        rendererHiddenLabelTextureBytes: hidden.reduce((sum, allocation) => sum + allocation.bytes, 0),
        rendererLabelTextureCount: allocations.length,
        rendererHiddenLabelTextureCount: hidden.length,
        rendererLabelResourceOverlapBytes: allocations.filter(allocation => allocation.shared).reduce((sum, allocation) => sum + allocation.bytes, 0),
        rendererLargestLabelTextures: allocations.sort((a, b) => b.bytes - a.bytes || a.paths.join().localeCompare(b.paths.join()))
            .slice(0, 8).map(allocation => ({ bytes: allocation.bytes, visible: allocation.visible,
                sharedWithResource: allocation.shared, paths: allocation.paths })),
    };
}
