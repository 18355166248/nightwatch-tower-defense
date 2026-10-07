import { Color, Graphics, HorizontalTextAlignment, Label, Node, resources, Sprite, SpriteFrame, UITransform, VerticalTextAlignment } from 'cc';
import { PHASE_B_TOWERS } from '../config/PhaseBCombatConfig';
import type { GridDefinition } from '../core/GridTypes';
import { sameCell } from '../core/GridTypes';
import { cellBuildMenuLayout, type CellBuildMenuInput } from './CellBuildMenuPresentation';
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
        for (const tower of PHASE_B_TOWERS) {
            const node = new Node(`BuildPortrait-${tower.id}`); node.layer=parent.layer; this.root.addChild(node);
            const sprite=node.addComponent(Sprite);sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.trim=false;
            this.portraits.set(tower.id,sprite);
            const lease=new VisibleAsyncAsset<SpriteFrame>(
                complete=>resources.load(`level-one/units/${tower.id}/spriteFrame`,SpriteFrame,(error,frame)=>complete(error?null:frame)),
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
        const geometry = input ? cellBuildMenuLayout(this.layout,grid,input.cell,input.options.length) : null;
        const signature = JSON.stringify([input,geometry]); if (signature === this.signature) return; this.signature = signature;
        this.graphics.clear(); this.labels.begin();
        if (input && geometry) {
            const s = geometry.scale;
            this.graphics.strokeColor = new Color('#F4D58D'); this.graphics.lineWidth = 4*s;
            this.graphics.circle(geometry.center.x,geometry.center.y,this.layout.boardMetrics(grid).cellSize*.48); this.graphics.stroke();
            this.card(geometry.panel,'#0E202D','#95784F',12*s);
            const channel = sameCell(input.cell, grid.exit) ? '出口接出通道'
                : sameCell(input.cell, grid.entry) ? '入口接入通道' : null;
            this.text('title',channel ? `${channel} · 不可建塔` : '选择炮塔 · 点选即建造',{...geometry.panel,bottom:geometry.panel.top-35*s,right:geometry.close.left},14*s);
            this.text('close','收起',geometry.close,11*s);
            input.options.forEach((option,index)=>{
                const tower = PHASE_B_TOWERS.find(t=>t.id===option.towerId)!;
                const rect = geometry.options[index]; this.card(rect,option.enabled?'#16383C':'#22323B',option.enabled?'#528F86':'#40535D',8*s);
                const portrait=this.portraits.get(tower.id)!;
                portrait.node.active=Boolean(portrait.spriteFrame);
                portrait.node.getComponent(UITransform)!.setContentSize(66*s,66*s);
                portrait.node.setPosition((rect.left+rect.right)/2,rect.top-38*s);
                portrait.color=new Color(option.enabled?'#FFFFFF':'#87969F');
                if(!portrait.spriteFrame)this.text(`image-fallback-${index}`,this.failedPortraits.has(tower.id)?'图片暂不可用':'图片加载中',{...rect,bottom:rect.top-76*s},11*s,false);
                this.text(`name-${index}`,tower.label,{...rect,bottom:rect.bottom+43*s,top:rect.bottom+64*s},15*s,option.enabled);
                this.text(`role-${index}`,tower.effect?'减速控场':'集中输出',{...rect,bottom:rect.bottom+25*s,top:rect.bottom+43*s},11*s,option.enabled);
                this.text(`cost-${index}`,option.enabled?`${tower.cost} 金币`:option.reason,{...rect,bottom:rect.bottom+5*s,top:rect.bottom+25*s},11*s,option.enabled);
            });
        }
        this.labels.end();
        if(typeof document!=='undefined')document.querySelector('canvas')?.setAttribute('data-cell-build-menu',JSON.stringify({visible:Boolean(input),input,layout:geometry,portraits:Array.from(this.portraits,([id,sprite])=>({id,ready:Boolean(sprite.spriteFrame)}))}));
    }
    private card(rect:PhaseBRect,fill:string,stroke:string,radius:number):void {
        const g=this.graphics;g.fillColor=new Color(fill);g.strokeColor=new Color(stroke);g.lineWidth=2;
        g.roundRect(rect.left,rect.bottom,rect.right-rect.left,rect.top-rect.bottom,radius);g.fill();g.stroke();
    }
    private text(key:string,value:string,rect:PhaseBRect,size:number,enabled=true):void {
        const label=this.labels.acquire(key,()=>{const node=new Node(key);node.layer=this.root.layer;this.root.addChild(node);
            const created=node.addComponent(Label);created.fontFamily=FIRST_LEVEL_UI_FONT;created.overflow=Label.Overflow.CLAMP;
            created.enableWrapText=false;created.verticalAlign=VerticalTextAlignment.CENTER;created.horizontalAlign=HorizontalTextAlignment.CENTER;return created;});
        label.node.getComponent(UITransform)!.setContentSize(rect.right-rect.left,rect.top-rect.bottom);
        label.node.setPosition((rect.left+rect.right)/2,(rect.bottom+rect.top)/2);label.fontSize=size;label.lineHeight=size*1.3;
        label.isBold=true;label.color=new Color(enabled?'#F4E9CD':'#9CAAB2');label.string=value;
    }
}
