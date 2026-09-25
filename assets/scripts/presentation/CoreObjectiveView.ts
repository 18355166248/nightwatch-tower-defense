import { Color, Graphics } from 'cc';
import type { GridDefinition } from '../core/GridTypes';
import { buildCoreObjectiveState, type CoreIntegrityTone } from './CoreObjectiveState';
import { PhaseBLayout } from './PhaseBLayout';

const CORE_COLORS: Readonly<Record<CoreIntegrityTone, string>> = {
    steady: '#7DE2AB',
    strained: '#FFD17C',
    critical: '#FF8575',
    empty: '#A74A50',
};

const DIGIT_SEGMENTS: readonly (readonly number[])[] = [
    [0, 1, 2, 3, 4, 5], [1, 2], [0, 1, 6, 4, 3], [0, 1, 2, 3, 6],
    [5, 6, 1, 2], [0, 5, 6, 2, 3], [0, 5, 4, 3, 2, 6], [0, 1, 2],
    [0, 1, 2, 3, 4, 5, 6], [0, 1, 2, 3, 5, 6],
];

/** 将可被敌人攻击的出口做成持续可读的世界目标，位置始终跟随网格出口。 */
export class CoreObjectiveView {
    public constructor(private readonly graphics: Graphics, private readonly layout: PhaseBLayout) {}

    public draw(grid: GridDefinition, health: number, maxHealth: number): void {
        const objective = buildCoreObjectiveState(health, maxHealth);
        const board = this.layout.boardMetrics(grid);
        const cellSize = board.cellSize;
        const center = this.layout.gridPointCenter(grid.exit, grid);
        const radius = cellSize * 0.46;
        const color = new Color(CORE_COLORS[objective.tone]);
        const graphics = this.graphics;

        // 外圈暗轨保留已损失的比例；亮色弧线直接映射真实剩余生命。
        graphics.fillColor = new Color('#1A2631');
        graphics.circle(center.x, center.y, cellSize * 0.35);
        graphics.fill();
        graphics.strokeColor = new Color('#28404B');
        graphics.lineWidth = Math.max(7, cellSize * 0.105);
        graphics.circle(center.x, center.y, radius);
        graphics.stroke();
        if (objective.ratio > 0) {
            graphics.strokeColor = color;
            graphics.arc(center.x, center.y, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * objective.ratio, false);
            graphics.stroke();
        }
        this.drawHealthBadge(board.left - 18, center.y, objective.health, objective.maxHealth, color, cellSize);
    }

    private drawHealthBadge(right: number, y: number, health: number, maxHealth: number, color: Color, cellSize: number): void {
        const graphics = this.graphics;
        const left = Math.max(-525, right - 128);
        const width = right - left;
        graphics.fillColor = new Color('#142534');
        graphics.roundRect(left, y - 45, width, 90, 14);
        graphics.fill();
        graphics.strokeColor = color;
        graphics.lineWidth = 4;
        graphics.roundRect(left + 2, y - 43, width - 4, 86, 12);
        graphics.stroke();
        this.drawHealthNumber(left + width / 2, y + 10, health, cellSize);
        const segments = Math.min(10, Math.max(1, Math.floor(maxHealth)));
        const gap = 3;
        const segmentWidth = (width - 20 - (segments - 1) * gap) / segments;
        for (let index = 0; index < segments; index += 1) {
            const segmentHealth = maxHealth * (index + 1) / segments;
            graphics.fillColor = health >= segmentHealth ? color : new Color('#385061');
            graphics.roundRect(left + 10 + index * (segmentWidth + gap), y - 28, segmentWidth, 13, 3);
            graphics.fill();
        }
    }

    private drawHealthNumber(x: number, y: number, health: number, cellSize: number): void {
        const digits = String(Math.floor(health)).split('').map(Number);
        const scale = cellSize / 85 * 2.05;
        const spacing = 23 * scale;
        const firstX = x - (digits.length - 1) * spacing / 2;
        const segments = [
            [-6, 10, 6, 10], [8, 7, 8, 1], [8, -2, 8, -8], [-6, -11, 6, -11],
            [-8, -8, -8, -2], [-8, 1, -8, 7], [-6, 0, 6, 0],
        ] as const;
        this.graphics.strokeColor = new Color('#FFF3D5');
        this.graphics.lineWidth = 5 * scale;
        for (let index = 0; index < digits.length; index += 1) {
            const digitX = firstX + index * spacing;
            for (const segmentIndex of DIGIT_SEGMENTS[digits[index]]) {
                const [x1, y1, x2, y2] = segments[segmentIndex];
                this.graphics.moveTo(digitX + x1 * scale, y + y1 * scale);
                this.graphics.lineTo(digitX + x2 * scale, y + y2 * scale);
            }
        }
        this.graphics.stroke();
    }
}
