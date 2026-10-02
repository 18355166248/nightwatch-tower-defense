import { Color, Graphics } from 'cc';
import type { BattleResultViewModel } from './BattleResultViewModel';
import { FirstLevelPanelPainter } from './FirstLevelPanelPainter';
import { PHASE_B_RESULT_HOME_BUTTON, PHASE_B_RESULT_RESTART_BUTTON, PhaseBLayout } from './PhaseBLayout';
import { resultRevealEase } from './ResultRevealRuntime';

/** 结算饰面独立于战场；只消费结算快照，不重新计算成绩或写入纪录。 */
export class FirstLevelResultPainter {
    private readonly chrome: FirstLevelPanelPainter;

    public constructor(private readonly graphics: Graphics, private readonly layout: PhaseBLayout) {
        this.chrome = new FirstLevelPanelPainter(graphics);
    }

    public draw(result: BattleResultViewModel | null, progress: number): void {
        if (!result) return;
        const g = this.graphics;
        const reveal = resultRevealEase(progress);
        const alpha = (value: number) => Math.round(value * reveal);
        const success = result.kind === 'victory';
        const accent = success ? '#7DBCA6' : '#C47768';
        g.fillColor = new Color(7, 12, 21, 232);
        g.rect(-540, -960, 1080, 1920);
        g.fill();
        this.chrome.panel(this.layout.resultPanelRect(), success ? 'primary' : 'danger', alpha(255));
        // 动画只作用于徽章及饰面，触控框不跟随缩放，避免刚结算时按钮点不中。
        g.fillColor = new Color(9, 18, 25, alpha(255));
        g.circle(0, 393, 48);
        g.fill();
        g.strokeColor = new Color(accent);
        g.lineWidth = 3;
        g.circle(0, 393, 44);
        g.stroke();
        g.fillColor = new Color(accent);
        g.circle(0, 393, 26 + 10 * reveal);
        g.fill();
        g.strokeColor = new Color(16, 40, 55, alpha(255));
        g.lineWidth = 7;
        if (success) {
            g.moveTo(-17, 393); g.lineTo(-4, 379); g.lineTo(20, 407);
        } else {
            g.moveTo(-14, 379); g.lineTo(14, 407);
            g.moveTo(-14, 407); g.lineTo(14, 379);
        }
        g.stroke();
        const panel = this.layout.resultPanelRect();
        this.chrome.rule(panel.left + 40, panel.right - 40, 175, '#496068', alpha(150));
        for (const rect of [...this.layout.resultStatRects(), ...this.layout.resultDetailRects()]) {
            g.fillColor = new Color(13, 28, 37, alpha(240));
            g.roundRect(rect.left, rect.bottom, rect.right - rect.left, rect.top - rect.bottom, 10);
            g.fill();
            g.strokeColor = new Color(82, 101, 105, alpha(150));
            g.lineWidth = 2;
            g.roundRect(rect.left, rect.bottom, rect.right - rect.left, rect.top - rect.bottom, 10);
            g.stroke();
        }
        this.chrome.button(this.layout.safeRect(PHASE_B_RESULT_RESTART_BUTTON), 'primary', alpha(255));
        this.chrome.button(this.layout.safeRect(PHASE_B_RESULT_HOME_BUTTON), 'neutral', alpha(255));
    }
}
