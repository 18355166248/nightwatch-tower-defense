import {
    Color,
    HorizontalTextAlignment,
    Label,
    Node,
    UITransform,
    VerticalTextAlignment,
} from 'cc';
import type { BattleResultViewModel } from './BattleResultViewModel';

export interface PhaseBHudState {
    readonly statusText: string;
    readonly gold: number;
    readonly pathLength: number;
    readonly wave: number;
    readonly totalWaves: number;
    readonly coreHealth: number;
    readonly phaseText: string;
    readonly result: BattleResultViewModel | null;
}

/** 管理程序化 HUD 节点与结算文案，Bootstrap 只提供展示快照。 */
export class PhaseBHudView {
    private readonly titleLabel: Label;
    private readonly statusLabel: Label;
    private readonly helpLabel: Label;
    private readonly resultTitleLabel: Label;
    private readonly resultSummaryLabel: Label;
    private readonly resultActionLabel: Label;

    public constructor(parent: Node) {
        this.titleLabel = this.createLabel(parent, 46, new Color('#F4D58D'), 850);
        this.statusLabel = this.createLabel(parent, 27, new Color('#D7E6F5'), 755);
        this.statusLabel.node.getComponent(UITransform)?.setContentSize(920, 125);
        this.helpLabel = this.createLabel(parent, 25, new Color('#8FA9C4'), -945);
        this.resultTitleLabel = this.createCenteredLabel(parent, 64, new Color('#F4D58D'), 230, 760, 100);
        this.resultSummaryLabel = this.createCenteredLabel(parent, 34, new Color('#D7E6F5'), 25, 760, 190);
        this.resultActionLabel = this.createCenteredLabel(parent, 38, new Color('#101827'), -218, 600, 120);
    }

    public render(state: PhaseBHudState): void {
        const result = state.result;
        this.titleLabel.node.active = !result;
        this.statusLabel.node.active = !result;
        this.helpLabel.node.active = !result;
        this.resultTitleLabel.node.active = Boolean(result);
        this.resultSummaryLabel.node.active = Boolean(result);
        this.resultActionLabel.node.active = Boolean(result);

        if (!result) {
            this.titleLabel.string = '夜城防线 · Phase B 八波灰盒';
            this.statusLabel.string = `${state.statusText}\n金币 ${state.gold} · 路径 ${state.pathLength} 格 · 波次 ${state.wave}/${state.totalWaves} · 核心 ${state.coreHealth} · ${state.phaseText}`;
            this.helpLabel.string = '先建 2 塔且路径 +2｜倒计时可提前开波｜F/G/H样例 R重置 Enter重试｜底部机枪塔';
            return;
        }
        this.resultTitleLabel.string = result.title;
        this.resultTitleLabel.color = new Color(result.kind === 'victory' ? '#79E0AD' : '#FF8580');
        this.resultSummaryLabel.string = result.summary;
        this.resultActionLabel.string = result.actionLabel;
    }

    private createLabel(parent: Node, fontSize: number, color: Color, y: number): Label {
        const node = new Node('Label');
        node.layer = parent.layer;
        node.setPosition(-460, y, 0);
        const transform = node.addComponent(UITransform);
        const label = node.addComponent(Label);
        // Label 挂载时会初始化 UITransform，尺寸必须在挂载后设置，否则 SHRINK 会把按钮字压成细线。
        transform.setContentSize(920, 80);
        transform.setAnchorPoint(0, 0.5);
        label.fontSize = fontSize;
        label.lineHeight = Math.round(fontSize * 1.25);
        label.color = color;
        label.overflow = Label.Overflow.NONE;
        parent.addChild(node);
        return label;
    }

    private createCenteredLabel(parent: Node, fontSize: number, color: Color, y: number, width: number, height: number): Label {
        const node = new Node('ResultLabel');
        node.layer = parent.layer;
        node.setPosition(0, y, 0);
        const label = node.addComponent(Label);
        const transform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
        transform.setContentSize(width, height);
        transform.setAnchorPoint(0.5, 0.5);
        label.fontSize = fontSize;
        label.lineHeight = Math.round(fontSize * 1.35);
        label.color = color;
        label.horizontalAlign = HorizontalTextAlignment.CENTER;
        label.verticalAlign = VerticalTextAlignment.CENTER;
        label.overflow = Label.Overflow.CLAMP;
        node.active = false;
        parent.addChild(node);
        return label;
    }
}
