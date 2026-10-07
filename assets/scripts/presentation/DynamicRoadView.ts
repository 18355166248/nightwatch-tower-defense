import { Color, Graphics } from 'cc';
import type { GridCell, GridDefinition } from '../core/GridTypes';
import { PhaseBLayout } from './PhaseBLayout';
import { roadSurfaceFeatures } from './RoadSurfaceGeometry';

/** 由同一条玩法路径即时绘制石板路；材质与改路预览分层，避免静态底图留下旧路。 */
export class DynamicRoadView {
    public constructor(private readonly graphics: Graphics, private readonly layout: PhaseBLayout) {}

    public draw(path: readonly GridCell[] | null, grid: GridDefinition, cellSize: number, previewAccepted: boolean): void {
        if (!path || path.length < 2) return;
        const { corners, seams } = roadSurfaceFeatures(path);
        // 外阴影、铜边、暗槽和石板面依次压在底图上；路面要实，敌人/炮塔仍由上层突出。
        this.strokeLayer(path, corners, grid, cellSize * 0.98, new Color(24, 30, 38, 175));
        this.strokeLayer(path, corners, grid, cellSize * 0.88, new Color(169, 128, 76, 230));
        this.strokeLayer(path, corners, grid, cellSize * 0.76, new Color(55, 65, 70, 246));
        this.strokeLayer(path, corners, grid, cellSize * 0.63,
            previewAccepted ? new Color(100, 167, 143, 232) : new Color(122, 127, 119, 239));

        const graphics = this.graphics;
        graphics.strokeColor = previewAccepted ? new Color(55, 112, 91, 145) : new Color(33, 44, 48, 172);
        graphics.lineWidth = Math.max(4, cellSize * 0.05);
        for (const seam of seams) {
            const center = this.layout.routePointCenter(seam.cell, grid);
            const half = cellSize * 0.27;
            if (seam.axis === 'horizontal') {
                graphics.moveTo(center.x - half, center.y);
                graphics.lineTo(center.x + half, center.y);
            } else {
                graphics.moveTo(center.x, center.y - half);
                graphics.lineTo(center.x, center.y + half);
            }
        }
        if (seams.length > 0) graphics.stroke();
    }

    private strokeLayer(path: readonly GridCell[], corners: readonly GridCell[], grid: GridDefinition, width: number, color: Color): void {
        const graphics = this.graphics;
        graphics.strokeColor = color;
        graphics.lineWidth = width;
        const points = this.layout.routePolyline(path, grid);
        graphics.moveTo(points[0].x, points[0].y);
        for (const point of points.slice(1)) graphics.lineTo(point.x, point.y);
        graphics.stroke();
        // 只补真正的转角，四层圆角沿用同一格心；不在每格生成贴片和额外节点。
        graphics.fillColor = color;
        for (const cell of [...corners, path[0], path[path.length - 1]]) {
            const center = this.layout.gridPointCenter(cell, grid);
            graphics.circle(center.x, center.y, width * 0.5);
        }
        graphics.fill();
    }
}
