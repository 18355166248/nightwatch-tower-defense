import { codexEntry, codexCount, codexLayout, type CodexState } from './CodexPresentation';
import { FROST_UPGRADE_PATHS, FROST_UPGRADE_SPECS } from './FrostUpgradeArt';
import { FROST_COIL_LAYER_SPEC, RIVET_GUN_LAYER_SPEC } from './LayeredTowerGeometry';
import { LayeredTowerRig } from './LayeredTowerRig';
import { poseDirectionalTowerHead } from './EightDirectionTowerView';
import { RIVET_HEAD_REGISTRATIONS } from './RivetHeadRegistrations';
import { rivetHeadResourcePath } from './RivetHeadResourcePaths';
import { ALL_TOWERS } from '../config/ThirdLevelCombatConfig';
import { towerPortraitPath, towerRole } from '../config/TowerCatalog';
import { PHASE_B_TOWERS } from '../config/PhaseBCombatConfig';
import { Color, Graphics, HorizontalTextAlignment, isValid, Label, Node, resources, Sprite, SpriteFrame, UITransform, VerticalTextAlignment } from 'cc';
import { campaignLayout, campaignLoadoutCards, type CampaignLoadoutInput, type CampaignSnapshot, type CampaignStage } from './CampaignMenuPresentation';
import { FirstLevelHomeArtView } from './FirstLevelHomeArtView';
import { FIRST_LEVEL_UI_FONT } from './FirstLevelUiStyle';
import type { PhaseBLayout, PhaseBRect } from './PhaseBLayout';
import { formatRunDuration } from './BattleResultViewModel';

