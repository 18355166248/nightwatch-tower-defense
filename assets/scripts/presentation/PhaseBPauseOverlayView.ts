import { Color, Graphics, HorizontalTextAlignment, Label, Node, UITransform, VerticalTextAlignment } from 'cc';
import type { PauseOverlaySnapshot } from '../systems/PauseOverlayRuntime';
import { PHASE_B_DESIGN_HEIGHT, PHASE_B_DESIGN_WIDTH, PHASE_B_PAUSE_BUTTONS, PhaseBLayout, phaseBPauseButtons, phaseBSettingsButtons } from './PhaseBLayout';
import { VisibleViewResource } from './VisibleViewResource';
import { FirstLevelPanelPainter } from './FirstLevelPanelPainter';
import { FIRST_LEVEL_UI_FONT, firstLevelFontSize } from './FirstLevelUiStyle';
import { FirstLevelPageSkinView } from './FirstLevelPageSkinView';
import { firstLevelSettingsPresentation } from './FirstLevelSettingsPresentation';
import { firstLevelConfirmationPresentation, firstLevelConfirmationLayout, type FirstLevelConfirmationScreen } from './FirstLevelConfirmationPresentation';

interface PauseLabels {
    readonly root: Node;
    readonly title: Label;
    readonly subtitle: Label;
    readonly actions: readonly Label[];
    readonly footer: Label;
}

export interface PhaseBPauseViewState {
    readonly pause: PauseOverlaySnapshot;
    readonly wave: number;
    readonly totalWaves: number;
    readonly coreHealth: number;
    readonly maxCoreHealth: number;
    readonly soundEnabled: boolean;
    readonly volumeStep: 1 | 2 | 3 | 4;
    readonly reducedMotion: boolean;
    readonly homeSettingsVisible: boolean;
    readonly speedMultiplier: number;
    readonly routeErrorDetail?: string;
}

/** 暂停层独占画面与按钮文案；不拥有战斗状态或触控分发。 */
export class PhaseBPauseOverlayView {
    private readonly root = new Node('BattlePauseOverlay');
    private readonly graphics: Graphics;
    private readonly chrome: FirstLevelPanelPainter;
    private readonly labels: VisibleViewResource<PauseLabels>;
    private readonly skins: FirstLevelPageSkinView;
    private snapshot: PhaseBPauseViewState | null = null;
    private signature = '';

    public constructor(parent: Node, private readonly layout: PhaseBLayout) {
        this.root.layer = parent.layer;
        this.root.addComponent(UITransform).setContentSize(PHASE_B_DESIGN_WIDTH, PHASE_B_DESIGN_HEIGHT);
        parent.addChild(this.root);
        this.graphics = this.root.addComponent(Graphics);
        this.chrome = new FirstLevelPanelPainter(this.graphics);
        this.skins = new FirstLevelPageSkinView(this.root, () => {
            this.signature = '';
            if (this.snapshot) this.render(this.snapshot);
        });
        this.labels = new VisibleViewResource(() => this.createLabels(), labels => {
            // 暂停结束不再持有整张文字纹理；规则暂停状态、设置和Graphics容器不随文字资源销毁。
            labels.root.removeFromParent();
            labels.root.destroy();
        });
        this.root.active = false;
    }

