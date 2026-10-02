import { Color, Graphics, HorizontalTextAlignment, isValid, Label, Node, resources, Sprite, SpriteFrame, UIOpacity, UITransform, VerticalTextAlignment } from 'cc';
import type { BattleResultViewModel } from './BattleResultViewModel';
import { FirstLevelPageSkinView } from './FirstLevelPageSkinView';
import { FIRST_LEVEL_UI_FONT } from './FirstLevelUiStyle';
import { PHASE_B_RESULT_HOME_BUTTON, PHASE_B_RESULT_RESTART_BUTTON, PhaseBLayout, type PhaseBRect } from './PhaseBLayout';
import { resultRevealEase } from './ResultRevealRuntime';

const ART = ['victory-badge','defeat-badge','kill-icon','leak-icon','heart-icon','coins-icon','time-icon','tower-icon','upgrade-icon'] as const;
type ResultArt = typeof ART[number];

/** 结算页只展示快照；战绩、存档及重开状态仍由原有流程负责。 */
export class FirstLevelResultView {
    private readonly root: Node;
    private readonly opacity: UIOpacity;
    private readonly dim: Graphics;
    private readonly skins: FirstLevelPageSkinView;
    private readonly artRoot: Node;
    private readonly textRoot: Node;
    private readonly labels = new Map<string, Label>();
    private readonly frames = new Map<ResultArt, SpriteFrame>();
    private readonly sprites = new Map<string, Sprite>();
    private readonly failures = new Set<ResultArt>();
    private snapshot: BattleResultViewModel | null = null;
    private started = false;
    private signature = '';

    public constructor(parent: Node, private readonly layout: PhaseBLayout) {
        this.root = this.child(parent, 'QualityV3Result');
        this.opacity = this.root.addComponent(UIOpacity);
        this.dim = this.child(this.root,'ResultDim').addComponent(Graphics);
        this.skins = new FirstLevelPageSkinView(this.root,()=>this.invalidate());
        this.artRoot = this.child(this.root,'ResultArt');
        this.textRoot = this.child(this.root,'ResultNativeText');
        this.root.active = false;
    }

    public render(result: BattleResultViewModel | null, progress: number): void {
        this.snapshot = result;
        this.root.active = Boolean(result);
        this.opacity.opacity = Math.round(255 * resultRevealEase(progress));
        if (!result) return;
        if (!this.started) this.loadArt();
        const signature = JSON.stringify([result,this.layout.safeHalfWidth]);
        if (signature === this.signature) return;
        this.signature = signature; this.draw(result);
        if (typeof document !== 'undefined') document.querySelector('canvas')?.setAttribute('data-result-ui',JSON.stringify({
            version:'quality-v3',kind:result.kind,titleFontSize:54,bodyFontSize:28,
            // Creator 发布转译对迭代器展开不稳定，显式转数组，避免诊断把空集合报成 [{}]。
            chrome:this.skins.diagnostics,art:{loaded:Array.from(this.frames.keys()),failures:Array.from(this.failures)},
        }));
    }

    private loadArt(): void {
        this.started = true;
        // 首次结算才加载附加图标；回调只刷新当前快照，返回首页后不能重新打开旧结算。
        for (const name of ART) resources.load(`level-one/ui/quality-v3/${name}/spriteFrame`,SpriteFrame,(error,frame)=>{
            if (!isValid(this.root)) return;
            if (error || !frame) this.failures.add(name); else this.frames.set(name,frame);
            this.invalidate();
        });
    }

    private invalidate(): void {
        this.signature = '';
        if (this.snapshot && isValid(this.root)) this.draw(this.snapshot);
    }

