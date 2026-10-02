import { isValid, Node, resources, Sprite, SpriteFrame, UITransform } from 'cc';
import type { PhaseBRect } from './PhaseBLayout';

/** 单张资源图只增强 HUD 语义；加载失败仍由原文字卡完整表达资源类型。 */
export class HudResourceIconView {
    private readonly node: Node;
    private readonly sprite: Sprite;
    private loaded = false;
    private shouldShow = true;

    public constructor(parent: Node, resourcePath: string, name: string, onReady: () => void) {
        this.node = new Node(name);
        this.node.layer = parent.layer;
        this.node.addComponent(UITransform).setContentSize(52, 52);
        this.sprite = this.node.addComponent(Sprite);
        this.sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        this.sprite.trim = false;
        this.node.active = false;
        parent.addChild(this.node);
        resources.load(resourcePath, SpriteFrame, (error, frame) => {
            if (error || !frame || !isValid(this.node)) return;
            this.sprite.spriteFrame = frame;
            this.sprite.sizeMode = Sprite.SizeMode.CUSTOM;
            this.loaded = true;
            this.node.active = this.shouldShow;
            onReady();
        });
    }

    public get ready(): boolean {
        return this.loaded;
    }

    public setCardRect(rect: PhaseBRect): void {
        const size = Math.min(52, rect.right - rect.left - 16, rect.top - rect.bottom - 10);
        this.node.getComponent(UITransform)?.setContentSize(size, size);
        this.node.setPosition(rect.left + 8 + size / 2, (rect.bottom + rect.top) / 2, 0);
    }

    public setVisible(visible: boolean): void {
        this.shouldShow = visible;
        this.node.active = this.loaded && visible;
    }
}
