import { Color, Graphics, HorizontalTextAlignment, isValid, Label, Node, resources, Sprite, SpriteFrame, UITransform, VerticalTextAlignment } from 'cc';
import { FROST_COIL, RIVET_GUN } from '../config/PhaseBCombatConfig';
import { firstLevelControlRect } from './FirstLevelUiGeometry';
import { FIRST_LEVEL_UI_FONT, FIRST_LEVEL_UI_TEXT_SCALE, firstLevelFontSize } from './FirstLevelUiStyle';
import { firstLevelGuidanceVisible } from './FirstLevelControlPolicy';
import { PHASE_B_CENTER_PAUSE_BUTTON, PHASE_B_EARLY_WAVE_BUTTON,
    PHASE_B_SPEED_BUTTON,
    type PhaseBRect } from './PhaseBLayout';
import type { PhaseBHudState } from './PhaseBHudView';
import { compactTextWidth } from './CompactTextWidth';
import { VisibleLabelSlots } from './VisibleLabelSlots';

type Skin = { node: Node; sprite: Sprite };

/** 图片只负责饰面，不监听触摸、不改经济；文字、绘制和命中共用 PhaseBLayout。 */
export class FirstLevelUiSkinView {
    private readonly root: Node;
    private readonly skins = new Map<string, Skin>();
    private readonly frames = new Map<string, SpriteFrame>();
    private readonly labels = new VisibleLabelSlots();
    private readonly fallback: Graphics;
    private snapshot: PhaseBHudState | null = null;
    private renderedSignature = '';
    // 独立候选开关：同尺寸像素对照通过前不改变正式 HUD。
    private readonly compactText = typeof window !== 'undefined'
        && new URLSearchParams(window.location.search).get('textBudget') === 'tight-hud';
    private readonly textMeasure = this.compactText && typeof document !== 'undefined'
        ? document.createElement('canvas').getContext('2d') : null;

    public constructor(parent: Node) {
        this.root = new Node('QualityV2UiSkins');
        this.root.layer = parent.layer;
        parent.addChild(this.root);
        const fallbackNode = new Node('NativeSkinFallback');
        fallbackNode.layer = parent.layer;
        this.root.addChild(fallbackNode);
        this.fallback = fallbackNode.addComponent(Graphics);
        for (const key of ['hud', 'tray', 'speed', 'next', 'pause', 'rivet-icon', 'frost-icon', 'gold-icon', 'wave-icon', 'core-icon']) {
            const node = new Node(`Skin-${key}`);
            node.layer = parent.layer;
            const sprite = node.addComponent(Sprite);
            sprite.sizeMode = Sprite.SizeMode.CUSTOM;
            sprite.trim = false;
            // 铜框轻压高光；只染饰面，不把文字、角色和战场一起压暗。
            sprite.color = new Color(key.endsWith('-icon') ? '#FFFFFF' : '#C7C7C7');
            node.active = false;
            this.root.addChild(node);
            this.skins.set(key, { node, sprite });
        }
        for (const name of ['gold-coins', 'wave-beacon', 'core-heart']) {
            resources.load(`level-one/ui/${name}/spriteFrame`, SpriteFrame, (error, frame) => {
                if (error || !frame || !isValid(this.root)) return;
                this.frames.set(name, frame);
                this.renderedSignature = '';
                if (this.snapshot) this.render(this.snapshot);
            });
        }
        // 塔栏复用真正的透明战斗素材，不把设计稿带地面的概念肖像当正式图标。
        for (const name of ['rivet-gun', 'frost-coil']) {
            resources.load(`level-one/units/${name}/spriteFrame`, SpriteFrame, (error, frame) => {
                if (error || !frame || !isValid(this.root)) return;
                this.frames.set(name, frame);
                this.renderedSignature = '';
                if (this.snapshot) this.render(this.snapshot);
            });
        }
        for (const name of ['hud-frame', 'tray-frame', 'button-frame', 'disabled-frame']) {
            resources.load(`level-one/ui/quality-v2/${name}/spriteFrame`, SpriteFrame, (error, frame) => {
                // 场景退出后丢弃异步结果；失败时原有 Graphics 和文字仍可操作。
                if (error || !frame || !isValid(this.root)) return;
                this.frames.set(name, frame);
                this.renderedSignature = '';
                if (this.snapshot) this.render(this.snapshot);
            });
        }
    }

