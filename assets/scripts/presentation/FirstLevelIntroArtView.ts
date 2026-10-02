import { Color, Graphics, HorizontalTextAlignment, isValid, Label, Node, resources, Sprite, SpriteFrame, UITransform, VerticalTextAlignment } from 'cc';
import { FIRST_LEVEL_UI_FONT, firstLevelFontSize } from './FirstLevelUiStyle';

const INTRO_UNITS = [
    { name: '机枪', path: 'level-one/units/rivet-gun/spriteFrame', x: -235, accent: '#D8AD68' },
    { name: '冷凝', path: 'level-one/units/frost-coil/spriteFrame', x: 0, accent: '#7EDCE7' },
    { name: '来袭', path: 'level-one/units/clockwork-infantry/spriteFrame', x: 235, accent: '#E4A087' },
] as const;

/** 入场卡复用游戏里的真实单位切图；异步缺图只影响插画，说明和开局按钮始终可用。 */
export class FirstLevelIntroArtView {
    private readonly root = new Node('FirstLevelIntroArt');
    private readonly graphics: Graphics;
    private readonly units: { image: Node; caption: Node }[] = [];
    private spacing = 235;

    public constructor(parent: Node) {
        this.root.layer = parent.layer;
        this.root.addComponent(UITransform).setContentSize(760, 260);
        parent.addChild(this.root);
        this.graphics = this.root.addComponent(Graphics);
        this.drawCards();
        for (const unit of INTRO_UNITS) this.createUnit(unit);
        this.root.active = false;
    }

    public setVisible(visible: boolean): void {
        const restored = visible && !this.root.active;
        this.root.active = visible;
        // Cocos隐藏Graphics子树后可能释放提交网格；回到首页必须重建卡面，不能只恢复Sprite。
        if (restored) this.drawCards();
    }

    public setContentWidth(width: number): void {
        const spacing = Math.min(235, Math.max(0, (width - 188) / 2));
        if (spacing === this.spacing) return;
        this.spacing = spacing;
        this.drawCards();
        this.units.forEach(({ image, caption }, index) => {
            const x = (index - 1) * spacing;
            image.setPosition(x, 185, 0);
            caption.setPosition(x, 85, 0);
        });
    }

    private drawCards(): void {
        this.graphics.clear();
        INTRO_UNITS.forEach((unit, index) => {
            const x = (index - 1) * this.spacing;
            this.graphics.fillColor = new Color('#152732');
            this.graphics.roundRect(x - 94, 54, 188, 226, 24);
            this.graphics.fill();
            this.graphics.strokeColor = new Color(unit.accent);
            this.graphics.lineWidth = 3;
            this.graphics.roundRect(x - 94, 54, 188, 226, 24);
            this.graphics.stroke();
            this.graphics.fillColor = new Color(unit.accent);
            this.graphics.circle(x, 185, 67);
            this.graphics.fill();
            this.graphics.fillColor = new Color('#10202B');
            this.graphics.circle(x, 185, 61);
            this.graphics.fill();
        });
    }

    private createUnit(unit: typeof INTRO_UNITS[number]): void {
        const image = new Node(`Intro${unit.name}`);
        image.layer = this.root.layer;
        image.setPosition(unit.x, 185, 0);
        image.addComponent(UITransform).setContentSize(160, 160);
        const sprite = image.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        this.root.addChild(image);

        const caption = new Node(`Intro${unit.name}Caption`);
        caption.layer = this.root.layer;
        caption.setPosition(unit.x, 85, 0);
        caption.addComponent(UITransform).setContentSize(170, 48);
        const label = caption.addComponent(Label);
        label.string = unit.name;
        label.fontFamily = FIRST_LEVEL_UI_FONT;
        label.fontSize = firstLevelFontSize(32);
        label.lineHeight = firstLevelFontSize(40);
        label.color = new Color('#F5EAD4');
        label.horizontalAlign = HorizontalTextAlignment.CENTER;
        label.verticalAlign = VerticalTextAlignment.CENTER;
        label.overflow = Label.Overflow.CLAMP;
        this.root.addChild(caption);

        this.units.push({ image, caption });

        resources.load(unit.path, SpriteFrame, (error, frame) => {
            if (error || !frame || !isValid(image)) return;
            sprite.spriteFrame = frame;
        });
    }
}
