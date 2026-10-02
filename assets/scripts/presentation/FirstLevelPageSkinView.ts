import { Color, Graphics, isValid, Node, resources, Sprite, SpriteFrame, UITransform } from 'cc';
import type { PhaseBRect } from './PhaseBLayout';
import type { FirstLevelPanelTone } from './FirstLevelPanelPainter';

type PageAsset = 'panel' | 'primary' | 'secondary' | 'danger' | 'pause-icon' | 'play-icon' | 'restart-icon' | 'settings-icon' | 'home-icon';
type Skin = { readonly node: Node; readonly sprite: Sprite };
const ASSETS: readonly PageAsset[] = ['panel', 'primary', 'secondary', 'danger', 'pause-icon', 'play-icon', 'restart-icon', 'settings-icon', 'home-icon'];

/** 页面共用饰面：图片不包含文字、热区或状态机，迟到的资源只触发当前快照重绘。 */
export class FirstLevelPageSkinView {
    private readonly root: Node;
    private readonly iconRoot: Node;
    private readonly frames = new Map<PageAsset, SpriteFrame>();
    private readonly skins = new Map<string, Skin>();
    private readonly failures = new Set<PageAsset>();
    private readonly separators: Graphics;

    public constructor(parent: Node, private readonly invalidate: () => void) {
        this.root = new Node('QualityV3PageSkins');
        this.root.layer = parent.layer;
        parent.addChild(this.root);
        // 饰面与图标分开层容器，图标先到、按钮后到时也保持图标在按钮上方。
        this.iconRoot = new Node('QualityV3PageIcons');
        this.iconRoot.layer = parent.layer;
        parent.addChild(this.iconRoot);
        const separatorNode = new Node('PageSemanticSeparators');
        separatorNode.layer = parent.layer;
        separatorNode.addComponent(UITransform).setContentSize(1080, 1920);
        parent.addChild(separatorNode);
        this.separators = separatorNode.addComponent(Graphics);
        for (const name of ASSETS) resources.load(`level-one/ui/quality-v3/${name}/spriteFrame`, SpriteFrame, (error, frame) => {
            // 页面销毁后不再落异步结果；失败显式记入诊断，不能把临时原生兜底误报为视觉达标。
            if (!isValid(this.root)) return;
            if (error || !frame) this.failures.add(name);
            else {
                if (!name.endsWith('-icon')) {
                    const inset = name === 'panel' ? 42 : 24;
                    frame.insetLeft = inset; frame.insetRight = inset;
                    frame.insetTop = inset; frame.insetBottom = inset;
                }
                this.frames.set(name, frame);
            }
            this.invalidate();
        });
    }

    public begin(): void {
        // 同一视图从暂停切设置时先隐藏旧槽，防止上页图标或按钮留在新页下方。
        for (const skin of this.skins.values()) skin.node.active = false;
        this.separators.clear();
    }

    public headerDivider(left: number, right: number, y: number): void {
        this.separators.strokeColor = new Color('#92754C');
        this.separators.lineWidth = 1.5;
        this.separators.moveTo(left, y); this.separators.lineTo(-14, y);
        this.separators.moveTo(14, y); this.separators.lineTo(right, y);
        this.separators.stroke();
    }

    public bodyDivider(left: number, right: number, y: number, width: number): void {
        // 与图标同属饰面上层；画在暂停Graphics上会被异步加载的实心底板遮掉。
        this.separators.fillColor = new Color('#6B604B');
        this.separators.rect(left, y - width, right - left, width);
        this.separators.fill();
    }

    public panel(rect: PhaseBRect, borderWidth?: number): boolean {
        return this.place('panel', 'panel', rect, '#FFFFFF', borderWidth === undefined ? 1 : borderWidth / 42);
    }

    public button(slot: number, rect: PhaseBRect, tone: FirstLevelPanelTone, borderWidth?: number): boolean {
        return this.place(`button-${slot}`, tone === 'primary' ? 'primary' : tone === 'danger' ? 'danger' : 'secondary', rect,
            tone === 'disabled' ? '#65717C' : '#FFFFFF', borderWidth === undefined ? 1 : borderWidth / 24);
    }

    public icon(slot: string, asset: PageAsset, rect: PhaseBRect, disabled = false): void {
        this.place(slot, asset, rect, disabled ? '#7D8C98' : '#FFFFFF');
    }

    public get diagnostics(): { loaded: string[]; failures: string[]; visibleSlots: string[] } {
        return { loaded: Array.from(this.frames.keys()), failures: Array.from(this.failures),
            visibleSlots:Array.from(this.skins.entries()).filter(([,skin])=>skin.node.active).map(([slot])=>slot) };
    }

    private place(slot: string, asset: PageAsset, rect: PhaseBRect, tint = '#FFFFFF', borderScale = 1): boolean {
        const frame = this.frames.get(asset);
        if (!frame) return false;
        let skin = this.skins.get(slot);
        if (!skin) {
            const node = new Node(`PageSkin-${slot}`);
            node.layer = this.root.layer;
            const sprite = node.addComponent(Sprite);
            sprite.sizeMode = Sprite.SizeMode.CUSTOM;
            sprite.trim = false;
            (asset.endsWith('-icon') ? this.iconRoot : this.root).addChild(node);
            // 首屏资源乱序返回时，底板可能最后创建；固定在最底层，不能遮住先到的按钮和图标。
            if (slot === 'panel') node.setSiblingIndex(0);
            skin = { node, sprite };
            this.skins.set(slot, skin);
        }
        skin.node.active = true;
        skin.sprite.spriteFrame = frame;
        skin.sprite.type = asset.endsWith('-icon') ? Sprite.Type.SIMPLE : Sprite.Type.SLICED;
        skin.sprite.color = new Color(tint);
        // 九宫格源切片宽度与稿件显示边框不同；只缩放饰面节点，整体矩形和输入热区保持不变。
        skin.node.setScale(borderScale, borderScale, 1);
        skin.node.getComponent(UITransform)!.setContentSize((rect.right - rect.left) / borderScale, (rect.top - rect.bottom) / borderScale);
        skin.node.setPosition((rect.left + rect.right) / 2, (rect.bottom + rect.top) / 2);
        return true;
    }
}
