import { towerPortraitPath } from '../config/TowerCatalog';
import { towerDefinition } from '../config/TowerCatalog';
import { nextUpgradeCost } from '../systems/TowerLevelRules';
import { FROST_UPGRADE_PATHS, FROST_UPGRADE_SPECS } from './FrostUpgradeArt';
import { FROST_COIL_LAYER_SPEC, RIVET_GUN_LAYER_SPEC } from './LayeredTowerGeometry';
import { LayeredTowerRig } from './LayeredTowerRig';
import { poseDirectionalTowerHead } from './EightDirectionTowerView';
import { RIVET_HEAD_REGISTRATIONS } from './RivetHeadRegistrations';
import { rivetHeadResourcePath } from './RivetHeadResourcePaths';
import { Color, Graphics, HorizontalTextAlignment, isValid, Label, Node, resources, Sprite, SpriteFrame, UITransform, VerticalTextAlignment } from 'cc';
import { FirstLevelPageSkinView } from './FirstLevelPageSkinView';
import { FIRST_LEVEL_UI_FONT } from './FirstLevelUiStyle';
import { firstLevelTowerPanelDetail, firstLevelTowerPanelLayout, firstLevelTowerPanelPresentation, type TowerPanelInput } from './FirstLevelTowerPanelPresentation';
import type { PhaseBRect } from './PhaseBLayout';
import { VisibleLabelSlots } from './VisibleLabelSlots';

function nextUpgradeCostForView(input: TowerPanelInput): number | null {
    return nextUpgradeCost(towerDefinition(input.towerId),input.level);
}