/** 欢迎页和战役地图只展示目录，不拥有战斗状态；异步插画完成只能重绘最近的菜单快照。 */
export class CampaignMenuView {
    private readonly root = new Node('CampaignMenu');
    private readonly graphics: Graphics;
    private readonly art: FirstLevelHomeArtView;
    private labels: Node | null = null;
    private signature = '';
    private readonly loadoutFrames = new Map<string, SpriteFrame>();
    private loadoutRequested = false;
    private readonly codexFrames=new Map<string,SpriteFrame>();
    private readonly codexRequested=new Set<string>();
    private readonly codexFailed=new Set<string>();
    private repaint: (() => void) | null = null;
    public constructor(parent: Node, private readonly layout: PhaseBLayout) {
        this.root.layer = parent.layer;
        this.root.addComponent(UITransform).setContentSize(1080,1920);
        parent.addChild(this.root);
        this.graphics = this.root.addComponent(Graphics);
        this.art = new FirstLevelHomeArtView(this.root, () => { this.signature = ''; this.repaint?.(); });
        this.root.active = false;
        this.root.on(Node.EventType.NODE_DESTROYED,()=>{
            this.repaint=null;
            for(const frame of Array.from(this.codexFrames.values()))frame.decRef();this.codexFrames.clear();
        });
    }
    public render(visible: boolean, state: CampaignSnapshot, stages: readonly CampaignStage[], loadout?: CampaignLoadoutInput): void {
        this.repaint = () => this.render(visible,state,stages,loadout);
        this.root.active = visible;
        this.art.setVisible(visible && state.screen === 'welcome');
        if (!visible) {
            this.clearLabels(); this.signature = ''; return;
        }
        const signature = JSON.stringify([this.layout.visibleDesignWidth,state,stages,loadout,this.art.diagnostics]);
        if (signature === this.signature) return;
        this.signature = signature;
        this.clearLabels();
        this.labels = new Node('CampaignText'); this.labels.layer = this.root.layer; this.root.addChild(this.labels);
        const l = campaignLayout(this.layout.visibleDesignWidth,state,stages.length);
        const g = this.graphics; g.clear();
        this.box({left:-540,right:540,bottom:-960,top:960},'#070F1A');
        // 雾气用静态半透明层叠，界面不持续刷新，避免菜单装饰占用战斗帧预算。
        for (let i=6;i>0;i--) this.disc(130,180,110+i*55,new Color(33,91,105,12));
        if (state.screen === 'welcome') this.welcome(l);
        else if(state.screen==='codex')this.codex(l,state.codex!);
        else if (state.screen === 'loadout') this.loadout(l, stages[state.selectedIndex], loadout);
        else this.map(l,state,stages);
        this.box(l.settings,'#172B36','#48636B',24); this.gear((l.settings.left+l.settings.right)/2,815);
        if (typeof document !== 'undefined') document.querySelector('canvas')?.setAttribute('data-campaign-ui', JSON.stringify({screen:state.screen,page:state.page,selected:stages[state.selectedIndex]?.id,layout:l,codex:state.screen==='codex'?{state:state.codex,entry:codexEntry(state.codex!),layout:codexLayout(this.layout.visibleDesignWidth),ready:Array.from(this.codexFrames.keys()),failed:Array.from(this.codexFailed)}:null}));
    }
    private welcome(l: ReturnType<typeof campaignLayout>): void {
        this.text('N I G H T W A T C H',0,800,25,'#91B9BE',l.half*2-180);
        this.text('夜城防线',0,654,100,'#F3D9A2',l.half*2,140);
        this.text('守住灯火 · 重塑防线',0,544,35,'#A5B8C5',l.half*2);
        this.box(l.hero,'#0E2029','#45595A',34);
        this.art.setLayout(l.hero,l.half*2,false);
        this.text('当夜幕落下，城市由你守护',0,-280,44,'#F3E8CF',l.half*2);
        this.text('建造炮塔，改变路线\n让每一段街道成为你的防线',0,-388,33,'#9CB6C5',l.half*2,130);
        this.button(l.start,'开始游戏');
        this.codexButton(l.codex);
    }
    private map(l: ReturnType<typeof campaignLayout>, state: CampaignSnapshot, stages: readonly CampaignStage[]): void {
        const g=this.graphics;
        // 河道、街区屋顶与暖色窗灯构成俯视城市，不将背景装饰做成不可用的假关卡。
        this.box({left:-l.half,right:l.half,bottom:-420,top:665},'#101F2B','#29414D',36);
        g.strokeColor=new Color('#17384A');g.lineWidth=76;g.moveTo(l.half-30,645);g.bezierCurveTo(-120,285,220,40,-l.half+30,-395);g.stroke();
        g.strokeColor=new Color('#245368');g.lineWidth=3;g.moveTo(l.half-54,645);g.bezierCurveTo(-145,285,195,40,-l.half+54,-395);g.stroke();
        for (const [x,y] of [[-210,-210],[135,275]]) {
            g.strokeColor=new Color('#445E65');g.lineWidth=44;g.moveTo(x-45,y+24);g.lineTo(x+45,y-24);g.stroke();
            g.strokeColor=new Color('#B6A277');g.lineWidth=3;
            for(const dy of [-19,19]){g.moveTo(x-45,y+24+dy);g.lineTo(x+45,y-24+dy);g.stroke();}
            this.disc(x-43,y+24,12,new Color(233,187,99,35));this.disc(x+43,y-24,12,new Color(233,187,99,35));
        }
        const scale=Math.min(1,l.half/470);
        for(let row=0;row<6;row++)for(let col=0;col<5;col++){
            const x=(-360+col*175)*scale,y=570-row*160;
            if(Math.abs(x)<230 && row%2===0)continue;
            this.building(x,y,95*scale,85,row+col);
        }
        for(const x of [-l.half+40,l.half-40])for(let i=0;i<6;i++){
            this.disc(x,540-i*160,30,'#143832');this.disc(x+8,550-i*160,20,'#1D493F');
        }
        const points=l.stages;
        for(let i=0;i<points.length-1;i++){
            const a=points[i],b=points[i+1];
            g.strokeColor=new Color('#07131F');g.lineWidth=44;g.moveTo(a.x,a.y);g.bezierCurveTo(a.x,a.y-160,b.x,b.y+160,b.x,b.y);g.stroke();
            g.strokeColor=new Color('#6B8F8C');g.lineWidth=5;g.moveTo(a.x,a.y);g.bezierCurveTo(a.x,a.y-160,b.x,b.y+160,b.x,b.y);g.stroke();
            for(let j=1;j<8;j++){const t=j/8;const x=a.x+(b.x-a.x)*(3*t*t-2*t*t*t);this.disc(x,a.y+(b.y-a.y)*t,4,'#D7B77B');}
        }
        for(const point of points){
            const stage=stages[point.index],selected=point.index===state.selectedIndex,cleared=stage.bestHealth!==null;
            if(selected){this.disc(point.x,point.y,108,new Color(83,217,213,22));this.disc(point.x,point.y,96,new Color(83,217,213,32));}
            this.disc(point.x,point.y,82,'#07121C',selected?'#7AE0D4':cleared?'#D8B26C':'#738991',selected?6:3);
            this.disc(point.x,point.y,69,selected?'#254E52':'#1D333E');
            this.landmark(point.x,point.y,point.index%3,selected);
            this.box({left:point.x-35,right:point.x+35,bottom:point.y-91,top:point.y-44},selected?'#85DCD0':'#C7AA75',undefined,12);
            this.text(String(point.index+1).padStart(2,'0'),point.x,point.y-68,32,'#102731',66,44);
            this.text(stage.district,point.x,point.y-128,39,'#F1E3C7',280,64);
            this.text(cleared?'已通关  ◆':stage.difficulty,point.x,point.y-177,26,cleared?'#DFC079':'#8CB9BB',260,42);
        }
        if(stages.length<=2){
            const last=points[points.length-1];
            if(last){g.strokeColor=new Color('#3A535F');g.lineWidth=3;g.moveTo(last.x,last.y-205);g.lineTo(0,-320);g.stroke();}
            this.text('远方街区 · 未知的夜幕',0,-358,28,'#6B8897',l.half*2-170,46);
        }
        // 固定页头/详情压住地图边缘，关卡数量增加后地图按每页三关继续扩展。
        this.box({left:-540,right:540,bottom:690,top:960},'#070F1A');
        this.text('夜城战役',0,818,58,'#F0D9A7',l.half*2-270,100);
        this.codexButton(l.codex);
        this.box(l.back,'#172B36','#48636B',24);this.text('‹',(l.back.left+l.back.right)/2,820,66,'#BDD5D7',90,90);
        if(state.page>0){this.box(l.previous,'#142B37','#47636C',18);this.text('‹ 上页',(l.previous.left+l.previous.right)/2,-340,26,'#CBD8D4',126,65);}
        if((state.page+1)*3<stages.length){this.box(l.next,'#142B37','#47636C',18);this.text('下页 ›',(l.next.left+l.next.right)/2,-340,26,'#CBD8D4',126,65);}
        this.box({left:-l.half,right:l.half,bottom:-875,top:-440},'#10232F','#48636A',32);
        const stage=stages[state.selectedIndex];
        if(stage){
            this.text(`${stage.label} · ${stage.district}`,0,-500,44,'#F3DEB1',l.half*2-60,72);
            this.text(stage.briefing,0,-575,30,'#A7BCC8',l.half*2-90,100);
            this.button(l.deploy,stage.guided?'进入关卡 · 新手引导':'进入关卡 · 开始布防');
            this.text(stage.bestHealth===null?`${stage.difficulty}  ·  ${stage.waveCount} 波来袭  ·  尚未通关`:
                `最佳核心 ${stage.bestHealth}/10${stage.bestSeconds===null?'':`  ·  最快 ${formatRunDuration(stage.bestSeconds)}`}`,0,-832,26,'#8FACB8',l.half*2-60,50);
        }
        this.text(`点击据点选择关卡  ·  ${state.page+1} / ${Math.max(1,Math.ceil(stages.length/3))}`,0,-922,25,'#6B8999',l.half*2,44);
    }
    private loadout(l: ReturnType<typeof campaignLayout>, stage: CampaignStage | undefined, input?: CampaignLoadoutInput): void {
        if (!this.loadoutRequested) {
            this.loadoutRequested = true;
            for (const tower of ALL_TOWERS) resources.load(towerPortraitPath(tower.id), SpriteFrame, (error, frame) => {
                if (error || !frame || !isValid(this.root)) return;
                this.loadoutFrames.set(tower.id, frame); this.signature = ''; this.repaint?.();
            });
        }
        this.box(l.back,'#172B36','#48636B',24);
        this.text('‹',(l.back.left+l.back.right)/2,820,66,'#BDD5D7',90,90);
        this.text('出战配塔',0,818,58,'#F0D9A7',l.half*2-270,100);
        this.text(`${stage?.label ?? ''} · ${stage?.district ?? ''}`,0,684,36,'#9DB8C5',l.half*2);
        this.text(input?.fixed ? '本关固定携带以下炮塔' : '点击选择 · 至少一种 · 最多五种',0,570,34,'#D8CBAC',l.half*2);
        const towers = input?.towers ?? PHASE_B_TOWERS;
        const rects = campaignLoadoutCards(this.layout.visibleDesignWidth, towers.length);
        towers.forEach((tower,index) => {
            const r=rects[index],x=(r.left+r.right)/2,y=(r.bottom+r.top)/2,w=r.right-r.left;
            const selected = input?.selected.includes(tower.id) ?? true;
            this.box(r,selected?'#173C40':'#142C38',selected?'#80C7B6':'#435C65',24);
            const frame=this.loadoutFrames.get(tower.id);
            if (frame) {
                const icon=new Node('LoadoutTowerPortrait');icon.layer=this.root.layer;icon.setPosition(x,y+54);this.labels!.addChild(icon);
                const sprite=icon.addComponent(Sprite);sprite.spriteFrame=frame;sprite.sizeMode=Sprite.SizeMode.CUSTOM;
                icon.getComponent(UITransform)!.setContentSize(140,140);
            }
            this.text(tower.label,x,y-28,38,'#F3DEB1',w-24,60);
            this.text(towerRole(tower.id),x,y-80,26,'#A7BCC8',w-20,48);
            const rank=input?.selected.indexOf(tower.id) ?? index;
            this.text(`${tower.cost} 金币   ${selected ? `✓ ${rank+1}` : '未携带'}`,x,y-126,27,selected?'#8CDED0':'#91A3AC',w-18,48);
        });
        const warnings=input?.warnings ?? [];
        this.text(warnings.length ? warnings.join('\n') : input?.fixed ? '教学阵容固定 · 两种炮塔均可升级' : `已携带 ${input?.selected.length ?? 0} 种 · 克制阵容就绪`,0,-478,29,warnings.length?'#E5BD83':'#8FACB8',l.half*2-60,138);
        this.button(l.deploy,stage?.guided?'开始布防 · 新手引导':'开始布防');
        this.text('进入后可布塔改路，开波后仍能建造',0,-850,27,'#7D98A6',l.half*2-60,66);
    }
    private codexButton(r:PhaseBRect):void {
        this.box(r,'#102733','#47636B',22);
        this.text('炮塔 / 怪物图鉴',(r.left+r.right)/2,(r.bottom+r.top)/2,36,'#BCD5CE',r.right-r.left-30,90);
    }
    private codex(l:ReturnType<typeof campaignLayout>,state:CodexState):void {
        const c=codexLayout(this.layout.visibleDesignWidth),entry=codexEntry(state),half=l.half;
        this.box(l.back,'#172B36','#48636B',24);this.text('‹',(l.back.left+l.back.right)/2,820,66,'#BDD5D7',90,90);
        this.text('夜城图鉴',0,818,58,'#F0D9A7',half*2-270,100);
        for(const [i,title] of ['炮塔','怪物'].entries()){
            const r=c.tabs[i],selected=(state.category==='towers')===(i===0);
            this.box(r,selected?'#234B50':'#122632',selected?'#BDA16E':'#39525C',22);
            this.text(title,(r.left+r.right)/2,650,42,selected?'#F1D8A5':'#94ADB7',r.right-r.left,90);
        }
        this.text(entry.label,0,510,58,'#F3DEB1',half*2-40,90);
        this.disc(0,265,170,new Color(42,85,95,70),'#48666D',3);
        this.disc(0,265,143,new Color(21,43,53,80));
        for(const [r,label] of [[c.previous,'‹'],[c.next,'›']] as const){
            this.box(r,'#142C38','#50666B',22);this.text(label,(r.left+r.right)/2,270,76,'#DEC799',130,130);
        }
        if(!this.codexPortrait(state))this.text(this.codexFailed.size?'图片暂不可用':'插画加载中',0,265,30,'#95AFB8',300,80);
        this.text(entry.role,0,72,34,'#9CCFC8',half*2-40,74);
        if(state.category==='towers')c.tiers.forEach((r,i)=>{
            const selected=state.level===i+1;this.box(r,selected?'#294A48':'#142A35',selected?'#C6A96C':'#40555E',18);
            this.text(`Lv.${i+1}`,(r.left+r.right)/2,-30,38,selected?'#F0D59B':'#A0B7C0',r.right-r.left,85);
        });
        else this.text('认识敌人 · 选择应对火力',0,-30,31,'#8FACB8',half*2-40,100);
        entry.stats.forEach(([label,value],i)=>{
            const x=(i%2?1:-1)*half*.5,y=-235-Math.floor(i/2)*165,w=half-18;
            this.box({left:x-w/2,right:x+w/2,bottom:y-72,top:y+72},'#102530','#35505B',18);
            this.text(label,x,y+32,29,'#859FAE',w-20,50);
            this.text(value,x,y-25,42,'#F0DEBA',w-20,64);
        });
        this.box({left:-half,right:half,bottom:-727,top:-510},'#112E36','#406064',22);
        this.text(state.category==='towers'?'战术特点':'推荐应对',0,-551,31,'#94D2C5',half*2-36,54);
        this.text(entry.advice,0,-638,35,'#D7DCCE',half*2-70,128);
        this.text(entry.footnote,0,-815,27,'#879EAD',half*2-36,112);
        this.text(`${state.index+1} / ${codexCount(state.category)}   ·   点击左右浏览`,0,-923,28,'#BBA87C',half*2-36,52);
    }
    private codexFrame(path:string):SpriteFrame|null {
        if(!this.codexRequested.has(path)){
            this.codexRequested.add(path);
            resources.load(path,SpriteFrame,(error,frame)=>{
                if(!isValid(this.root))return;
                if(error||!frame)this.codexFailed.add(path);else{frame.addRef();this.codexFrames.set(path,frame);}
                // 图片只重绘最近菜单快照；切换条目后的旧请求不能覆盖当前选择。
                this.signature='';this.repaint?.();
            });
        }
        return this.codexFrames.get(path)??null;
    }
    private codexPortrait(state:CodexState):boolean {
        const entry=codexEntry(state),id=entry.id,level=state.level,center={x:0,y:235},size=240;
        if(state.category==='towers'&&(id==='rivet-gun'||id==='frost-coil')){
            const frost=id==='frost-coil',upgrade=level>1;
            const basePath=frost?upgrade?FROST_UPGRADE_PATHS[level as 2|3].base:'level-one/units/frost-coil-base-v2/spriteFrame':'level-one/units/rivet-gun-base-v2/spriteFrame';
            const activePath=frost?upgrade?FROST_UPGRADE_PATHS[level as 2|3].active:'level-one/units/frost-coil-core-v2/spriteFrame':rivetHeadResourcePath(level,'south');
            const base=this.codexFrame(basePath),active=this.codexFrame(activePath);
            // 结构、炮头或能量芯完整到齐才展示，沿用战场注册点，避免三级预览错位。
            if(!base||!active)return false;
            const spec=frost?upgrade?FROST_UPGRADE_SPECS[level as 2|3]:FROST_COIL_LAYER_SPEC:RIVET_GUN_LAYER_SPEC;
            const node=LayeredTowerRig.create('CodexTower',this.labels!,base,active,size,spec);
            // Sprite首次赋帧可能重置尺寸；绑定后再摆放，确保两层按图鉴展示尺寸缩放。
            LayeredTowerRig.bindFrames(node,base,active,size,spec);
            LayeredTowerRig.pose(node,center,size,null,spec);
            if(!frost)poseDirectionalTowerHead(node,active,RIVET_HEAD_REGISTRATIONS.south,center,size,null);
            return true;
        }
        const path=state.category==='towers'?towerPortraitPath(id as 'piercing-cannon'|'arc-tower',level):
            `${id==='siege-tank'||id==='shield-guard'?'level-three':'level-one'}/units/${id}/spriteFrame`;
        const frame=this.codexFrame(path);if(!frame)return false;
        const icon=new Node('CodexPortrait');icon.layer=this.root.layer;this.labels!.addChild(icon);icon.setPosition(0,265);
        const sprite=icon.addComponent(Sprite);sprite.spriteFrame=frame;sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.trim=false;
        icon.getComponent(UITransform)!.setContentSize(320,320);return true;
    }
    private building(x:number,y:number,w:number,h:number,seed:number):void{
        const g=this.graphics,peak=y+h/2+16;
        this.box({left:x-w/2+9,right:x+w/2+9,bottom:y-h/2-12,top:peak-8},'#091521',undefined,8);
        this.box({left:x-w/2,right:x+w/2,bottom:y-h/2,top:y+20},seed%2?'#243B48':'#304651','#405A60',5);
        // 双坡屋顶、烟囱和窗灯让街区像夜城建筑，背景对比度仍低于关卡据点。
        g.fillColor=new Color(seed%2?'#3A535A':'#5B625B');g.strokeColor=new Color('#6A7972');g.lineWidth=2;
        g.moveTo(x-w/2-7,y+17);g.lineTo(x,peak);g.lineTo(x+w/2+7,y+17);g.close();g.fill();g.stroke();
        g.strokeColor=new Color('#82928A');g.lineWidth=2;g.moveTo(x,peak-3);g.lineTo(x,y+18);g.stroke();
        this.box({left:x+w/5,right:x+w/5+10,bottom:peak-10,top:peak+12},'#466068',undefined,2);
        for(let i=0;i<3;i++){
            const left=x-w/2+12+i*w/4;
            this.disc(left+5,y-18,13,new Color(226,176,83,10));
            this.box({left,right:left+10,bottom:y-25,top:y-10},seed%3?'#BC9359':'#577E85',undefined,2);
        }
        if(seed%3===0)this.box({left:x-8,right:x+8,bottom:y-h/2,top:y-24},'#142B36',undefined,2);
    }
    private landmark(x:number,y:number,kind:number,selected:boolean):void{
        const g=this.graphics,accent=selected?'#A0E5D7':'#BCB490';
        this.box({left:x-45,right:x+45,bottom:y-25,top:y+26},'#54777B','#86A3A0',6);
        this.box({left:x-33,right:x+33,bottom:y-10,top:y+48},'#284955',accent,5);
        if(kind===0){this.box({left:x-10,right:x+10,bottom:y+48,top:y+68},accent);this.disc(x,y+72,9,'#F6D188');}
        else {for(const dx of [-24,24])this.box({left:x+dx-9,right:x+dx+9,bottom:y+20,top:y+65},'#3C6771',accent,4);}
        for(const dx of [-19,0,19])this.box({left:x+dx-5,right:x+dx+5,bottom:y+4,top:y+15},'#E3B979',undefined,2);
        g.strokeColor=new Color('#F1CF91');g.lineWidth=3;g.moveTo(x-48,y-28);g.lineTo(x+48,y-28);g.stroke();
    }
    private gear(x:number,y:number):void{
        const g=this.graphics;g.strokeColor=new Color('#C1D4D4');g.lineWidth=7;
        for(let i=0;i<8;i++){const a=i*Math.PI/4;g.moveTo(x+Math.cos(a)*20,y+Math.sin(a)*20);g.lineTo(x+Math.cos(a)*31,y+Math.sin(a)*31);g.stroke();}
        this.disc(x,y,22,'#172B36','#C1D4D4',6);this.disc(x,y,7,'#C1D4D4');
    }
    private button(r: PhaseBRect, title: string): void {
        const g = this.graphics, x = (r.left + r.right) / 2, y = (r.bottom + r.top) / 2;
        const width = r.right - r.left;
        this.box(r, '#234956', undefined, 28);
        g.strokeColor = new Color('#C7A568'); g.lineWidth = 4;
        g.roundRect(r.left, r.bottom, width, r.top - r.bottom, 28); g.stroke();
        g.strokeColor = new Color('#39616A'); g.lineWidth = 2;
        g.roundRect(r.left + 9, r.bottom + 9, width - 18, r.top - r.bottom - 18, 21); g.stroke();
        const iconX = r.left + 68;
        this.disc(iconX, y, 30, '#254D58');
        g.fillColor = new Color('#EBCB8D');
        g.moveTo(iconX - 6, y - 12); g.lineTo(iconX + 13, y); g.lineTo(iconX - 6, y + 12); g.close(); g.fill();
        const textWidth = width - 170;
        this.text(title, x + 28, y, Math.min(46, textWidth / title.length * 0.93), '#F1D8A5', textWidth, 88);
    }
    private box(r:PhaseBRect,fill:string,border?:string,radius=0):void{const g=this.graphics;g.fillColor=new Color(fill);if(radius)g.roundRect(r.left,r.bottom,r.right-r.left,r.top-r.bottom,radius);else g.rect(r.left,r.bottom,r.right-r.left,r.top-r.bottom);g.fill();if(border){g.strokeColor=new Color(border);g.lineWidth=2;g.stroke();}}
    private disc(x:number,y:number,r:number,fill:string|Color,border?:string,line=2):void{const g=this.graphics;g.fillColor=typeof fill==='string'?new Color(fill):fill;g.circle(x,y,r);g.fill();if(border){g.strokeColor=new Color(border);g.lineWidth=line;g.stroke();}}
    private text(value:string,x:number,y:number,size:number,color:string,width:number,height=70):void{
        const node=new Node('MenuLabel');node.layer=this.root.layer;node.setPosition(x,y);this.labels!.addChild(node);
        const label=node.addComponent(Label);node.getComponent(UITransform)!.setContentSize(width,height);
        label.string=value;label.fontFamily=FIRST_LEVEL_UI_FONT;label.fontSize=size;label.lineHeight=size*1.35;label.color=new Color(color);
        label.horizontalAlign=HorizontalTextAlignment.CENTER;label.verticalAlign=VerticalTextAlignment.CENTER;label.overflow=Label.Overflow.CLAMP;
    }
    private clearLabels():void{if(this.labels){this.labels.removeFromParent();this.labels.destroy();this.labels=null;}}
}