    public render(state: PhaseBPauseViewState): void {
        this.snapshot = state;
        this.root.active = state.pause.visible || state.homeSettingsVisible;
        const labelsView = this.labels.setVisible(this.root.active);
        if (!labelsView) {
            this.signature = '';
            return;
        }
        const signature = [this.layout.safeHalfWidth, this.layout.visibleDesignWidth, state.pause.screen, state.pause.reason, state.pause.canContinue,
            state.wave, state.totalWaves, state.coreHealth, state.soundEnabled, state.volumeStep, state.reducedMotion,
            state.homeSettingsVisible, state.speedMultiplier, state.routeErrorDetail].join('|');
        if (signature === this.signature) return;
        this.signature = signature;
        // 复用文字节点时清掉确认标题的粗体，不能把上一页的排版状态带进暂停或设置。
        labelsView.title.isBold = false;
        labelsView.subtitle.isBold = false;
        labelsView.footer.isBold = false;
        labelsView.actions.forEach(label => { label.isBold = false; });
        const screen = state.homeSettingsVisible ? 'settings' : state.pause.screen;
        const orientationBlocked = !state.homeSettingsVisible && state.pause.reason === 'orientation';
        const compact = screen !== 'menu' && screen !== 'settings' || orientationBlocked;
        const fullSettings = screen === 'settings';
        const menu = screen === 'menu' && !orientationBlocked;
        const confirmation = !orientationBlocked && (screen === 'confirm-restart' || screen === 'confirm-home');
        const panel = confirmation ? firstLevelConfirmationLayout(this.layout.visibleDesignWidth).panel
            : orientationBlocked ? this.layout.orientationPanelRect()
            : this.layout.pausePanelRect(screen);
        const graphics = this.graphics;
        graphics.clear();
        this.skins.begin();
        graphics.fillColor = new Color(6, 12, 22, confirmation ? 171 : 165);
        graphics.rect(-Math.max(540, this.layout.visibleDesignWidth / 2), -960,
            Math.max(1080, this.layout.visibleDesignWidth), 1920);
        graphics.fill();
        const confirmationBorder = confirmation ? firstLevelConfirmationLayout(this.layout.visibleDesignWidth).scale * 19 : undefined;
        if (!this.skins.panel(panel, confirmationBorder)) this.chrome.panel(panel, screen === 'route-error' || screen === 'confirm-home' ? 'danger' : 'neutral');

        if (fullSettings && !orientationBlocked) {
            this.renderSettings(state, labelsView);
            this.writeDiagnostics('settings', labelsView);
            return;
        }
        if (confirmation) {
            this.renderConfirmation(screen as FirstLevelConfirmationScreen, state, labelsView);
            this.writeDiagnostics(screen, labelsView);
            return;
        }

        labelsView.title.node.setPosition(menu ? 60 : 0, orientationBlocked ? 205 : compact ? 235 : fullSettings ? 550 : 345, 0);
        labelsView.subtitle.node.setPosition(menu ? 60 : 0, orientationBlocked ? 95 : compact ? 165 : fullSettings ? 480 : 280, 0);
        labelsView.footer.node.setPosition(0, orientationBlocked ? -255 : compact ? -285 : fullSettings ? -525 : -335, 0);
        // 弹窗用设计稿实际显示字号：390宽约19.5/11.6/10.8px，不复用战斗HUD的二次缩放。
        labelsView.title.fontSize = menu ? 54 : firstLevelFontSize(orientationBlocked ? 96 : 64);
        labelsView.subtitle.fontSize = menu ? 32 : firstLevelFontSize(orientationBlocked ? 52 : 32);
        labelsView.footer.fontSize = menu ? 30 : firstLevelFontSize(orientationBlocked ? 48 : 28);
        labelsView.title.horizontalAlign = menu ? HorizontalTextAlignment.LEFT : HorizontalTextAlignment.CENTER;
        labelsView.subtitle.horizontalAlign = menu ? HorizontalTextAlignment.LEFT : HorizontalTextAlignment.CENTER;
        labelsView.title.color = new Color(menu ? '#F4E9CD' : '#F4D58D');
        if (menu) this.skins.icon('header-icon', 'pause-icon', { left: -365, right: -259, bottom: 290, top: 396 });
        if (menu) this.skins.headerDivider(panel.left + 50, panel.right - 50, 238);
        labelsView.title.lineHeight = Math.round(labelsView.title.fontSize * 1.25);
        labelsView.subtitle.lineHeight = Math.round(labelsView.subtitle.fontSize * 1.25);
        labelsView.footer.lineHeight = Math.round(labelsView.footer.fontSize * 1.25);
        let labels: readonly string[];
        if (orientationBlocked) {
            labelsView.title.string = '请转回竖屏';
            labels = ['横屏期间战斗已暂停'];
            labelsView.footer.string = '恢复竖屏后，点继续战斗';
        } else if (screen === 'route-error') {
            labelsView.title.string = '路线异常 · 已暂停';
            labels = ['重新部署', '返回首页'];
            labelsView.footer.string = '本局未判胜负，也没有删除敌人';
        } else if (screen === 'settings') {
            labelsView.title.string = state.homeSettingsVisible ? '游戏设置' : '战斗设置';
            labels = [`声音 · ${state.soundEnabled ? '开' : '关'}`, `音量 · ${state.volumeStep * 25}%`,
                `减弱动态 · ${state.reducedMotion ? '开' : '关'}`,
                state.homeSettingsVisible ? '' : `速度 · ${state.speedMultiplier}×`,
                state.homeSettingsVisible ? '返回首页' : '返回暂停'];
            labelsView.footer.string = '偏好保存在本机；不会改变战斗数值';
        } else {
            labelsView.title.string = state.pause.reason === 'lifecycle' ? '后台安全暂停' : '战斗暂停';
            labels = [state.pause.canContinue ? '继续战斗' : '等待返回页面', '回到战前布防', '战斗设置', '返回首页'];
            labelsView.footer.string = state.pause.canContinue ? '战斗已冻结，继续后恢复' : '返回页面后，手动继续战斗';
        }
        labelsView.subtitle.string = screen === 'route-error' ? state.routeErrorDetail ?? '诊断已保存，请重新部署'
            : state.homeSettingsVisible ? '第一关 · 画面与声音' : `第 ${state.wave}/${state.totalWaves} 波 · 核心 ${state.coreHealth}/${state.maxCoreHealth}`;
        labelsView.title.node.getComponent(UITransform)?.setContentSize(menu ? 580 : panel.right - panel.left - 48, orientationBlocked ? 130 : 100);
        labelsView.subtitle.node.getComponent(UITransform)?.setContentSize(menu ? 580 : panel.right - panel.left - 48, orientationBlocked ? 90 : 70);
        labelsView.footer.node.getComponent(UITransform)?.setContentSize(panel.right - panel.left - 48, orientationBlocked ? 90 : 70);
        const buttons = screen === 'settings' ? phaseBSettingsButtons(state.homeSettingsVisible)
            : phaseBPauseButtons(orientationBlocked ? 'settings' : screen);
        labelsView.actions.forEach((label, index) => {
            const button = buttons[index];
            label.node.active = index < labels.length && Boolean(labels[index]);
            if (!label.node.active) return;
            const rect = orientationBlocked
                ? { left: panel.left + 90, right: panel.right - 90, bottom: -90, top: 70 }
                : this.layout.safeRect(button);
            const centerX = (rect.left + rect.right) / 2;
            const centerY = (rect.bottom + rect.top) / 2;
            label.node.setPosition(menu && (index === 0 || index === 3) ? centerX + 55 : centerX,
                menu && (index === 1 || index === 2) ? centerY - 43 : centerY, 0);
            label.string = labels[index];
            label.fontSize = menu ? (index === 0 ? 40 : index === 3 ? 36 : 32) : firstLevelFontSize(orientationBlocked ? 76 : 40);
            label.lineHeight = Math.round(label.fontSize * 1.25);
            label.node.getComponent(UITransform)?.setContentSize(menu && (index === 0 || index === 3) ? 440 : rect.right - rect.left - 36,
                menu ? 65 : rect.top - rect.bottom - 10);
            const tone = orientationBlocked || screen === 'menu' && index === 0 && !state.pause.canContinue ? 'disabled'
                : screen === 'menu' && index === 0 || (screen === 'confirm-restart' && index === 0) ? 'primary'
                    : screen === 'confirm-home' && index === 0 || screen === 'menu' && index === 3 ? 'danger' : 'neutral';
            // 退出饰面按稿件略矮，触控仍使用PhaseBLayout的155高热区；图标和文字共用热区中心。
            const visualRect = menu && index === 3 ? { ...rect, bottom: rect.bottom + 16, top: rect.top - 16 } : rect;
            if (!orientationBlocked && !this.skins.button(index, visualRect, tone)) this.chrome.button(visualRect, tone);
            if (menu) {
                const icon = (['play-icon', 'restart-icon', 'settings-icon', 'home-icon'] as const)[index];
                const x = index === 0 || index === 3 ? centerX - 135 : centerX;
                const y = index === 1 || index === 2 ? centerY + 30 : centerY;
                this.skins.icon(`action-icon-${index}`, icon, { left: x - 33, right: x + 33, bottom: y - 33, top: y + 33 }, tone === 'disabled');
            }
            label.color = new Color('#F4E9CD');
        });
        this.writeDiagnostics(screen, labelsView);
    }

