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

        this.drawSideStreets(state);

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

                // 保留逻辑端点格为通道，不在棋盘内再绘一套彩色“门”；独立地标画在中线两端。
                if (!isEntry && !isExit && (isTower || isPreview)) {
                    const color = isPreview
                        ? state.preview?.accepted ? new Color(63, 207, 146, 176) : new Color(225, 82, 82, 176)
                        : state.towerIdsByCell.get(key) === 'frost-coil'
                            ? new Color(97, 200, 216, 145) : new Color(218, 163, 72, 145);
                    graphics.fillColor = color;
                    graphics.roundRect(center.x - size * 0.43, center.y - size * 0.43, size * 0.86, size * 0.86, 9);
                    graphics.fill();
                }

                // 地标移到棋盘外后，端点格仍是必经通道；铜色护栏和斜纹区分普通可建空地。
                if (isEntry || isExit) {
                    graphics.fillColor = new Color(164, 139, 93, 38);
                    graphics.rect(center.x - size * .46, center.y - size * .46, size * .92, size * .92); graphics.fill();
                    graphics.strokeColor = new Color(196, 161, 98, 190); graphics.lineWidth = 3;
                    for (const side of [-1, 1]) {
                        const x = center.x + side * size * .42;
                        graphics.moveTo(x, center.y - size * .35); graphics.lineTo(x, center.y + size * .35);
                        for (const dy of [-.32, .32]) {
                            graphics.moveTo(x, center.y + size * dy);
                            graphics.lineTo(x - side * size * .12, center.y + size * (dy + .08));
                        }
                    }
                    graphics.stroke();
                }

                // 未占用的格子只留细线提示可布塔；敌人与地图原画仍能透出。
                graphics.strokeColor = new Color(136, 164, 171, 43);
                graphics.lineWidth = 1;
                graphics.rect(center.x - size / 2, center.y - size / 2, size, size);
                graphics.stroke();
            }
        }
        for (const cell of [state.grid.entry, state.grid.exit]) {
            const port = this.layout.routePointCenter(cell, state.grid);
            graphics.fillColor = new Color('#152936');
            graphics.circle(port.x, port.y, size * 0.64); graphics.fill();
            graphics.strokeColor = new Color('#A48B5D'); graphics.lineWidth = 3;
            graphics.circle(port.x, port.y, size * 0.58); graphics.stroke();
        }
        this.drawRoutePreviewDifference(state, size);
    }

    /** 外围街区只使用棋盘外的安全宽度；不增添可占格物件，也不覆盖敌人和建塔热区。 */
    private drawSideStreets(state: PhaseBSceneState): void {
        const g = this.graphics, board = this.layout.boardMetrics(state.grid);
        const top = board.bottom + board.height;
        for (const side of [-1, 1]) {
            const inner = board.width / 2 + 18, outer = this.layout.safeHalfWidth;
            const width = outer - inner;
            // 宽棋盘或窄屏没有足够侧带时仅保留原背景，不能挤入可操作区域。
            if (width < 90) continue;
            const x = side * (inner + width * .5), left = side < 0 ? -outer : inner;
            const span = width - 22;
            g.fillColor = new Color(11, 25, 35, 105);
            g.roundRect(left, board.bottom, width, board.height, 15); g.fill();
            // 石板小径和铜色排水边沿承接原夜城材质，留空的街区也有结构。
            g.strokeColor = new Color(117, 140, 148, 40); g.lineWidth = 2;
            for (let y = board.bottom + 25; y < top - 20; y += 77) {
                g.moveTo(left + 12, y); g.lineTo(left + width - 12, y);
                g.moveTo(x, y); g.lineTo(x, Math.min(y + 77, top - 20));
            }
            g.stroke();
            g.strokeColor = new Color(146, 117, 73, 100); g.lineWidth = 4;
            g.moveTo(side * inner, board.bottom + 18); g.lineTo(side * inner, top - 18); g.stroke();
            // 石阶、花池错开排列，左右不是镜像复制，避免看成额外的炮塔格子。
            for (const fraction of side < 0 ? [.26, .69] : [.4, .83]) {
                const y = board.bottom + board.height * fraction;
                g.fillColor = new Color(3, 10, 18, 100);
                g.ellipse(x + 7, y - 13, span * .46, 26); g.fill();
                for (let step = 0; step < 3; step++) {
                    g.fillColor = new Color(42 + step * 5, 54 + step * 5, 61 + step * 5, 230);
                    g.roundRect(x - span * .44, y - 40 + step * 8, span * .88, 18, 4); g.fill();
                }
                g.fillColor = new Color(36, 49, 52, 245);
                g.roundRect(x - span * .4, y - 15, span * .8, 49, 8); g.fill();
                g.strokeColor = new Color(126, 111, 78, 140); g.lineWidth = 3; g.stroke();
                for (let leaf = 0; leaf < 7; leaf++) {
                    const px = x + (leaf - 3) * span * .085, py = y + 25 + (leaf % 3) * 6;
                    g.fillColor = new Color(28 + leaf % 3 * 6, 59 + leaf % 2 * 10, 58, 225);
                    g.ellipse(px, py, span * .105, 15 + leaf % 2 * 5); g.fill();
                }
            }
            // 暖灯用多层低透明光晕柔化轮廓，装饰不会闪动或抢战斗反馈。
            for (const fraction of side < 0 ? [.12, .5, .91] : [.18, .62, .95]) {
                const y = board.bottom + board.height * fraction, lampX = x + side * span * .12;
                for (let ring = 4; ring >= 1; ring--) {
                    g.fillColor = new Color(224, 158, 64, 6 + (4 - ring) * 5);
                    g.circle(lampX, y + 38, 11 + ring * 10); g.fill();
                }
                g.fillColor = new Color(10, 17, 25, 120); g.ellipse(lampX + 7, y - 4, 23, 10); g.fill();
                g.fillColor = new Color(73, 64, 50, 240); g.roundRect(lampX - 17, y - 5, 34, 13, 4); g.fill();
                g.strokeColor = new Color(112, 95, 62, 230); g.lineWidth = 7;
                g.moveTo(lampX, y); g.lineTo(lampX, y + 37); g.stroke();
                g.fillColor = new Color(69, 51, 32, 250); g.roundRect(lampX - 12, y + 27, 24, 25, 4); g.fill();
                g.fillColor = new Color(247, 185, 92, 220); g.roundRect(lampX - 7, y + 31, 14, 17, 3); g.fill();
                g.strokeColor = new Color(80, 66, 39, 240); g.lineWidth = 2;
                g.moveTo(lampX, y + 31); g.lineTo(lampX, y + 48); g.stroke();
            }
            // 外缘淡雾分层过渡，保留背景建筑；不叠进棋盘范围或改变地图命中。
            for (let band = 0; band < 8; band++) {
                g.fillColor = new Color(15, 33, 45, 8 + band * 3);
                const bandX = side < 0 ? -outer + band * width / 8 : outer - (band + 1) * width / 8;
                g.rect(bandX, board.bottom, width / 8 + 1, board.height); g.fill();
            }
        }
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