/** 临时面板独立渲染，不绑定交易或输入；文字已按获批稿缩放，不再乘旧HUD字号系数。 */
export class FirstLevelTowerPanelView {
    private readonly root: Node;
    private readonly fallback: Graphics;
    private readonly skin: FirstLevelPageSkinView;
    private readonly portrait: Sprite;
    private readonly labels = new VisibleLabelSlots();
    private readonly frames = new Map<string,SpriteFrame>();
    private signature = '';
    private readonly artFrames = new Map<string, SpriteFrame>();
    private readonly requested = new Set<string>();
    private readonly failed = new Set<string>();
    private readonly flatPortraits = new Map<number, Sprite>();
    private readonly rigs = new Map<number, { id: string; node: Node }>();
    private disposed = false;
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
        // 塔位圆环可以覆盖场景和HUD，出现时置顶，不通过挪动圆心来避让。
        if(input&&this.root.parent&&this.root.getSiblingIndex()!==this.root.parent.children.length-1)
            this.root.setSiblingIndex(this.root.parent.children.length-1);
        // 隐藏态只提交一次诊断，不在战斗每帧重复写DOM；资源回调仍可使签名失效。
        if(!input){this.labels.clear();if(this.signature!=='hidden'){this.signature='hidden';this.skin.begin();this.publish(null);}return;}
        // 头像借用战场同一资源组；异步就绪后纳入签名，面板不用重选也能从旧图回退升级图。
        const frame = input.towerId === 'frost-coil' ? this.frostPortrait(input.level) ?? this.frames.get(input.towerId) : this.frames.get(input.towerId);
        const signature=JSON.stringify([input,width,frame?.uuid]);if(signature===this.signature)return;this.signature=signature;
        if (!input.placement) { this.renderUpgrade(input); return; }
        for (const rig of this.rigs.values()) rig.node.active = false;
        for (const sprite of this.flatPortraits.values()) sprite.node.active = false;
        const model=firstLevelTowerPanelPresentation(input),layout=firstLevelTowerPanelLayout(width, Boolean(input.placement), input.anchor),s=layout.scale;
        this.labels.begin();
        this.skin.begin();this.fallback.clear();
        if(!this.skin.panel(layout.panel,10*s))this.fill(layout.panel,'#162B3D');
        for(const [index,rect,enabled]of [[0,layout.sell,model.saleEnabled],[1,layout.upgrade,model.upgradeEnabled]]as const){
            if(!this.skin.button(index,rect,enabled?(index===1?'primary':'neutral'):'disabled',8*s))this.fill(rect,enabled?'#243C4D':'#24313B');
        }
        if (!input.placement) this.skin.bodyDivider(layout.divider.left,layout.divider.right,layout.divider.top,s);
        this.portrait.node.active=Boolean(frame) && !input.placement;
        if(frame){this.portrait.spriteFrame=frame;this.portrait.node.getComponent(UITransform)!.setContentSize(36*s,36*s);this.portrait.node.setPosition((layout.portrait.left+layout.portrait.right)/2,(layout.portrait.top+layout.portrait.bottom)/2);}
        this.text('title',model.title,layout.title,'#F4E9CD');this.text('badge',model.badge,layout.badge,'#C6A876');
        if (!input.placement) this.text('role',model.role,layout.role,'#A9BDCA');this.text('close','收起',layout.close,'#A9BDCA',true);
        if (!input.placement) model.stats.forEach((stat,i)=>{this.text(`caption-${i}`,stat.caption,layout.captions[i],'#A9BDCA');this.text(`value-${i}`,stat.value,layout.values[i],'#F4E9CD');});
        this.text('preview',model.preview,layout.preview,model.invalid?'#E4AAA1':'#BCE4C5');
        this.text('sell',model.sell,{rect:layout.sell,size:layout.actionSize,bold:true},model.saleEnabled?'#F4E9CD':'#A9BDCA',true);
        this.text('upgrade',model.upgrade,{rect:layout.upgrade,size:layout.actionSize,bold:true},model.upgradeEnabled?'#F4E9CD':'#A9BDCA',true);
        if (!input.placement) this.text('help',model.help,layout.help,'#A9BDCA',true);this.labels.end();this.publish(model);
    }

    public dispose(): void {
        this.disposed = true; this.portrait.spriteFrame = null;
        for (const rig of this.rigs.values()) rig.node.destroy(); this.rigs.clear();
        for (const sprite of this.flatPortraits.values()) { sprite.spriteFrame=null; sprite.node.destroy(); } this.flatPortraits.clear();
        for (const frame of this.artFrames.values()) frame.decRef(); this.artFrames.clear();
    }

    private loadArt(path: string): SpriteFrame | null {
        if (!this.requested.has(path)) {
            this.requested.add(path);
            resources.load(path,SpriteFrame,(error,frame)=>{
                // 等级切换后资源回调只重绘当前快照；销毁后不再持有帧或回填旧面板。
                if (this.disposed || !isValid(this.root)) return;
                if (!error && frame) { frame.addRef(); this.artFrames.set(path,frame); }
                else this.failed.add(path);
                this.signature=''; this.render(this.snapshot,this.width);
            });
        }
        return this.artFrames.get(path) ?? null;
    }

    private renderUpgrade(input: TowerPanelInput): void {
        const model=firstLevelTowerPanelPresentation(input), g=firstLevelTowerPanelLayout(this.width,false,input.anchor), s=g.scale;
        const recycle=this.flatPortraits.get(2);if(recycle)recycle.node.active=false;
        this.portrait.node.active=false; this.skin.begin(); this.fallback.clear(); this.labels.begin();
        if (g.ring && input.anchor) {
            this.round(g.upgrade,model.upgradeEnabled?'#215047':'#203039',model.upgradeEnabled?'#A7DFBE':'#708288',29*s);
            this.round(g.sell,'#26333B','#A98A58',29*s);
            const art={...g.upgrade,bottom:g.upgrade.bottom+12*s,top:g.upgrade.top-7*s};
            if(!this.drawTower(0,input.towerId,model.nextLevel??input.level,art,s))
                this.text('loading-0',model.title,{rect:art,size:10*s},'#D4E4E7',true);
            const oldRig=this.rigs.get(1);if(oldRig)oldRig.node.active=false;
            const oldFlat=this.flatPortraits.get(1);if(oldFlat)oldFlat.node.active=false;
            const price={...g.upgrade,top:g.upgrade.bottom+15*s,bottom:g.upgrade.bottom-7*s};
            this.round(price,'#081820','#AE9057',5*s);
            const cost=model.nextLevel ? nextUpgradeCostForView(input) : null;
            this.text('upgrade',cost===null?'满级':`↑ ${cost}`,{rect:price,size:14*s,bold:true},model.upgradeEnabled?'#F7D994':'#ACBBC0',true);
            model.levelPips.forEach((pip,i)=>{
                const x=g.upgrade.left+(i+1)*12*s,y=g.upgrade.top;
                this.fallback.fillColor=new Color(pip.purchased?'#9DE7B3':'#203039');this.fallback.strokeColor=new Color('#D0E8D1');
                this.fallback.lineWidth=2*s;this.fallback.circle(x,y,4*s);this.fallback.fill();this.fallback.stroke();
            });
            // 回收只保留可识别的金币图片，报价进入悬停卡；避免符号文字被误读成塔技能。
            const coin=this.loadArt('level-one/ui/quality-v3/coins-icon/spriteFrame');
            let sellIcon=this.flatPortraits.get(2);
            if(!sellIcon){const node=new Node('TowerRecycleIcon');node.layer=this.root.layer;this.root.addChild(node);sellIcon=node.addComponent(Sprite);sellIcon.sizeMode=Sprite.SizeMode.CUSTOM;sellIcon.trim=false;this.flatPortraits.set(2,sellIcon);}
            sellIcon.node.active=Boolean(coin);sellIcon.spriteFrame=coin;
            sellIcon.node.getComponent(UITransform)!.setContentSize(38*s,38*s);
            sellIcon.node.setPosition((g.sell.left+g.sell.right)/2,(g.sell.top+g.sell.bottom)/2);
            sellIcon.color=new Color(model.saleEnabled?'#FFFFFF':'#74868A');
            if(!coin){
                const x=(g.sell.left+g.sell.right)/2,y=(g.sell.top+g.sell.bottom)/2;
                this.fallback.fillColor=new Color('#E9B758');this.fallback.strokeColor=new Color('#FFE5A2');this.fallback.lineWidth=3*s;
                this.fallback.circle(x,y,14*s);this.fallback.fill();this.fallback.stroke();
            }
            const detail=firstLevelTowerPanelDetail(input,this.width);
            if(detail){
                const r=detail.rect;
                this.round(r,'#122C38','#C7A36B',12*s);
                const inset={left:r.left+12*s,right:r.right-12*s};
                this.text('title',detail.title,{rect:{...inset,bottom:r.top-29*s,top:r.top-5*s},size:13*s,bold:true},'#F4E9CD');
                this.text('role',detail.body,{rect:{...inset,bottom:r.bottom+24*s,top:r.top-29*s},size:11*s},'#B5DDCF',false,true);
                this.text('detail-cost',detail.footer,{rect:{...inset,bottom:r.bottom+4*s,top:r.bottom+24*s},size:11*s,bold:true},detail.enabled?'#F1D59E':'#A8B9BF');
            }
            this.labels.end();this.publish(model);return;
        }
        // 降低厚重铜框的占比，把空间留给真实炮塔和升级对比；选择/命中仍共用布局。
        this.round(g.panel,'#0E202D','#95784F',12*s);
        this.text('title',model.title,g.title,'#F4E9CD'); this.text('role',model.role,g.role,'#9FB6C2');
        this.text('close','收起',g.close,'#AABBC4',true);
        this.text('badge',model.nextLevel ? '升级预览' : '已满级',g.badge,'#F4D58D',true);
        model.levelPips.forEach((pip,i)=>{
            const x=g.currentArt.left+(i+1)*(g.currentArt.right-g.currentArt.left)/4,y=g.currentArt.top-3*s;
            this.fallback.fillColor=new Color(pip.purchased?'#91E3B3':'#253744');
            this.fallback.strokeColor=new Color(pip.purchased?'#C9FFE0':'#62747C');this.fallback.lineWidth=2*s;
            this.fallback.circle(x,y,4*s);this.fallback.fill();this.fallback.stroke();
        });
        [g.currentArt,g.nextArt].forEach((rect,i)=>this.round({...rect,left:rect.left-8*s,right:rect.right+8*s,top:rect.top+3*s,bottom:rect.bottom-18*s},i?'#16383C':'#152C3B',i?'#528F86':'#304B5A',8*s));
        const levels=[input.level,model.nextLevel ?? input.level];
        const ready=levels.map((level,i)=>this.drawTower(i,input.towerId,level,i?g.nextArt:g.currentArt,s));
        this.text('current-badge',`当前 · Lv.${input.level}`,g.currentBadge,'#C3D0D6',true);
        this.text('next-badge',model.nextLevel ? `升级后 · Lv.${model.nextLevel}` : '最高等级',g.nextBadge,'#8FE0CC',true);
        this.text('arrow',model.nextLevel?'→':'✓',g.arrow,'#E8C786',true);
        ready.forEach((available,i)=>{if(!available)this.text(`loading-${i}`,this.failed.size ? '外观暂不可用' : '外观加载中',{rect:i?g.nextArt:g.currentArt,size:11*s},'#AABBC4',true);});
        model.stats.forEach((stat,i)=>{
            this.text(`caption-${i}`,stat.caption,g.captions[i],'#9FB6C2',true);
            this.text(`value-${i}`,stat.nextValue ? `${stat.value} → ${stat.nextValue}` : stat.value,g.values[i],stat.nextValue?'#BCECDC':'#F4E9CD',true);
        });
        this.round(g.sell,model.saleEnabled?'#253744':'#1B2932','#405766',7*s);
        this.round(g.upgrade,model.upgradeEnabled?'#285B53':'#22323B',model.upgradeEnabled?'#80BCAE':'#40535D',7*s);
        this.text('sell',model.sell,{rect:g.sell,size:g.actionSize,bold:true},'#D4DDE0',true);
        this.text('upgrade',model.upgrade,{rect:g.upgrade,size:g.actionSize,bold:true},model.upgradeEnabled?'#F4E9CD':'#A9BDCA',true);
        this.labels.end(); this.publish(model);
    }

    private drawTower(index:number,id:string,level:number,rect:PhaseBRect,s:number):boolean {
        if (id === 'piercing-cannon' || id === 'arc-tower') {
            const oldRig=this.rigs.get(index); if(oldRig)oldRig.node.active=false;
            const frame = this.loadArt(towerPortraitPath(id, level));
            let sprite = this.flatPortraits.get(index);
            if (!sprite) {
                const node = new Node(`UpgradeFlatTower-${index}`); node.layer=this.root.layer; this.root.addChild(node);
                sprite=node.addComponent(Sprite); sprite.sizeMode=Sprite.SizeMode.CUSTOM; sprite.trim=false;
                this.flatPortraits.set(index,sprite);
            }
            sprite.node.active=Boolean(frame); sprite.spriteFrame=frame;
            const size=Math.min(65*s,rect.right-rect.left,rect.top-rect.bottom);
            sprite.node.getComponent(UITransform)!.setContentSize(size,size);
            sprite.node.setPosition((rect.left+rect.right)/2,(rect.top+rect.bottom)/2);
            return Boolean(frame);
        }
        const flat=this.flatPortraits.get(index); if(flat)flat.node.active=false;
        const frost=id==='frost-coil', upgrade=level===2||level===3;
        const basePath=frost ? upgrade ? FROST_UPGRADE_PATHS[level as 2|3].base : 'level-one/units/frost-coil-base-v2/spriteFrame' : 'level-one/units/rivet-gun-base-v2/spriteFrame';
        const activePath=frost ? upgrade ? FROST_UPGRADE_PATHS[level as 2|3].active : 'level-one/units/frost-coil-core-v2/spriteFrame' : rivetHeadResourcePath(level,'south');
        const base=this.loadArt(basePath),active=this.loadArt(activePath);
        let rig=this.rigs.get(index);
        if(rig && rig.id!==id){rig.node.destroy();this.rigs.delete(index);rig=undefined;}
        // 两层完整后才显示，不能把前一级炮身当成下一级预览。
        if(!base||!active){if(rig)rig.node.active=false;return false;}
        const spec=frost ? upgrade ? FROST_UPGRADE_SPECS[level as 2|3] : FROST_COIL_LAYER_SPEC : RIVET_GUN_LAYER_SPEC;
        const size=Math.min(65*s,rect.right-rect.left,rect.top-rect.bottom),center={x:(rect.left+rect.right)/2,y:(rect.top+rect.bottom)/2-3*s};
        if(!rig){rig={id,node:LayeredTowerRig.create(`UpgradeTower-${index}`,this.root,base,active,size,spec)};this.rigs.set(index,rig);}
        rig.node.active=true;LayeredTowerRig.bindFrames(rig.node,base,active,size,spec);LayeredTowerRig.pose(rig.node,center,size,null,spec);
        if(!frost)poseDirectionalTowerHead(rig.node,active,RIVET_HEAD_REGISTRATIONS.south,center,size,null);
        return true;
    }

    private round(rect:PhaseBRect,fill:string,stroke:string,radius:number):void {
        const g=this.fallback;g.fillColor=new Color(fill);g.strokeColor=new Color(stroke);g.lineWidth=2*Math.min(1080,this.width)/390;
        g.roundRect(rect.left,rect.bottom,rect.right-rect.left,rect.top-rect.bottom,radius);g.fill();g.stroke();
    }

    private fill(rect: PhaseBRect,color:string):void{this.fallback.fillColor=new Color(color);this.fallback.rect(rect.left,rect.bottom,rect.right-rect.left,rect.top-rect.bottom);this.fallback.fill();}
    private text(key:string,value:string,geometry:{rect:PhaseBRect;size:number;bold?:boolean},color:string,center=false,wrap=false):void{
        const label=this.labels.acquire(key,()=>{const node=new Node(`TowerPanel-${key}`);node.layer=this.root.layer;this.root.addChild(node);const created=node.addComponent(Label);created.fontFamily=FIRST_LEVEL_UI_FONT;created.overflow=Label.Overflow.CLAMP;created.enableWrapText=false;created.verticalAlign=VerticalTextAlignment.CENTER;return created;});
        const rect=geometry.rect;label.node.getComponent(UITransform)!.setContentSize(rect.right-rect.left,rect.top-rect.bottom);
        label.node.setPosition((rect.left+rect.right)/2,(rect.top+rect.bottom)/2);
        label.fontSize=geometry.size;label.lineHeight=geometry.size*1.4;label.isBold=Boolean(geometry.bold);
        label.enableWrapText=wrap;label.horizontalAlign=center?HorizontalTextAlignment.CENTER:HorizontalTextAlignment.LEFT;label.color=new Color(color);
        if(label.string!==value)label.string=value;
    }
    private publish(model:ReturnType<typeof firstLevelTowerPanelPresentation>|null):void{
        if(typeof document!=='undefined')document.querySelector('canvas')?.setAttribute('data-tower-panel',JSON.stringify({visible:Boolean(model),model,layout:model?firstLevelTowerPanelLayout(this.width, Boolean(this.snapshot?.placement),this.snapshot?.anchor):null,hoverAction:this.snapshot?.hoverAction??null,detail:model&&this.snapshot?firstLevelTowerPanelDetail(this.snapshot,this.width):null,assets:this.skin.diagnostics,portraits:Array.from(this.frames.keys()),portraitUuid:model?this.portrait.spriteFrame?.uuid:null}));
    }
}