    private writeDiagnostics(screen: string, labelsView: PauseLabels): void {
        if (typeof document !== 'undefined') document.querySelector('canvas')?.setAttribute('data-page-ui', JSON.stringify({
            version: 'quality-v3', screen, ...this.skins.diagnostics,
            labels: [labelsView.title, labelsView.subtitle, ...labelsView.actions, labelsView.footer].filter(label => label.node.active)
                .map(label => ({ text: label.string, fontSize: label.fontSize })),
        }));
    }

    private renderConfirmation(screen: FirstLevelConfirmationScreen, state: PhaseBPauseViewState, labels: PauseLabels): void {
        const copy = firstLevelConfirmationPresentation(screen);
        const layout = firstLevelConfirmationLayout(this.layout.visibleDesignWidth);
        const place = (label: Label, text: string, spec: typeof layout.title, left = true, color = '#F4E9CD', bold = false) => {
            label.node.active = true;
            label.string = text;
            label.fontSize = spec.size;
            label.lineHeight = spec.line;
            label.isBold = bold;
            label.horizontalAlign = left ? HorizontalTextAlignment.LEFT : HorizontalTextAlignment.CENTER;
            label.verticalAlign = VerticalTextAlignment.CENTER;
            label.color = new Color(color);
            const rect = spec.rect;
            label.node.setPosition((rect.left + rect.right) / 2, (rect.bottom + rect.top) / 2);
            label.node.getComponent(UITransform)!.setContentSize(rect.right - rect.left, rect.top - rect.bottom);
        };
        labels.actions.forEach(label => { label.node.active = false; label.isBold = false; });
        place(labels.title, copy.title, layout.title, true, '#F4E9CD', true);
        place(labels.subtitle, `第 ${state.wave} / ${state.totalWaves} 波     核心 ${state.coreHealth} / ${state.maxCoreHealth}`, layout.context, true, '#A9BDCA');
        place(labels.footer, copy.footer, layout.footer, false, '#A9BDCA');
        place(labels.actions[2], copy.kicker, layout.kicker, true, '#C6A876');
        copy.body.forEach((text, index) => place(labels.actions[3 + index], text, layout.body[index], true,
            index === 2 ? '#A9BDCA' : '#F4E9CD'));
        // 获批正文只强调操作后果，分段原生Label保留可编辑文字，不把整行烘焙进图片。
        const prefix = screen === 'confirm-home' ? '当前战斗将结束，' : '恢复开战前的';
        const emphasis = screen === 'confirm-home' ? '本局进度不会保存' : '塔位、等级与金币';
        const body = layout.body[0];
        const segment = (start: number, count: number) => ({ ...body,
            rect: { ...body.rect, left: body.rect.left + start * body.size, right: body.rect.left + (start + count) * body.size } });
        place(labels.actions[3], prefix, segment(0, prefix.length));
        place(labels.actions[6], emphasis, segment(prefix.length, emphasis.length), true, '#F4E9CD', true);
        place(labels.actions[7], '。', segment(prefix.length + emphasis.length, 1));
        this.skins.icon('header-icon', screen === 'confirm-home' ? 'home-icon' : 'restart-icon', layout.icon);
        // 分隔线是原生几何，正文、图标、面板仍复用已批准的无字图片素材。
        this.skins.bodyDivider(layout.divider.left, layout.divider.right, layout.divider.top, layout.scale);
        layout.buttons.forEach((rect, index) => {
            const tone = index === 0 ? 'primary' : 'neutral';
            if (!this.skins.button(index, rect, tone, layout.scale * 9)) this.chrome.button(rect, tone);
            place(labels.actions[index], copy.actions[index], { rect, size: layout.actionSize, line: layout.actionLine }, false,
                screen === 'confirm-home' && index === 1 ? '#D9B2A5' : '#F4E9CD');
        });
    }

