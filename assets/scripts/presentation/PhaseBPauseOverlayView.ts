import { Color, Graphics, HorizontalTextAlignment, Label, Node, UITransform, VerticalTextAlignment } from 'cc';
import type { PauseOverlaySnapshot } from '../systems/PauseOverlayRuntime';
import { PHASE_B_DESIGN_HEIGHT, PHASE_B_DESIGN_WIDTH, PHASE_B_PAUSE_BUTTONS, PhaseBLayout, phaseBPauseButtons } from './PhaseBLayout';

export interface PhaseBPauseViewState {
    readonly pause: PauseOverlaySnapshot;
    readonly wave: number;
    readonly totalWaves: number;
    readonly coreHealth: number;
    readonly maxCoreHealth: number;
    readonly soundEnabled: boolean;
    readonly speedMultiplier: number;
}

/** 暂停层独占画面与按钮文案；不拥有战斗状态或触控分发。 */
export class PhaseBPauseOverlayView {
    private readonly root = new Node('BattlePauseOverlay');
    private readonly graphics: Graphics;
    private readonly title: Label;
    private readonly subtitle: Label;
    private readonly actions: readonly Label[];
    private readonly footer: Label;
    private signature = '';

    public constructor(parent: Node, private readonly layout: PhaseBLayout) {
        this.root.layer = parent.layer;
        this.root.addComponent(UITransform).setContentSize(PHASE_B_DESIGN_WIDTH, PHASE_B_DESIGN_HEIGHT);
        parent.addChild(this.root);
        this.graphics = this.root.addComponent(Graphics);
        this.title = this.label(64, '#F4D58D', 380, 780, 100);
        this.subtitle = this.label(32, '#D7E6F5', 320, 780, 70);
        this.actions = PHASE_B_PAUSE_BUTTONS.map((rect) => this.label(40, '#F5F6F0', (rect.bottom + rect.top) / 2, 650, 110));
        this.footer = this.label(28, '#A9C4DB', -395, 780, 70);
        this.root.active = false;
    }

    public render(state: PhaseBPauseViewState): void {
        this.root.active = state.pause.visible;
        if (!state.pause.visible) {
            this.signature = '';
            return;
        }
        const signature = [this.layout.safeHalfWidth, state.pause.screen, state.pause.reason, state.pause.canContinue,
            state.wave, state.totalWaves, state.coreHealth, state.soundEnabled, state.speedMultiplier].join('|');
        if (signature === this.signature) return;
        this.signature = signature;
        const screen = state.pause.screen;
        const compact = screen !== 'menu';
        const panel = this.layout.pausePanelRect(screen);
        const graphics = this.graphics;
        graphics.clear();
        graphics.fillColor = new Color(6, 12, 22, 229);
        graphics.rect(-540, -960, 1080, 1920);
        graphics.fill();
        graphics.fillColor = new Color('#1A2C40');
        graphics.roundRect(panel.left, panel.bottom, panel.right - panel.left, panel.top - panel.bottom, 34);
        graphics.fill();
        graphics.fillColor = new Color('#C79958');
        graphics.rect(panel.left, panel.top - 45, panel.right - panel.left, 45);
        graphics.fill();

        this.title.node.setPosition(0, compact ? 235 : 380, 0);
        this.subtitle.node.setPosition(0, compact ? 175 : 320, 0);
        this.footer.node.setPosition(0, compact ? -280 : -395, 0);
        let labels: readonly string[];
        if (screen === 'settings') {
            this.title.string = '战斗设置';
            labels = [`音效 · ${state.soundEnabled ? '开' : '关'}`, `速度 · ${state.speedMultiplier}×`, '返回暂停'];
            this.footer.string = '设置仅影响当前局；暂停期间不会推进战斗';
        } else if (screen === 'confirm-restart' || screen === 'confirm-home') {
            const home = screen === 'confirm-home';
            this.title.string = home ? '返回首页？' : '回到战前布防？';
            labels = [home ? '确认返回首页' : '确认重新部署', '取消'];
            this.footer.string = home ? '本局进度将清空；最快纪录保留' : '恢复开战前塔位；本局击杀与金币清零';
        } else {
            this.title.string = state.pause.reason === 'lifecycle' ? '后台安全暂停' : '战斗暂停';
            labels = [state.pause.canContinue ? '继续战斗' : '等待返回页面', '回到战前布防', '战斗设置', '返回首页'];
            this.footer.string = '敌人、倒计时、弹道与局内计时均已冻结';
        }
        this.subtitle.string = `第 ${state.wave}/${state.totalWaves} 波 · 核心 ${state.coreHealth}/${state.maxCoreHealth}`;
        this.title.node.getComponent(UITransform)?.setContentSize(panel.right - panel.left - 48, 100);
        this.subtitle.node.getComponent(UITransform)?.setContentSize(panel.right - panel.left - 48, 70);
        this.footer.node.getComponent(UITransform)?.setContentSize(panel.right - panel.left - 48, 70);
        const buttons = phaseBPauseButtons(screen);
        this.actions.forEach((label, index) => {
            const button = buttons[index];
            label.node.active = index < labels.length;
            if (!label.node.active) return;
            const rect = this.layout.safeRect(button);
            label.node.setPosition(0, (rect.bottom + rect.top) / 2, 0);
            label.string = labels[index];
            label.node.getComponent(UITransform)?.setContentSize(rect.right - rect.left - 24, rect.top - rect.bottom - 10);
            graphics.fillColor = new Color(screen === 'menu' && index === 0 && state.pause.canContinue
                ? '#79CBA5' : screen === 'menu' && index === 3 ? '#6A4550' : '#354B61');
            graphics.roundRect(rect.left, rect.bottom, rect.right - rect.left, rect.top - rect.bottom, 20);
            graphics.fill();
            label.color = new Color(screen === 'menu' && index === 0 && state.pause.canContinue ? '#132B32' : '#F5F6F0');
        });
    }

    private label(fontSize: number, color: string, y: number, width: number, height: number): Label {
        const node = new Node('PauseLabel');
        node.layer = this.root.layer;
        node.setPosition(0, y, 0);
        const transform = node.addComponent(UITransform);
        const label = node.addComponent(Label);
        transform.setContentSize(width, height);
        label.fontSize = fontSize;
        label.lineHeight = Math.round(fontSize * 1.25);
        label.color = new Color(color);
        label.horizontalAlign = HorizontalTextAlignment.CENTER;
        label.verticalAlign = VerticalTextAlignment.CENTER;
        label.overflow = Label.Overflow.CLAMP;
        this.root.addChild(node);
        return label;
    }
}
