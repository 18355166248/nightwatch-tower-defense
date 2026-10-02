import { Color, Graphics } from 'cc';
import type { PhaseBRect } from './PhaseBLayout';

export type FirstLevelPanelTone = 'neutral' | 'primary' | 'danger' | 'disabled';
const TONES = { neutral: '#A78350', primary: '#6FAF9D', danger: '#C47768', disabled: '#596A70' } as const;

/** 所有非战斗页面共用铜框/墨蓝面板语法；纯绘制不持有菜单状态，也不另建点击几何。 */
export class FirstLevelPanelPainter {
    public constructor(private readonly graphics: Graphics) {}

    public panel(rect: PhaseBRect, tone: FirstLevelPanelTone = 'neutral', opacity = 255): void {
        this.box(rect, '#080F17', 26, opacity);
        this.box(this.inset(rect, 4), '#6B5035', 23, opacity);
        this.box(this.inset(rect, 9), '#B48B53', 19, opacity);
        this.box(this.inset(rect, 14), '#352B24', 15, opacity);
        this.box(this.inset(rect, 19), '#152732', 12, opacity);
        const g = this.graphics;
        g.strokeColor = this.color('#38515A', opacity);
        g.lineWidth = 2;
        const inner = this.inset(rect, 25);
        g.roundRect(inner.left, inner.bottom, inner.right - inner.left, inner.top - inner.bottom, 9);
        g.stroke();
        // 大面板使用低对比细刻线，细节留在边缘，不让纹理与正文竞争。
        g.strokeColor = new Color(75, 102, 112, Math.round(opacity * .14));
        g.lineWidth = 1;
        for (let y = rect.bottom + 45; y < rect.top - 35; y += 26) {
            g.moveTo(rect.left + 30, y);
            g.lineTo(rect.right - 30, y);
        }
        g.stroke();
        this.rule(rect.left + 45, rect.right - 45, rect.top - 42, TONES[tone], opacity);
        for (const x of [rect.left + 13, rect.right - 13]) for (const y of [rect.bottom + 35, rect.top - 35]) {
            g.fillColor = this.color('#211B18', opacity);
            g.circle(x, y, 7);
            g.fill();
            g.fillColor = this.color('#C3A46A', opacity);
            g.circle(x - 1, y + 1, 4);
            g.fill();
        }
    }

    public button(rect: PhaseBRect, tone: FirstLevelPanelTone = 'neutral', opacity = 255): void {
        this.box(rect, '#080F17', 18, opacity);
        this.box(this.inset(rect, 3), TONES[tone], 15, opacity);
        this.box(this.inset(rect, 7), tone === 'primary' ? '#25483F' : tone === 'danger' ? '#452B2D' : '#1C303C', 12, opacity);
        this.rule(rect.left + 17, rect.right - 17, rect.top - 11, tone === 'disabled' ? '#63727A' : '#D2BA82', Math.round(opacity * .6));
        this.rule(rect.left + 17, rect.right - 17, rect.bottom + 9, '#070E16', opacity);
    }

    public rule(left: number, right: number, y: number, color = '#89704C', opacity = 255): void {
        const g = this.graphics;
        g.strokeColor = this.color(color, opacity);
        g.lineWidth = 2;
        g.moveTo(left, y);
        g.lineTo(right, y);
        g.stroke();
    }

    private inset(r: PhaseBRect, amount: number): PhaseBRect {
        return { left: r.left + amount, right: r.right - amount, bottom: r.bottom + amount, top: r.top - amount };
    }
    private color(hex: string, opacity: number): Color {
        const c = new Color(hex);
        c.a = opacity;
        return c;
    }
    private box(r: PhaseBRect, color: string, radius: number, opacity: number): void {
        this.graphics.fillColor = this.color(color, opacity);
        this.graphics.roundRect(r.left, r.bottom, r.right - r.left, r.top - r.bottom, radius);
        this.graphics.fill();
    }
}