    private renderSettings(state: PhaseBPauseViewState, labels: PauseLabels): void {
        const presentation = firstLevelSettingsPresentation({ version: 1, soundEnabled: state.soundEnabled,
            volumeStep: state.volumeStep, reducedMotion: state.reducedMotion }, state.speedMultiplier, state.homeSettingsVisible);
        const place = (label: Label, text: string, x: number, y: number, width: number, size: number, left = false) => {
            label.node.active = true;
            label.string = text;
            label.fontSize = size;
            label.lineHeight = Math.round(size * 1.25);
            label.horizontalAlign = left ? HorizontalTextAlignment.LEFT : HorizontalTextAlignment.CENTER;
            label.color = new Color(size < 32 ? '#A9C4DB' : '#F4E9CD');
            label.node.setPosition(left ? x + width / 2 : x, y);
            label.node.getComponent(UITransform)!.setContentSize(width, 70);
        };
        place(labels.title, state.homeSettingsVisible ? '游戏设置' : '战斗设置', -200, 550, 540, 54, true);
        place(labels.subtitle, '声音与画面 · 偏好自动保存', -200, 480, 560, 30, true);
        place(labels.footer, state.homeSettingsVisible ? '偏好保存在本机 · 不改变战斗数值' : '战斗仍暂停 · 设置不改变战斗数值', 0, -575, 740, 28);
        labels.footer.node.getComponent(UITransform)!.setContentSize(740, 36);
        this.skins.icon('header-icon', 'settings-icon', { left: -360, right: -254, bottom: 495, top: 601 });
        this.skins.headerDivider(-360, 360, 438);
        labels.actions.forEach(label => { label.node.active = false; });
        presentation.choices.forEach((choice, index) => {
            const rect = this.layout.safeRect(choice.rect);
            const tone = choice.selected || choice.action.kind === 'back' ? 'primary' : 'neutral';
            if (!this.skins.button(index, rect, tone)) this.chrome.button(rect, tone);
            place(labels.actions[index], choice.text, (rect.left + rect.right) / 2, (rect.bottom + rect.top) / 2,
                rect.right - rect.left - 16, choice.action.kind === 'back' ? 36 : 34);
        });
        presentation.captions.forEach((caption, index) => place(labels.actions[presentation.choices.length + index],
            caption.text, caption.x, caption.y, caption.width, caption.size, true));
    }

