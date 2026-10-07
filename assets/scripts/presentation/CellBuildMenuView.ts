import { Color, Graphics, HorizontalTextAlignment, Label, Node, resources, Sprite, SpriteFrame, UITransform, VerticalTextAlignment } from 'cc';
import { ALL_TOWERS } from '../config/ThirdLevelCombatConfig';
import { towerDefinition, towerPortraitPath, towerRole } from '../config/TowerCatalog';
import type { GridDefinition } from '../core/GridTypes';
import { cellBuildDetailLayout, cellBuildMenuLayout, type CellBuildMenuInput } from './CellBuildMenuPresentation';
import { FIRST_LEVEL_UI_FONT } from './FirstLevelUiStyle';
import type { PhaseBLayout, PhaseBRect } from './PhaseBLayout';
import { VisibleAsyncAsset } from './VisibleAsyncAsset';
import { VisibleLabelSlots } from './VisibleLabelSlots';

/** 就地选择只展示实时校验结果；点击最终交给原建造事务重新检查敌人、金币和路线。 */
export class CellBuildMenuView {
    private readonly root: Node;
    private readonly graphics: Graphics;
    private readonly labels = new VisibleLabelSlots();
    private signature = '';
    private disposed = false;
    private readonly failedPortraits = new Set<string>();
    private readonly portraits = new Map<string, Sprite>();
    private readonly leases: VisibleAsyncAsset<SpriteFrame>[] = [];
    private snapshot: CellBuildMenuInput | null = null;
    private grid: GridDefinition | null = null;
    constructor(parent: Node, private readonly layout: PhaseBLayout) {
        this.root = new Node('CellBuildMenu'); this.root.layer = parent.layer; parent.addChild(this.root);
        this.graphics = this.root.addComponent(Graphics);
        for (const tower of ALL_TOWERS) {
            const node = new Node(`BuildPortrait-${tower.id}`); node.layer=parent.layer; this.root.addChild(node);
            const sprite=node.addComponent(Sprite);sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.trim=false;
            this.portraits.set(tower.id,sprite);
            const lease=new VisibleAsyncAsset<SpriteFrame>(
                complete=>resources.load(towerPortraitPath(tower.id),SpriteFrame,(error,frame)=>complete(error?null:frame)),
                frame=>frame.addRef(),frame=>frame.decRef(),frame=>{
                    // 异步图片只重绘当前弹窗，不覆盖后续选格；文字和建造操作不依赖图片成功加载。
                    if(this.disposed)return;
                    if(!frame)this.failedPortraits.add(tower.id);
                    sprite.spriteFrame=frame;this.signature='';if(this.grid)this.render(this.snapshot,this.grid);
                });
            this.leases.push(lease);lease.setVisible(true);
        }
        this.root.on(Node.EventType.NODE_DESTROYED,()=>{
            this.disposed=true;
            for(const sprite of this.portraits.values())sprite.spriteFrame=null;
            for(const lease of this.leases)lease.setVisible(false);
        });
    }
    render(input: CellBuildMenuInput | null, grid: GridDefinition): void {
        this.snapshot=input;this.grid=grid;
        this.root.active = Boolean(input);
        // 塔位圆环可以覆盖场景和HUD，出现时置顶，不通过挪动圆心来避让。
        if(input&&this.root.parent&&this.root.getSiblingIndex()!==this.root.parent.children.length-1)
            this.root.setSiblingIndex(this.root.parent.children.length-1);
        const geometry = input ? cellBuildMenuLayout(this.layout,grid,input.cell,input.options.length) : null;
        const signature = JSON.stringify([input,geometry]); if (signature === this.signature) return; this.signature = signature;
        this.graphics.clear(); this.labels.begin();
        for (const portrait of this.portraits.values()) portrait.node.active=false;
        if (input && geometry) {
            const s = geometry.scale;
            // 建造选格没有炮塔检查态；在置顶菜单内明确标记真实格子，不能依赖已隐藏的拖放预览。
            const cellSize=this.layout.boardMetrics(grid).cellSize,half=cellSize/2-3;
            const {x,y}=geometry.center,g=this.graphics,corner=Math.min(half*.5,8*s);
            g.fillColor=new Color(255,210,84,48);
            g.rect(x-half,y-half,half*2,half*2);g.fill();
            g.strokeColor=new Color('#FFE18B');g.lineWidth=3*s;
            for(const dx of [-1,1])for(const dy of [-1,1]){
                g.moveTo(x+dx*(half-corner),y+dy*half);
                g.lineTo(x+dx*half,y+dy*half);
                g.lineTo(x+dx*half,y+dy*(half-corner));
            }
            g.stroke();
            g.fillColor=new Color('#FFE18B');
            g.circle(x,y,2*s);g.fill();
            input.options.forEach((option,index)=>{
                const tower = towerDefinition(option.towerId);
                const rect=geometry.options[index],focused=input.detailTowerId===tower.id;
                this.card(rect,option.enabled?'#152F3B':'#1B2A33',focused?'#FFE0A1':option.enabled?'#CDA76A':'#40535D',30*s);
                const portrait=this.portraits.get(tower.id)!;
                portrait.node.active=Boolean(portrait.spriteFrame);
                portrait.node.getComponent(UITransform)!.setContentSize(50*s,50*s);
                portrait.node.setPosition((rect.left+rect.right)/2,rect.bottom+36*s);
                portrait.color=new Color(option.enabled?'#FFFFFF':'#87969F');
                if(!portrait.spriteFrame)this.text(`image-fallback-${index}`,tower.label,{...rect,bottom:rect.bottom+21*s},11*s,false);
                const price={left:rect.left+4*s,right:rect.right-4*s,bottom:rect.bottom+s,top:rect.bottom+21*s};
                this.card(price,'#09141C','#BE9B5F',5*s);
                this.text(`cost-${index}`,`${tower.cost}`,price,15*s,option.enabled);
            });
            const detailIndex=input.options.findIndex(option=>option.towerId===input.detailTowerId);
            if(detailIndex>=0){
                const detail=input.options[detailIndex],tower=towerDefinition(detail.towerId);
                const r=cellBuildDetailLayout(this.layout,geometry,detailIndex);
                this.card({left:r.left+3*s,right:r.right+3*s,bottom:r.bottom-4*s,top:r.top-4*s},'#07131C','#07131C',12*s);
                this.card(r,'#122C38','#C7A36B',12*s);
                const inset={left:r.left+12*s,right:r.right-12*s};
                this.text('detail-title',tower.label,{...inset,bottom:r.top-29*s,top:r.top-5*s},15*s,true,false,true);
                this.text('detail-role',towerRole(detail.towerId),{...inset,bottom:r.bottom+24*s,top:r.top-29*s},12*s,true,true,true);
                this.text('detail-cost',detail.enabled?`${tower.cost} 金币 · 点击建造`:detail.reason,{...inset,bottom:r.bottom+4*s,top:r.bottom+24*s},11*s,detail.enabled,false,true);
            }
        }
        this.labels.end();
        if(typeof document!=='undefined')document.querySelector('canvas')?.setAttribute('data-cell-build-menu',JSON.stringify({visible:Boolean(input),input,layout:geometry,detail:input&&geometry&&input.options.some(option=>option.towerId===input.detailTowerId)?cellBuildDetailLayout(this.layout,geometry,input.options.findIndex(option=>option.towerId===input.detailTowerId)):null,portraits:Array.from(this.portraits,([id,sprite])=>({id,ready:Boolean(sprite.spriteFrame)}))}));
    }
    private card(rect:PhaseBRect,fill:string,stroke:string,radius:number):void {
        const g=this.graphics;g.fillColor=new Color(fill);g.strokeColor=new Color(stroke);g.lineWidth=2*Math.min(1080,this.layout.visibleDesignWidth)/390;
        g.roundRect(rect.left,rect.bottom,rect.right-rect.left,rect.top-rect.bottom,radius);g.fill();g.stroke();
    }
    private text(key:string,value:string,rect:PhaseBRect,size:number,enabled=true,wrap=false,left=false):void {
        const label=this.labels.acquire(key,()=>{const node=new Node(key);node.layer=this.root.layer;this.root.addChild(node);
            const created=node.addComponent(Label);created.fontFamily=FIRST_LEVEL_UI_FONT;created.overflow=Label.Overflow.CLAMP;
            created.enableWrapText=false;created.verticalAlign=VerticalTextAlignment.CENTER;created.horizontalAlign=HorizontalTextAlignment.CENTER;return created;});
        label.node.getComponent(UITransform)!.setContentSize(rect.right-rect.left,rect.top-rect.bottom);
        label.node.setPosition((rect.left+rect.right)/2,(rect.bottom+rect.top)/2);label.fontSize=size;label.lineHeight=size*1.3;
        label.enableWrapText=wrap;label.horizontalAlign=left?HorizontalTextAlignment.LEFT:HorizontalTextAlignment.CENTER;
        label.isBold=true;label.color=new Color(enabled?'#F4E9CD':'#9CAAB2');label.string=value;
    }
}