    public render(state: PhaseBHudState): void {
        this.snapshot = state;
        this.root.active = !state.qaMode && !state.result && state.entryMode !== 'home';
        if (!this.root.active) {
            // 首页完全盖住战斗HUD；清理文字槽，不保留上一波的隐藏TTF纹理。
            this.labels.clear();
            if (this.renderedSignature !== 'hidden' && typeof document !== 'undefined') {
                document.querySelector('canvas')?.setAttribute('data-first-level-ui', JSON.stringify({
                    version: 'quality-v2', textScale: FIRST_LEVEL_UI_TEXT_SCALE, compactText: this.compactText,
                    loadedFrames: Array.from(this.frames.keys()), labels: [], visible: false,
                }));
            }
            this.renderedSignature = 'hidden';
            return;
        }
        const signature = [state.gold, state.wave, state.totalWaves, state.coreHealth, state.maxCoreHealth,
            state.speedMultiplier, state.showPause, state.phase, state.statusText, state.guidanceText, state.entryMode,
            state.upcomingWave?.wave, state.upcomingWave?.lineup, state.upcomingWave?.tactic,
            state.waveStartButton.label, state.waveStartButton.active, state.activePlacementTowerId,
            state.inspectedUpgrade?.towerId, state.inspectedUpgrade?.level, state.inspectedUpgrade?.cost,
            state.levelTitle,state.inspectedUpgrade?.saleRefund, Boolean(state.towerPanel),Boolean(state.coach?.upcoming)].join('|');
        // Bootstrap 可以每帧提交快照，但静态饰面和文字只按展示字段变化更新。
        // 资源回调会使签名失效，所以迟到的图片不会被缓存挡住。
        if (signature === this.renderedSignature) return;
        this.renderedSignature = signature;
        this.labels.begin();
        this.fallback.clear();
        this.place('hud', 'hud-frame', { left: -516, right: 516, bottom: 784, top: 936 });
        this.place('tray', 'tray-frame', { left: -516, right: 516, bottom: -936, top: -764 });
        const panelVisible = Boolean(state.towerPanel);
        for (const [key, rect, enabled] of [
            ['speed', PHASE_B_SPEED_BUTTON, true],
            ['next', PHASE_B_EARLY_WAVE_BUTTON, state.waveStartButton.active],
            ['pause', PHASE_B_CENTER_PAUSE_BUTTON, state.showPause],
        ] as const) this.place(key, enabled ? 'button-frame' : 'disabled-frame', firstLevelControlRect(rect, true));
        for (const [key, frame, x] of [['rivet-icon', 'rivet-gun', -408], ['frost-icon', 'frost-coil', -88]] as const) {
            this.place(key, frame, { left: x - 56, right: x + 56, bottom: -904, top: -792 });
            this.skins.get(key)!.sprite.color = new Color(state.activePlacementTowerId === frame ? '#FFF0BA'
                : state.gold >= (frame === 'rivet-gun' ? RIVET_GUN.cost : FROST_COIL.cost) ? '#FFFFFF' : '#8B969C');
        }
        for (const [key, frame, x] of [['gold-icon', 'gold-coins', -433], ['wave-icon', 'wave-beacon', -167], ['core-icon', 'core-heart', 95]] as const)
            this.place(key, frame, { left: x - 35, right: x + 35, bottom: 825, top: 895 });
        this.label('gold-caption', '金币', -384, 887, 40, 160, '#B8C6CC');
        this.label('gold', `${state.gold}`, -384, 836, 55, 160, '#F4CF79');
        this.label('wave-caption', '波次', -119, 887, 40, 160, '#B8C6CC');
        this.label('wave', `${state.wave} / ${state.totalWaves}`, -119, 836, 55, 190);
        this.label('core-caption', '核心', 143, 887, 40, 160, '#B8C6CC');
        this.label('core', `${state.coreHealth} / ${state.maxCoreHealth}`, 143, 836, 55, 195, state.coreHealth <= 3 ? '#FF8580' : '#A4EFEA');
        this.label('pause', 'Ⅱ', 415, 861, 64, 100, state.showPause ? '#F4E9CD' : '#AEBBC2', true, true);
        this.label('chapter', state.levelTitle ?? '夜城广场', -480, 744, 40, 700, '#DFD3B8',false,!state.coach?.upcoming);
        this.label('rivet', state.activePlacementTowerId === 'rivet-gun' ? '已选机枪' : '机枪塔', -336, -835, 44, 180,
            state.activePlacementTowerId === 'rivet-gun' ? '#FFE39B' : '#F4E9CD');
        this.label('rivet-price', `${RIVET_GUN.cost}`, -336, -887, 48, 160, state.gold >= RIVET_GUN.cost ? '#F4CF79' : '#AEBBC2');
        this.label('frost', state.activePlacementTowerId === 'frost-coil' ? '已选冷凝' : '冷凝塔', -16, -835, 44, 180,
            state.activePlacementTowerId === 'frost-coil' ? '#8FF4FF' : '#F4E9CD');
        this.label('frost-price', `${FROST_COIL.cost}`, -16, -887, 48, 150, state.gold >= FROST_COIL.cost ? '#F4CF79' : '#AEBBC2');
        this.label('speed', `${state.speedMultiplier}×`, 239, -850, 46, 110, '#F4E9CD', true);
        // 首波/倒计时文案保留显式两行，不能把五六个字挤出窄按钮的内边框。
        const waveText = state.waveStartButton.active ? state.waveStartButton.label
            : state.phase === 'preparing' ? '先布防' : '来袭中';
        this.label('next', waveText, 406, -850, 36, 176, state.waveStartButton.active ? '#F4E9CD' : '#AEBBC2', true);
        // 敌情继承真实波次配置，不能因关闭旧HUD而遗漏混编预告；教学跳过占右侧独立槽。
        this.label('event', state.statusText, -480, 683, 32, 700, '#B8C6CC', false, !state.coach?.upcoming && !panelVisible);
        this.label('tactic', '', -480, 635, 29, 700, '#9DE2CB', false, false);
        this.label('guidance', state.guidanceText, -470, -650, 36, 940, '#DFD3B8', false,
            !state.coach && firstLevelGuidanceVisible(state.phase, state.entryMode === 'guided', state.waveStartButton.active, panelVisible));
        this.label('reset', '↶', -330, -560, 56, 160, '#DFD3B8', true, !panelVisible && !state.coach);
        this.labels.end();
        if (typeof document !== 'undefined') {
            document.querySelector('canvas')?.setAttribute('data-first-level-ui', JSON.stringify({
                // Creator 发布降级不能依赖迭代器展开；显式归一化，避免 Map 被当成单个数组元素。
                version: 'quality-v2', textScale: FIRST_LEVEL_UI_TEXT_SCALE, compactText: this.compactText, loadedFrames: Array.from(this.frames.keys()),
                labels: Array.from(this.labels.entries()).filter(([, label]) => label.node.active)
                    .map(([key, label]) => ({ key, text: label.string, fontSize: label.fontSize })),
            }));
        }
    }

