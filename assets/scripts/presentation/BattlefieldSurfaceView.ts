import { Color, Graphics } from 'cc';
import { cellKey, sameCell } from '../core/GridTypes';
import type { PhaseBSceneState } from './PhaseBSceneState';
import { PhaseBLayout } from './PhaseBLayout';
import { routePreviewDiff } from './RoutePreviewDiff';
import { DynamicRoadView } from './DynamicRoadView';

/** 只负责战场地表；道路由真实路径快照绘制，布塔改路后不会留下旧道路贴图。 */
export class BattlefieldSurfaceView {
    private readonly road: DynamicRoadView;

    public constructor(private readonly graphics: Graphics, private readonly layout: PhaseBLayout) {
        this.road = new DynamicRoadView(graphics, layout);
    }

    public draw(state: PhaseBSceneState): void {
        const graphics = this.graphics;
        const metrics = this.layout.boardMetrics(state.grid);
        const size = metrics.cellSize;

        // 棋盘底图保留石板纹理；轻罩色只隔离边缘建筑，不再二次压暗塔与敌人的活动区。
        graphics.fillColor = new Color(13, 28, 43, 18);
        graphics.roundRect(metrics.left - 10, metrics.bottom - 10, metrics.width + 20, metrics.height + 20, 16);
        graphics.fill();
        graphics.strokeColor = new Color(184, 139, 74, 155);
        graphics.lineWidth = 3;
        graphics.roundRect(metrics.left - 10, metrics.bottom - 10, metrics.width + 20, metrics.height + 20, 16);
        graphics.stroke();

        this.road.draw(state.activePath, state.grid, size, Boolean(state.preview?.accepted));

        for (let row = 0; row < state.grid.rows; row += 1) {
            for (let column = 0; column < state.grid.columns; column += 1) {
                const cell = { column, row };
                const center = this.layout.gridPointCenter(cell, state.grid);
                const key = cellKey(cell);
                const isEntry = sameCell(cell, state.grid.entry);
                const isExit = sameCell(cell, state.grid.exit);
                const isTower = state.towers.has(key);
                const isPreview = state.preview && sameCell(cell, state.preview.cell);

                if (isEntry || isExit) {
                    graphics.fillColor = new Color(isEntry ? 73 : 174, isEntry ? 138 : 81, isEntry ? 184 : 83, 180);
                    graphics.roundRect(center.x - size * 0.43, center.y - size * 0.43, size * 0.86, size * 0.86, 9);
                    graphics.fill();
                } else if (isTower || isPreview) {
                    const color = isPreview
                        ? state.preview?.accepted ? new Color(63, 207, 146, 176) : new Color(225, 82, 82, 176)
                        : state.towerIdsByCell.get(key) === 'frost-coil'
                            ? new Color(97, 200, 216, 145) : new Color(218, 163, 72, 145);
                    graphics.fillColor = color;
                    graphics.roundRect(center.x - size * 0.43, center.y - size * 0.43, size * 0.86, size * 0.86, 9);
                    graphics.fill();
                }

                // 未占用的格子只留细线提示可布塔；敌人与地图原画仍能透出。
                graphics.strokeColor = new Color(136, 164, 171, 43);
                graphics.lineWidth = 1;
                graphics.rect(center.x - size / 2, center.y - size / 2, size, size);
                graphics.stroke();
            }
        }
        this.drawRoutePreviewDifference(state, size);
    }

    private drawRoutePreviewDifference(state: PhaseBSceneState, size: number): void {
        if (!state.preview?.accepted || !state.previewBaselinePath || !state.activePath) return;
        const graphics = this.graphics;
        const { abandoned, added } = routePreviewDiff(state.previewBaselinePath, state.activePath);
        // 旧路用斜杠表示“将被封掉”，新路用实心轮廓表示“敌人将改走这里”；不只依赖红绿颜色。
        for (const cell of abandoned) {
            if (sameCell(cell, state.preview.cell)) continue;
            const center = this.layout.gridPointCenter(cell, state.grid);
            const half = size * 0.38;
            graphics.fillColor = new Color(225, 159, 97, 45);
            graphics.roundRect(center.x - half, center.y - half, half * 2, half * 2, 8);
            graphics.fill();
            graphics.strokeColor = new Color(250, 189, 117, 195);
            graphics.lineWidth = 5;
            graphics.moveTo(center.x - half * 0.48, center.y - half * 0.48);
            graphics.lineTo(center.x + half * 0.48, center.y + half * 0.48);
            graphics.stroke();
        }
        for (const cell of added) {
            const center = this.layout.gridPointCenter(cell, state.grid);
            const half = size * 0.4;
            graphics.fillColor = new Color(95, 237, 185, 48);
            graphics.roundRect(center.x - half, center.y - half, half * 2, half * 2, 8);
            graphics.fill();
            graphics.strokeColor = new Color(151, 255, 214, 220);
            graphics.lineWidth = 4;
            graphics.roundRect(center.x - half, center.y - half, half * 2, half * 2, 8);
            graphics.stroke();
        }
    }

}
