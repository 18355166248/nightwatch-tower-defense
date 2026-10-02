import { Color, Graphics } from 'cc';
import { PhaseBLayout, type PhaseBRect } from './PhaseBLayout';

/** 只负责第一关 HUD 的非交互饰面；文字、资源值和点击区域仍由原有视图与布局持有。 */
export class FirstLevelHudChromeView {
    public constructor(private readonly graphics: Graphics, private readonly layout: PhaseBLayout) {}

    public draw(coreHealth: number): void {
        const safeHalf = this.layout.safeHalfWidth;
        const coreCritical = coreHealth <= 3;
        this.panel({ left: -Math.min(485, safeHalf), right: Math.min(485, safeHalf), bottom: 712, top: 927 }, 24);
        this.panel({ left: -Math.min(500, safeHalf), right: Math.min(500, safeHalf), bottom: -950, top: -485 }, 25);

        // 四张卡始终由 PhaseBLayout 计算，窄屏裁切时饰面与数值 Label 共用边界。
        const accents = ['#E6B85B', '#81D9DD', '#A7BCD7', coreCritical ? '#EF8A7F' : '#7AD7A8'];
        this.layout.hudCardRects().forEach((rect, index) => {
            this.graphics.fillColor = new Color('#1B2C3F');
            this.graphics.roundRect(rect.left, rect.bottom, rect.right - rect.left, rect.top - rect.bottom, 13);
            this.graphics.fill();
            // 危急时用整张核心卡的描边承载警示，避免青色心形素材掩盖红色数字。
            this.graphics.strokeColor = index === 3 && coreCritical
                ? new Color(255, 133, 128, 240)
                : new Color(165, 124, 72, 190);
            this.graphics.lineWidth = index === 3 && coreCritical ? 5 : 3;
            this.graphics.roundRect(rect.left, rect.bottom, rect.right - rect.left, rect.top - rect.bottom, 13);
            this.graphics.stroke();
            this.graphics.fillColor = new Color(accents[index]);
            this.graphics.roundRect(rect.left + 10, rect.top - 8, rect.right - rect.left - 20, 4, 2);
            this.graphics.fill();
        });
        this.graphics.strokeColor = new Color(170, 126, 72, 145);
        this.graphics.lineWidth = 3;
        this.graphics.moveTo(-safeHalf + 18, 787);
        this.graphics.lineTo(safeHalf - 18, 787);
        this.graphics.stroke();
        this.graphics.moveTo(-safeHalf + 18, -729);
        this.graphics.lineTo(safeHalf - 18, -729);
        this.graphics.stroke();
    }

    private panel(rect: PhaseBRect, radius: number): void {
        const { left, bottom, right, top } = rect;
        this.graphics.fillColor = new Color(12, 23, 37, 224);
        this.graphics.roundRect(left, bottom, right - left, top - bottom, radius);
        this.graphics.fill();
        this.graphics.strokeColor = new Color(174, 124, 67, 210);
        this.graphics.lineWidth = 4;
        this.graphics.roundRect(left + 2, bottom + 2, right - left - 4, top - bottom - 4, radius - 2);
        this.graphics.stroke();
    }
}
