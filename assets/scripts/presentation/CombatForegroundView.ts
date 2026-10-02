import { Graphics, Node, UITransform } from 'cc';
import { PHASE_B_DESIGN_HEIGHT, PHASE_B_DESIGN_WIDTH, PhaseBLayout } from './PhaseBLayout';
import type { PhaseBSceneState } from './PhaseBSceneState';
import { CombatFeedbackView } from './CombatFeedbackView';
import type { CombatVisualAnchors } from './CombatVisualAnchors';

/** 弹迹/命中盖在单位上，HUD/暂停层仍在其上；范围圈则留给背景层绘制。 */
export class CombatForegroundView {
    private readonly graphics: Graphics;
    private readonly feedback: CombatFeedbackView;

    public constructor(parent: Node, private readonly layout: PhaseBLayout) {
        const node = new Node('CombatForeground');
        node.layer = parent.layer;
        node.addComponent(UITransform).setContentSize(PHASE_B_DESIGN_WIDTH, PHASE_B_DESIGN_HEIGHT);
        parent.addChild(node);
        this.graphics = node.addComponent(Graphics);
        this.feedback = new CombatFeedbackView(this.graphics, layout);
    }

    public get alignmentDiagnostics(): CombatFeedbackView['alignmentSamples'] { return this.feedback.alignmentSamples; }
    public get rewardAlignmentDiagnostics(): CombatFeedbackView['rewardAlignmentSamples'] { return this.feedback.rewardAlignmentSamples; }
    public render(state: PhaseBSceneState, anchors?: CombatVisualAnchors): void {
        this.graphics.clear();
        this.feedback.alignmentSamples = [];
        this.feedback.rewardAlignmentSamples = [];
        // 结算遮罩由底层 Graphics 绘制；前景事件若继续绘制会穿透结算面板。
        if (state.result) return;
        this.feedback.drawAboveUnits(state, this.layout.boardMetrics(state.grid).cellSize, anchors);
    }
}