    private label(key: string, text: string, x: number, y: number, baseSize: number, width: number, color = '#F4E9CD', center = false, visible = true): void {
        // 未使用的文字由本次快照结束时释放，重新出现沿用同一字号、矩形和锚点。
        if (!visible) return;
        const label = this.labels.acquire(key, () => {
            const node = new Node(`QualityText-${key}`);
            node.layer = this.root.layer;
            const label = node.addComponent(Label);
            node.getComponent(UITransform)!.setContentSize(width, 90);
            node.getComponent(UITransform)!.setAnchorPoint(center ? .5 : 0, .5);
            label.fontFamily = FIRST_LEVEL_UI_FONT;
            label.fontSize = key === 'pause' || key === 'close' ? baseSize : firstLevelFontSize(baseSize);
            label.lineHeight = label.fontSize * 1.2;
            label.horizontalAlign = center ? HorizontalTextAlignment.CENTER : HorizontalTextAlignment.LEFT;
            label.verticalAlign = VerticalTextAlignment.CENTER;
            label.overflow = Label.Overflow.CLAMP;
            label.enableWrapText = false;
            this.root.addChild(node);
            return label;
        });
        label.node.active = visible;
        label.node.setPosition(x, y);
        // 只在文案变化时改写 Label，重复战斗快照不重复生成文字纹理。
        if (label.string !== text) label.string = text;
        if (this.compactText && this.textMeasure) {
            this.textMeasure.font = `${label.fontSize}px ${label.fontFamily}`;
            const fittedWidth = compactTextWidth(text, width, line => this.textMeasure!.measureText(line).width);
            const transform = label.node.getComponent(UITransform)!;
            // 每次文案变化重新测量；数字增长时可恢复原宽度，按钮命中区不依赖文字节点。
            if (transform.width !== fittedWidth) transform.setContentSize(fittedWidth, 90);
        }
        const tint = new Color(color);
        if (!label.color.equals(tint)) label.color = tint;
    }

    private place(key: string, frameName: string, rect: PhaseBRect, visible = true): void {
        const skin = this.skins.get(key)!;
        const frame = this.frames.get(frameName);
        skin.node.active = visible && Boolean(frame);
        if (!frame) {
            if (visible && !key.endsWith('-icon')) {
                this.fallback.fillColor = new Color('#162B3D');
                this.fallback.roundRect(rect.left, rect.bottom, rect.right - rect.left, rect.top - rect.bottom, 12);
                this.fallback.fill();
            }
            return;
        }
        if (skin.sprite.spriteFrame !== frame) skin.sprite.spriteFrame = frame;
        skin.sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        skin.node.getComponent(UITransform)!.setContentSize(rect.right - rect.left, rect.top - rect.bottom);
        skin.node.setPosition((rect.left + rect.right) / 2, (rect.bottom + rect.top) / 2);
    }
}