    private createLabels(): PauseLabels {
        const root = new Node('PauseLabels');
        root.layer = this.root.layer;
        root.addComponent(UITransform).setContentSize(PHASE_B_DESIGN_WIDTH, PHASE_B_DESIGN_HEIGHT);
        this.root.addChild(root);
        const title = this.label(64, '#F4D58D', 380, 780, 100, root, 'Title');
        const subtitle = this.label(32, '#D7E6F5', 320, 780, 70, root, 'Subtitle');
        const actions = Array.from({length:18}, (_, index) => this.label(40, '#F5F6F0',
            index < PHASE_B_PAUSE_BUTTONS.length ? (PHASE_B_PAUSE_BUTTONS[index].bottom + PHASE_B_PAUSE_BUTTONS[index].top) / 2 : 0,
            650, 110, root, `Action${index}`));
        const footer = this.label(28, '#A9C4DB', -395, 780, 70, root, 'Footer');
        return {root, title, subtitle, actions, footer};
    }

    private label(fontSize: number, color: string, y: number, width: number, height: number, parent: Node, name: string): Label {
        const node = new Node(name);
        node.layer = parent.layer;
        node.setPosition(0, y, 0);
        const transform = node.addComponent(UITransform);
        const label = node.addComponent(Label);
        transform.setContentSize(width, height);
        label.fontFamily = FIRST_LEVEL_UI_FONT;
        label.fontSize = firstLevelFontSize(fontSize);
        label.lineHeight = Math.round(label.fontSize * 1.25);
        label.color = new Color(color);
        label.horizontalAlign = HorizontalTextAlignment.CENTER;
        label.verticalAlign = VerticalTextAlignment.CENTER;
        label.overflow = Label.Overflow.CLAMP;
        parent.addChild(node);
        return label;
    }
}
