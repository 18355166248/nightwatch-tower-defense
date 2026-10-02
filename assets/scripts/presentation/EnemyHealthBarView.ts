import { Color, Graphics } from 'cc';
import type { EnemyHealthBarPlacement } from './EnemyHealthBarLayout';

/** Sprite 与灰盒共享血条画法；移动较远才画细引线，避免把重叠变成一片无归属的横线。 */
export function drawEnemyHealthBars(graphics: Graphics, bars: readonly EnemyHealthBarPlacement[]): void {
    graphics.strokeColor = new Color(220, 211, 196, 135);
    graphics.lineWidth = 1.5;
    for (const bar of bars) {
        if (Math.hypot(bar.x - bar.anchorX, bar.y - bar.anchorY) > 12) {
            graphics.moveTo(bar.anchorX, bar.anchorY);
            graphics.lineTo(bar.x, bar.y);
            graphics.stroke();
        }
    }
    for (const bar of bars) {
        graphics.fillColor = new Color('#35262C');
        graphics.rect(bar.x - bar.width / 2, bar.y, bar.width, 7);
        graphics.fill();
        graphics.fillColor = new Color('#E8DED2');
        graphics.rect(bar.x - bar.width / 2, bar.y, bar.width * bar.ratio, 7);
        graphics.fill();
    }
}
