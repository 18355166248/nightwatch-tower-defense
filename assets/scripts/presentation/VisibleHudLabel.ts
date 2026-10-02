import type { Color, Label } from 'cc';
import { VisibleViewResource } from './VisibleViewResource';

/** 临时 HUD 文本按可见生命周期持有；隐藏不写字、不保留独立 TTF 纹理。 */
export class VisibleHudLabel {
    private current: Label | null = null;
    private layoutLabel: ((label: Label) => void) | null = null;
    private readonly resource: VisibleViewResource<Label>;

    public constructor(create: () => Label, name: string) {
        this.resource = new VisibleViewResource(() => {
            const label = create();
            label.node.name = name;
            // 窄屏布局可能在首次显示前已更新；新节点必须先继承布局再参与渲染。
            this.layoutLabel?.(label);
            label.node.active = true;
            return label;
        }, label => {
            label.node.removeFromParent();
            label.node.destroy();
        });
    }

    public setVisible(visible: boolean): void {
        this.current = this.resource.setVisible(visible);
    }

    public setLayout(layout: (label: Label) => void): void {
        this.layoutLabel = layout;
        if (this.current) layout(this.current);
    }

    public setText(text: string, color?: Color): void {
        if (!this.current) return;
        this.current.string = text;
        if (color) this.current.color = color;
    }
}
