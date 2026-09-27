import { cellKey, type GridCell } from '../core/GridTypes';

export interface RoutePreviewDiff {
    readonly abandoned: readonly GridCell[];
    readonly added: readonly GridCell[];
}

/** 预览只比较当前真实路线与候选路线；不在表现层重新寻路，取消预览即可回到真实路线。 */
export function routePreviewDiff(before: readonly GridCell[], after: readonly GridCell[]): RoutePreviewDiff {
    const beforeKeys = new Set(before.map(cellKey));
    const afterKeys = new Set(after.map(cellKey));
    return {
        abandoned: before.filter((cell) => !afterKeys.has(cellKey(cell))),
        added: after.filter((cell) => !beforeKeys.has(cellKey(cell))),
    };
}