    private draw(result: BattleResultViewModel): void {
        this.skins.begin();
        for (const sprite of this.sprites.values()) sprite.node.active = false;
        this.dim.clear(); this.dim.fillColor = new Color(3,8,16,150);
        this.dim.rect(-Math.max(540,this.layout.safeHalfWidth+24),-960,Math.max(1080,this.layout.safeHalfWidth*2+48),1920); this.dim.fill();
        const panel = this.layout.resultPanelRect(), left = panel.left+32, right = panel.right-32;
        this.skins.panel(panel);
        this.art('badge',result.kind==='victory'?'victory-badge':'defeat-badge',{left:-135,right:135,bottom:465,top:735});
        this.text('title',result.title,54,0,400,right-left,85,'#F4E9CD',true);
        this.text('subtitle',result.subtitle,28,0,320,right-left,60,'#AFCADA');
        this.skins.headerDivider(left+14,right-14,280);
        this.layout.resultStatRects().forEach((rect,index)=>{
            const stat = result.stats[index]; if (!stat) return;
            this.skins.button(10+index,rect,'neutral');
            const y = (rect.bottom+rect.top)/2, iconSize = 72;
            this.art(`stat-${index}`,index===2 && result.kind==='defeat'?'defeat-badge':ART[2+index],{left:rect.left+25,right:rect.left+25+iconSize,bottom:y-iconSize/2,top:y+iconSize/2});
            const textLeft = rect.left+112, width = rect.right-textLeft-12;
            this.text(`stat-caption-${index}`,stat.label,28,textLeft+width/2,y+27,width,42,'#B6CFDA',false,HorizontalTextAlignment.LEFT);
            this.text(`stat-value-${index}`,stat.value,40,textLeft+width/2,y-22,width,56,
                stat.tone==='danger'?'#E58B80':stat.tone==='success'?'#9ED8CA':'#F4E9CD',false,HorizontalTextAlignment.LEFT);
        });
        const details = this.layout.resultDetailRects();
        this.skins.button(20,{left,right,bottom:-235,top:-105},'neutral');
        details.forEach((rect,index)=>{
            const stat=result.runDetails[index]; if (!stat) return;
            const x=(rect.left+rect.right)/2;
            this.art(`detail-${index}`,ART[6+index],{left:x-90,right:x-38,bottom:-198,top:-146});
            this.text(`detail-caption-${index}`,stat.label,24,x+27,-144,rect.right-rect.left-70,40,'#AFCADA');
            this.text(`detail-value-${index}`,stat.value,32,x+27,-193,rect.right-rect.left-70,45,'#F4E9CD');
        });
        this.text('record',result.footnote,26,0,-282,right-left,72,'#9EB9C7');
        for (const [index,button,label,icon] of [
            [30,PHASE_B_RESULT_RESTART_BUTTON,result.actionLabel,'restart-icon'],
            [31,PHASE_B_RESULT_HOME_BUTTON,result.homeActionLabel,'home-icon'],
        ] as const) {
            // 绘制和输入共享适配后的矩形；小字不等于缩小点击区域。
            const rect=this.layout.fitRect(button),y=(rect.bottom+rect.top)/2;
            this.skins.button(index,{...rect,bottom:rect.bottom+12,top:rect.top-12},index===30?'primary':'neutral');
            this.skins.icon(`action-${index}`,icon,{left:-140,right:-78,bottom:y-31,top:y+31});
            this.text(`action-${index}`,label,36,45,y,rect.right-rect.left-165,65,'#F4E9CD');
        }
    }

    private art(slot: string, name: ResultArt, rect: PhaseBRect): void {
        const frame=this.frames.get(name); if (!frame) return;
        let sprite=this.sprites.get(slot);
        if (!sprite) { sprite=this.child(this.artRoot,slot).addComponent(Sprite); sprite.sizeMode=Sprite.SizeMode.CUSTOM; sprite.trim=false; this.sprites.set(slot,sprite); }
        sprite.node.active=true; sprite.spriteFrame=frame;
        sprite.node.getComponent(UITransform)!.setContentSize(rect.right-rect.left,rect.top-rect.bottom);
        sprite.node.setPosition((rect.left+rect.right)/2,(rect.bottom+rect.top)/2);
    }

    private text(id: string, value: string, size: number, x: number, y: number, width: number, height: number, color: string, bold=false, alignment=HorizontalTextAlignment.CENTER): void {
        let label=this.labels.get(id);
        if (!label) { label=this.child(this.textRoot,id).addComponent(Label); label.fontFamily=FIRST_LEVEL_UI_FONT; label.useSystemFont=true; label.horizontalAlign=HorizontalTextAlignment.CENTER; label.verticalAlign=VerticalTextAlignment.CENTER; label.overflow=Label.Overflow.SHRINK; this.labels.set(id,label); }
        label.string=value; label.fontSize=size; label.lineHeight=size*1.3; label.color=new Color(color); label.isBold=bold; label.horizontalAlign=alignment;
        label.node.getComponent(UITransform)!.setContentSize(width,height); label.node.setPosition(x,y);
    }

    private child(parent: Node,name: string): Node {
        const node=new Node(name); node.layer=parent.layer; node.addComponent(UITransform).setContentSize(1080,1920); parent.addChild(node); return node;
    }
}
