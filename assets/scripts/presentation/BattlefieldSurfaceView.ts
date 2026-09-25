import { Color, Graphics } from 'cc';
import { cellKey, sameCell } from '../core/GridTypes';
import type { PhaseBSceneState } from './PhaseBSceneState';
import { PhaseBLayout } from './PhaseBLayout';

/** 只负责战场地表；道路由真实路径快照绘制，布塔改路后不会留下旧道路贴图。 */
export class BattlefieldSurfaceView {
    public constructor(private readonly graphics: Graphics, private readonly layout: PhaseBLayout) {}

    public draw(state: PhaseBSceneState): void {
        const graphics = this.graphics;
        const metrics = this.layout.boardMetrics(state.grid);
        const size = metrics.cellSize;

        // 底图已有石板纹理，这里仅压暗和描边；不再用实心格子盖掉原画细节。
        graphics.fillColor = new Color(13, 28, 43, 64);
        graphics.roundRect(metrics.left - 10, metrics.bottom - 10, metrics.width + 20, metrics.height + 20, 16);
        graphics.fill();
        graphics.strokeColor = new Color(184, 139, 74, 155);
        graphics.lineWidth = 3;
        graphics.roundRect(metrics.left - 10, metrics.bottom - 10, metrics.width + 20, metrics.height + 20, 16);
        graphics.stroke();

        const path = state.activePath;
        if (path && path.length > 1) {
            // 两道连续描线比逐格填色更能表达“可被布塔改变的路”，转角也不会出现贴图接缝。
            this.strokePath(state, size * 0.86, new Color(160, 123, 69, 215));
            this.strokePath(state, size * 0.75, new Color(58, 77, 83, 228));
            this.strokePath(state, size * 0.57, new Color(102, 122, 112, 180));
        }

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
    }

    private strokePath(state: PhaseBSceneState, width: number, color: Color): void {
        const path = state.activePath;
        if (!path || path.length < 2) return;
        const graphics = this.graphics;
        graphics.strokeColor = state.preview?.accepted && width < this.layout.boardMetrics(state.grid).cellSize * 0.6
            ? new Color(81, 177, 138, 190) : color;
        graphics.lineWidth = width;
        const start = this.layout.gridPointCenter(path[0], state.grid);
        graphics.moveTo(start.x, start.y);
        for (let index = 1; index < path.length; index += 1) {
            const point = this.layout.gridPointCenter(path[index], state.grid);
            graphics.lineTo(point.x, point.y);
        }
        graphics.stroke();
    }
}
