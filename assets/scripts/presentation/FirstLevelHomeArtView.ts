import { isValid, Node, resources, Sprite, SpriteFrame, UITransform } from 'cc';
import type { PhaseBRect } from './PhaseBLayout';

/** 首页只加载无字插画与实际炮塔缩略图；资源迟到不拥有入口状态，离开后也不能重新显示首页。 */
export class FirstLevelHomeArtView {
    private readonly root = new Node('HomeArt');
    private readonly sprites = new Map<string, { node: Node; sprite: Sprite }>();
    private readonly failures = new Set<string>();
    private readonly loaded = new Set<string>();
    private requested = false;

    public constructor(parent: Node, private readonly invalidate: () => void) {
        this.root.layer = parent.layer;
        parent.addChild(this.root);
        this.root.active = false;
    }

    public setVisible(visible: boolean): void {
        this.root.active = visible;
        if (!visible || this.requested) return;
        this.requested = true;
        for (const [name, path] of [
            ['hero','level-one/ui/quality-v3/home-hero/spriteFrame'],
            ['rivet','level-one/units/rivet-gun/spriteFrame'],
            ['frost','level-one/units/frost-coil/spriteFrame'],
        ]) {
            const node = new Node(`HomeArt-${name}`);
            node.layer = this.root.layer;
            const sprite = node.addComponent(Sprite);
            sprite.sizeMode = Sprite.SizeMode.CUSTOM;
            sprite.trim = false;
            this.root.addChild(node);
            this.sprites.set(name,{node,sprite});
            resources.load(path,SpriteFrame,(error,frame)=>{
                if (!isValid(node)) return;
                if (error || !frame) this.failures.add(name);
                else { sprite.spriteFrame = frame; this.loaded.add(name); }
                this.invalidate();
            });
        }
    }

    public setLayout(hero: PhaseBRect, contentWidth: number): void {
        this.place('hero',{left:hero.left+10,right:hero.right-10,bottom:hero.bottom+10,top:hero.top-10});
        const half = Math.min(425,contentWidth/2-22);
        this.place('rivet',{left:-half+12,right:-half+124,bottom:-326,top:-214});
        this.place('frost',{left:28,right:140,bottom:-326,top:-214});
    }

    public get diagnostics(): { loaded: string[]; failures: string[] } {
        return {loaded:Array.from(this.loaded),failures:Array.from(this.failures)};
    }

    private place(name: string, rect: PhaseBRect): void {
        const item = this.sprites.get(name);
        if (!item) return;
        const width = rect.right-rect.left;
        const height = rect.top-rect.bottom;
        // 主视觉保持源图比例，安全区收窄只留边，不将人物/炮塔拉扁。
        const imageWidth = name === 'hero' ? Math.min(width,height*764/450) : width;
        const imageHeight = name === 'hero' ? imageWidth*450/764 : height;
        item.node.getComponent(UITransform)!.setContentSize(imageWidth,imageHeight);
        item.node.setPosition((rect.left+rect.right)/2,(rect.bottom+rect.top)/2);
    }
}
