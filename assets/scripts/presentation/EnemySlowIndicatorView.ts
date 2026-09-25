import { Color, Graphics } from 'cc';

const CARDINAL_ANGLES = [0, Math.PI / 2, Math.PI, Math.PI * 1.5] as const;

/** 分段冰环在单位切图和灰盒回退中共用，避免两种渲染状态传达不同的减速含义。 */
export class EnemySlowIndicatorView {
    public static draw(graphics: Graphics, x: number, y: number, radius: number, strength: number): void {
        if (strength <= 0) return;
        const alpha = Math.round(230 * Math.sqrt(strength));
        graphics.strokeColor = new Color(116, 232, 255, alpha);
        graphics.lineWidth = 8;
        graphics.circle(x, y, radius + (1 - strength) * 3);
        graphics.stroke();
        graphics.strokeColor = new Color(217, 251, 255, alpha);
        graphics.lineWidth = 5;
        for (const angle of CARDINAL_ANGLES) {
            const dx = Math.cos(angle);
            const dy = Math.sin(angle);
            graphics.moveTo(x + dx * (radius - 6), y + dy * (radius - 6));
            graphics.lineTo(x + dx * (radius + 6), y + dy * (radius + 6));
        }
        graphics.stroke();
    }
}
