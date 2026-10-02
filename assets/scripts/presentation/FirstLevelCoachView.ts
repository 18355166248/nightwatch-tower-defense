import { Color, Graphics, HorizontalTextAlignment, isValid, Label, Node, UITransform, VerticalTextAlignment } from 'cc';
import { FirstLevelPageSkinView } from './FirstLevelPageSkinView';
import { FIRST_LEVEL_UI_FONT } from './FirstLevelUiStyle';
import { firstLevelCoachLayout, firstLevelCoachPresentation, type CoachPresentationInput } from './FirstLevelCoachPresentation';
import type { UpcomingWaveBriefing } from './WaveBriefing';
import type { PhaseBRect } from './PhaseBLayout';
import { firstLevelTowerPanelLayout } from './FirstLevelTowerPanelPresentation';

export interface CoachViewInput extends CoachPresentationInput { readonly upcoming: UpcomingWaveBriefing | null; }

/** 只消费展示快照；教学规则/开波计时仍由原模型持有，异步饰面重绘当前状态。 */
export class FirstLevelCoachView {
    private readonly root: Node;
    private readonly skin: FirstLevelPageSkinView;
    private readonly fallback: Graphics;
    private readonly labels = new Map<string, Label>();
    private snapshot: CoachViewInput | null = null;
    private width = 1080;
    private signature = '';

    constructor(parent: Node) {
        this.root = new Node('QualityV3Coach'); this.root.layer = parent.layer; parent.addChild(this.root);
        this.fallback = this.root.addComponent(Graphics);
        this.skin = new FirstLevelPageSkinView(this.root, () => {
            if (!isValid(this.root)) return;
            this.signature = ''; this.render(this.snapshot, this.width);
        });
    }

    public render(input: CoachViewInput | null, width: number): void {
        this.snapshot = input; this.width = width;
        const model = input ? firstLevelCoachPresentation(input) : null;
        // 倒计时快照每帧变化，展示只按整秒和文字变化更新，不跟战斗帧率重建Label。
        const signature = JSON.stringify([model,input?.upcoming,width]); if (signature === this.signature) return;
        this.signature = signature; this.root.active = Boolean(input);
        this.skin.begin(); this.fallback.clear();
        for (const label of this.labels.values()) label.node.active = false;
        if (input && model) {
            const layout = firstLevelCoachLayout(width), s = layout.scale;
            if (model.visible) {
                if (!this.skin.panel(layout.card,8*s)) this.fill(layout.card);
                this.text('title',model.title,layout.title,'#F4E9CD');
                this.text('progress',model.progress,layout.progress,'#C6A876',true);
                this.text('body',model.body,layout.body,'#F4E9CD'); this.text('help',model.help,layout.help,'#A9BDCA');
            }
            if (model.skipVisible) {
                if (!this.skin.button(0,layout.skip,'neutral',8*s)) this.fill(layout.skip);
                this.text('skip','跳过引导',layout.skipText,'#A9BDCA',true);
            }
            if (model.upgradeHighlighted) {
                const target = firstLevelTowerPanelLayout(width).upgrade;
                this.fallback.strokeColor = new Color('#FFE09C'); this.fallback.lineWidth = 1.5*s;
                this.fallback.rect(target.left,target.bottom,target.right-target.left,target.top-target.bottom); this.fallback.stroke();
            }
            // 敌情只占自己两行；真正暂停/首页/结算不由这层抢占遮罩或资源槽。
            if (input.upcoming && !input.overlayVisible && input.experience.mode !== 'home') {
                this.text('kicker',input.preparing ? '首波敌情' : `下一波 · 第${input.upcoming.wave}波`,layout.kicker,'#C6A876');
                this.text('lineup',input.upcoming.lineup,layout.lineup,'#F4E9CD');
                this.text('tactic',input.upcoming.tactic,layout.tactic,'#A9BDCA');
            }
        }
        if (typeof document !== 'undefined') document.querySelector('canvas')?.setAttribute('data-coach-ui',JSON.stringify({
            model,assets:this.skin.diagnostics,labels:Array.from(this.labels.entries()).filter(([,v])=>v.node.active).map(([key,v])=>({key,text:v.string,size:v.fontSize})),
        }));
    }

    private fill(rect: PhaseBRect): void {
        this.fallback.fillColor = new Color('#162B3D'); this.fallback.rect(rect.left,rect.bottom,rect.right-rect.left,rect.top-rect.bottom); this.fallback.fill();
    }
    private text(key: string,value: string,geometry: {rect:PhaseBRect;size:number;bold?:boolean},color:string,right=false):void {
        let label = this.labels.get(key);
        if (!label) {
            const node = new Node(`Coach-${key}`); node.layer = this.root.layer; this.root.addChild(node); label = node.addComponent(Label);
            label.fontFamily = FIRST_LEVEL_UI_FONT; label.overflow = Label.Overflow.CLAMP; label.enableWrapText = false;
            label.verticalAlign = VerticalTextAlignment.CENTER; this.labels.set(key,label);
        }
        const rect = geometry.rect; label.node.active = true;
        label.node.getComponent(UITransform)!.setContentSize(rect.right-rect.left,rect.top-rect.bottom);
        label.node.setPosition((rect.left+rect.right)/2,(rect.top+rect.bottom)/2);
        label.fontSize = geometry.size; label.lineHeight = geometry.size*1.4; label.isBold = Boolean(geometry.bold);
        label.horizontalAlign = key==='skip' ? HorizontalTextAlignment.CENTER : right ? HorizontalTextAlignment.RIGHT : HorizontalTextAlignment.LEFT;
        label.color = new Color(color); if (label.string!==value) label.string=value;
    }
}
