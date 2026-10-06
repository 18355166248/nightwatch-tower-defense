import { PHASE_B_TOWERS, type TowerId } from '../config/PhaseBCombatConfig';
import type { GridCell, GridDefinition } from '../core/GridTypes';
import type { PhaseBLayout, PhaseBPoint, PhaseBRect } from './PhaseBLayout';

export interface CellBuildOption { readonly towerId: TowerId; readonly enabled: boolean; readonly reason: string; }
export interface CellBuildMenuInput { readonly cell: GridCell; readonly options: readonly CellBuildOption[]; }

/** 弹层锚定格子，上方空间不足时放到下方；输入与绘制共用边界，边缘格不留屏外热区。 */
export function cellBuildMenuLayout(layout: PhaseBLayout, grid: GridDefinition, cell: GridCell, count = PHASE_B_TOWERS.length) {
    const center = layout.gridPointCenter(cell, grid), metrics = layout.boardMetrics(grid);
    const scale = Math.min(1080, layout.visibleDesignWidth) / 390;
    const width = Math.min(366 * scale, layout.safeHalfWidth * 2), height = 180 * scale;
    const left = Math.max(-layout.safeHalfWidth, Math.min(center.x - width / 2, layout.safeHalfWidth - width));
    const above = center.y + metrics.cellSize / 2 + 10 * scale;
    const bottom = above + height <= 730 ? above : center.y - metrics.cellSize / 2 - 10 * scale - height;
    const panel: PhaseBRect = { left, right: left + width, bottom, top: bottom + height };
    const itemWidth = (width - 24 * scale - (count - 1) * 8 * scale) / count;
    const options = Array.from({ length: count }, (_, i): PhaseBRect => ({left:left + 12 * scale + i * (itemWidth + 8 * scale),
        right:left + 12 * scale + i * (itemWidth + 8 * scale) + itemWidth, bottom:bottom + 12 * scale, top:bottom + 142 * scale}));
    return { panel, options, scale, center, close:{left:panel.right - 56 * scale,right:panel.right - 8 * scale,bottom:panel.top - 32 * scale,top:panel.top - 4 * scale} };
}

export function cellBuildMenuAction(point: PhaseBPoint, geometry: ReturnType<typeof cellBuildMenuLayout>): number | 'close' | 'surface' | null {
    const inside = (r: PhaseBRect) => point.x >= r.left && point.x <= r.right && point.y >= r.bottom && point.y <= r.top;
    if (inside(geometry.close)) return 'close';
    const index = geometry.options.findIndex(inside);
    return index >= 0 ? index : inside(geometry.panel) ? 'surface' : null;
}
