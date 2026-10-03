import { Color, Graphics, HorizontalTextAlignment, isValid, Label, Node, resources, Sprite, SpriteFrame, UITransform, VerticalTextAlignment } from 'cc';
import { FirstLevelPageSkinView } from './FirstLevelPageSkinView';
import { FIRST_LEVEL_UI_FONT } from './FirstLevelUiStyle';
import { firstLevelTowerPanelLayout, firstLevelTowerPanelPresentation, type TowerPanelInput } from './FirstLevelTowerPanelPresentation';
import type { PhaseBRect } from './PhaseBLayout';
import { VisibleLabelSlots } from './VisibleLabelSlots';

/** 临时面板独立渲染，不绑定交易或输入；文字已按获批稿缩放，不再乘旧HUD字号系数。 */
export class FirstLevelTowerPanelView {
    private readonly root: Node;
    private readonly fallback: Graphics;
    private readonly skin: FirstLevelPageSkinView;
    private readonly portrait: Sprite;
    private readonly labels = new VisibleLabelSlots();
    private readonly frames = new Map<string,SpriteFrame>();
    private signature = '';
    private snapshot: TowerPanelInput | null = null;
    private width = 1080;

    constructor(parent: Node, private readonly frostPortrait: (level: number) => SpriteFrame | null = () => null) {
        this.root=new Node('QualityV3TowerPanel');this.root.layer=parent.layer;parent.addChild(this.root);
        this.fallback=this.root.addComponent(Graphics);
        this.skin=new FirstLevelPageSkinView(this.root,()=>{this.signature='';this.render(this.snapshot,this.width);});
        const portraitNode=new Node('TowerPanelPortrait');portraitNode.layer=parent.layer;this.root.addChild(portraitNode);
        this.portrait=portraitNode.addComponent(Sprite);this.portrait.sizeMode=Sprite.SizeMode.CUSTOM;this.portrait.trim=false;
        for(const towerId of ['rivet-gun','frost-coil'])resources.load(`level-one/units/${towerId}/spriteFrame`,SpriteFrame,(error,frame)=>{
            // 切场后忽略迟到资源；失败保留带塔名的可操作原生面板，不伪报饰面加载成功。
            if(!isValid(this.root))return;
            if(!error&&frame)this.frames.set(towerId,frame);
            this.signature='';this.render(this.snapshot,this.width);
        });
    }

    public render(input: TowerPanelInput | null, width: number): void {
        this.snapshot=input;this.width=width;this.root.active=Boolean(input);
        // 隐藏态只提交一次诊断，不在战斗每帧重复写DOM；资源回调仍可使签名失效。
        if(!input){this.labels.clear();if(this.signature!=='hidden'){this.signature='hidden';this.skin.begin();this.publish(null);}return;}
        // 头像借用战场同一资源组；异步就绪后纳入签名，面板不用重选也能从旧图回退升级图。
        const frame = input.towerId === 'frost-coil' ? this.frostPortrait(input.level) ?? this.frames.get(input.towerId) : this.frames.get(input.towerId);
        const signature=JSON.stringify([input,width,frame?.uuid]);if(signature===this.signature)return;this.signature=signature;
        const model=firstLevelTowerPanelPresentation(input),layout=firstLevelTowerPanelLayout(width),s=layout.scale;
        this.labels.begin();
        this.skin.begin();this.fallback.clear();
        if(!this.skin.panel(layout.panel,10*s))this.fill(layout.panel,'#162B3D');
        for(const [index,rect,enabled]of [[0,layout.sell,model.saleEnabled],[1,layout.upgrade,model.upgradeEnabled]]as const){
            if(!this.skin.button(index,rect,enabled?(index===1?'primary':'neutral'):'disabled',8*s))this.fill(rect,enabled?'#243C4D':'#24313B');
        }
        this.skin.bodyDivider(layout.divider.left,layout.divider.right,layout.divider.top,s);
        this.portrait.node.active=Boolean(frame);
        if(frame){this.portrait.spriteFrame=frame;this.portrait.node.getComponent(UITransform)!.setContentSize(36*s,36*s);this.portrait.node.setPosition((layout.portrait.left+layout.portrait.right)/2,(layout.portrait.top+layout.portrait.bottom)/2);}
        this.text('title',model.title,layout.title,'#F4E9CD');this.text('badge',model.badge,layout.badge,'#C6A876');
        this.text('role',model.role,layout.role,'#A9BDCA');this.text('close','收起',layout.close,'#A9BDCA',true);
        model.stats.forEach((stat,i)=>{this.text(`caption-${i}`,stat.caption,layout.captions[i],'#A9BDCA');this.text(`value-${i}`,stat.value,layout.values[i],'#F4E9CD');});
        this.text('preview',model.preview,layout.preview,model.invalid?'#E4AAA1':'#BCE4C5');
        this.text('sell',model.sell,{rect:layout.sell,size:layout.actionSize,bold:true},model.saleEnabled?'#F4E9CD':'#A9BDCA',true);
        this.text('upgrade',model.upgrade,{rect:layout.upgrade,size:layout.actionSize,bold:true},model.upgradeEnabled?'#F4E9CD':'#A9BDCA',true);
        this.text('help',model.help,layout.help,'#A9BDCA',true);this.labels.end();this.publish(model);
    }

    public dispose(): void { this.portrait.spriteFrame = null; }

    private fill(rect: PhaseBRect,color:string):void{this.fallback.fillColor=new Color(color);this.fallback.rect(rect.left,rect.bottom,rect.right-rect.left,rect.top-rect.bottom);this.fallback.fill();}
    private text(key:string,value:string,geometry:{rect:PhaseBRect;size:number;bold?:boolean},color:string,center=false):void{
        const label=this.labels.acquire(key,()=>{const node=new Node(`TowerPanel-${key}`);node.layer=this.root.layer;this.root.addChild(node);const created=node.addComponent(Label);created.fontFamily=FIRST_LEVEL_UI_FONT;created.overflow=Label.Overflow.CLAMP;created.enableWrapText=false;created.verticalAlign=VerticalTextAlignment.CENTER;return created;});
        const rect=geometry.rect;label.node.getComponent(UITransform)!.setContentSize(rect.right-rect.left,rect.top-rect.bottom);
        label.node.setPosition((rect.left+rect.right)/2,(rect.top+rect.bottom)/2);
        label.fontSize=geometry.size;label.lineHeight=geometry.size*1.4;label.isBold=Boolean(geometry.bold);
        label.horizontalAlign=center?HorizontalTextAlignment.CENTER:HorizontalTextAlignment.LEFT;label.color=new Color(color);
        if(label.string!==value)label.string=value;
    }
    private publish(model:ReturnType<typeof firstLevelTowerPanelPresentation>|null):void{
        if(typeof document!=='undefined')document.querySelector('canvas')?.setAttribute('data-tower-panel',JSON.stringify({visible:Boolean(model),model,layout:model?firstLevelTowerPanelLayout(this.width):null,assets:this.skin.diagnostics,portraits:Array.from(this.frames.keys()),portraitUuid:model?this.portrait.spriteFrame?.uuid:null}));
    }
}
