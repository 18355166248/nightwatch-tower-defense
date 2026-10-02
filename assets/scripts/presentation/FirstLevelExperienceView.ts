import { Color, Graphics, HorizontalTextAlignment, Label, Node, UITransform, VerticalTextAlignment } from 'cc';
import type { GridCell, GridDefinition } from '../core/GridTypes';
import {
    shouldOutlineGuidedUpgrade,
    FIRST_LEVEL_SKIP_INTRO_BUTTON,
    type FirstLevelExperienceSnapshot,
} from './FirstLevelExperience';
import {
    PHASE_B_DESIGN_HEIGHT,
    PHASE_B_DESIGN_WIDTH,
    PHASE_B_FROST_BUTTON,
    PHASE_B_EARLY_WAVE_BUTTON,
    PHASE_B_RIVET_BUTTON,
    PHASE_B_UPGRADE_BUTTON,
    type PhaseBRect,
    PhaseBLayout,
} from './PhaseBLayout';
import { FirstLevelHomeArtView } from './FirstLevelHomeArtView';
import { FirstLevelPageSkinView } from './FirstLevelPageSkinView';
import { formatRunDuration } from './BattleResultViewModel';
import { VisibleViewResource } from './VisibleViewResource';
import { firstLevelCoachSkipRect, firstLevelHomeLayout } from './FirstLevelEntryLayout';
import { FirstLevelPanelPainter } from './FirstLevelPanelPainter';
import { FIRST_LEVEL_UI_FONT, firstLevelFontSize } from './FirstLevelUiStyle';
import { firstLevelControlRect } from './FirstLevelUiGeometry';

interface HomeLabels {
    readonly root: Node;
    readonly title: Label;
    readonly body: Label;
    readonly action: Label;
    readonly skip: Label;
    readonly settings: Label;
    readonly bestRecord: Label;
    readonly chapter: Label;
    readonly objective: Label;
    readonly legends: readonly Label[];
    readonly footer: Label;
}

/** 首关入场卡与非阻塞高亮：只消费教学快照，不触碰经济或战斗对象。 */
export class FirstLevelExperienceView {
    private readonly root = new Node('FirstLevelExperience');
    private readonly graphics: Graphics;
    private readonly chrome: FirstLevelPanelPainter;
    private readonly homeLabels: VisibleViewResource<HomeLabels>;
    private readonly coachSkip: Label;
    private readonly introArt: FirstLevelHomeArtView;
    private readonly skins: FirstLevelPageSkinView;
    private repaint: (() => void) | null = null;
    private signature = '';

    public constructor(parent: Node, private readonly layout: PhaseBLayout) {
        this.root.layer = parent.layer;
        this.root.addComponent(UITransform).setContentSize(PHASE_B_DESIGN_WIDTH, PHASE_B_DESIGN_HEIGHT);
        parent.addChild(this.root);
        this.graphics = this.root.addComponent(Graphics);
        this.chrome = new FirstLevelPanelPainter(this.graphics);
        const invalidate = () => {
            this.signature = '';
            this.repaint?.();
        };
        this.skins = new FirstLevelPageSkinView(this.root, invalidate);
        this.homeLabels = new VisibleViewResource(() => this.createHomeLabels(), labels => {
            // Label隐藏仍持有TTF纹理；销毁独立文字子树走引擎正常释放，不能手动销毁共享字体/图集。
            labels.root.removeFromParent();
            labels.root.destroy();
        });
        this.coachSkip = this.label(27, '#E9DDBE', 658, 145, 65);
        this.coachSkip.node.setPosition(375, 658, 0);
        this.introArt = new FirstLevelHomeArtView(this.root, invalidate);
    }

    public render(snapshot: FirstLevelExperienceSnapshot, grid: GridDefinition, resultVisible: boolean, previewCell: GridCell | null,
        inspectedCell: GridCell | null, bestSeconds: number | null, bestRemainingHealth: number | null): void {
        // 异步饰面只重绘最近快照，不能把之前首页状态覆盖当前战斗/结算。
        this.repaint = () => this.render(snapshot, grid, resultVisible, previewCell, inspectedCell, bestSeconds, bestRemainingHealth);
        const signature = `${this.layout.safeHalfWidth}|${snapshot.mode}|${snapshot.step}|${snapshot.canStartFirstWave ?? false}|${snapshot.suggestedTowerId ?? ''}|${snapshot.suggestedCell?.column ?? ''},${snapshot.suggestedCell?.row ?? ''}|${grid.id}|${resultVisible}|${previewCell?.column ?? ''},${previewCell?.row ?? ''}|${inspectedCell?.column ?? ''},${inspectedCell?.row ?? ''}|${bestSeconds ?? ''}|${bestRemainingHealth ?? ''}`;
        if (signature === this.signature) return;
        this.signature = signature;
        this.graphics.clear();
        this.skins.begin();
        const home = snapshot.mode === 'home';
        const guided = snapshot.mode === 'guided' && !resultVisible;
        const homeLabels = this.homeLabels.setVisible(home);
        if (homeLabels) {
            homeLabels.bestRecord.node.active = true;
            homeLabels.bestRecord.string = [bestSeconds !== null ? `最快 ${formatRunDuration(bestSeconds)}` : null,
                bestRemainingHealth !== null ? `最佳核心 ${bestRemainingHealth}/10` : null].filter(Boolean).join('  ·  ') || '首次布防 · 从这里建立你的防线';
        }
        this.introArt.setVisible(home);
        this.coachSkip.node.active = guided;
        const coachSkipRect = firstLevelCoachSkipRect(this.layout);
        this.coachSkip.node.setPosition((coachSkipRect.left + coachSkipRect.right) / 2,
            (coachSkipRect.bottom + coachSkipRect.top) / 2, 0);
        this.coachSkip.node.getComponent(UITransform)?.setContentSize(coachSkipRect.right - coachSkipRect.left, 65);
        if (homeLabels) this.drawHome(homeLabels);
        if (guided) this.drawCoach(snapshot, grid, previewCell, inspectedCell);
    }

    private createHomeLabels(): HomeLabels {
        const root = new Node('HomeLabels');
        root.layer = this.root.layer;
        root.addComponent(UITransform).setContentSize(PHASE_B_DESIGN_WIDTH, PHASE_B_DESIGN_HEIGHT);
        this.root.addChild(root);
        const title = this.label(66, '#F4D58D', 355, 820, 120, root, 'Title');
        const body = this.label(34, '#D9E9F4', -75, 770, 150, root, 'Body');
        const action = this.label(44, '#F4E9CD', -290, 660, 110, root, 'Start');
        const skip = this.label(30, '#D4C8AC', -467.5, 620, 100, root, 'Skip');
        const settings = this.label(31, '#F5EAD4', 400, 180, 80, root, 'Settings');
        settings.node.setPosition(320, 400, 0);
        const bestRecord = this.label(33, '#F4D58D', -170, 760, 64, root, 'BestRecord');
        const chapter = this.label(32, '#A9C4DB', 605, 720, 60, root, 'Chapter');
        const objective = this.label(48, '#F4E9CD', 55, 720, 80, root, 'Objective');
        const legends = [this.label(28,'#F4E9CD',-215,240,60,root,'RivetLegend'),this.label(28,'#F4E9CD',-215,240,60,root,'FrostLegend')];
        const footer = this.label(28,'#A9C4DB',-835,730,45,root,'Footer');
        return {root, title, body, action, skip, settings, bestRecord, chapter, objective, legends, footer};
    }

    private drawHome(labels: HomeLabels): void {
        const graphics = this.graphics;
        graphics.fillColor = new Color(5, 11, 22, 255);
        graphics.rect(-Math.max(540,this.layout.visibleDesignWidth/2), -960, Math.max(1080,this.layout.visibleDesignWidth), 1920);
        graphics.fill();
        const home = firstLevelHomeLayout(this.layout);
        if (!this.skins.panel(home.card)) this.chrome.panel(home.card);
        graphics.strokeColor = new Color('#C79958');
        graphics.lineWidth = 4;
        // 视觉饰面按稿件更薄，热区仍155高；输入不因装饰内缩变小。
        const insetButton = (rect: PhaseBRect): PhaseBRect => ({...rect,bottom:rect.bottom+12,top:rect.top-12});
        if (!this.skins.button(0,insetButton(home.start),'primary')) this.chrome.button(home.start,'primary');
        if (!this.skins.button(1,home.settings,'neutral')) this.chrome.button(home.settings);
        if (!this.skins.button(2,insetButton(home.skip),'neutral')) this.chrome.button(home.skip);
        this.skins.button(3,home.hero,'neutral');
        const positionLabel = (label: Label, rect: PhaseBRect, maxWidth: number, height: number): void => {
            label.node.setPosition((rect.left + rect.right) / 2, (rect.bottom + rect.top) / 2, 0);
            label.node.getComponent(UITransform)?.setContentSize(Math.min(maxWidth, rect.right - rect.left), height);
        };
        positionLabel(labels.title, home.title, 820, 120);
        positionLabel(labels.settings, home.settings, 180, 80);
        positionLabel(labels.action, home.start, 660, 110);
        positionLabel(labels.skip, home.skip, 620, 100);
        for (const label of [labels.body, labels.skip, labels.bestRecord]) {
            const transform = label.node.getComponent(UITransform)!;
            transform.setContentSize(Math.min(home.contentWidth, label === labels.skip ? 450 : label === labels.bestRecord ? 760 : 770), transform.contentSize.height);
        }
        this.introArt.setLayout(home.hero,home.contentWidth);
        const half = Math.min(425,home.contentWidth/2-22);
        const text = (label: Label, size: number, x: number, y: number, width: number, height: number, left = true) => {
            label.fontSize = size; label.lineHeight = Math.round(size*1.4);
            label.horizontalAlign = left ? HorizontalTextAlignment.LEFT : HorizontalTextAlignment.CENTER;
            label.node.setPosition(left ? x+width/2 : x,y);
            label.node.getComponent(UITransform)!.setContentSize(width,height);
        };
        text(labels.title,68,home.title.left,765,home.title.right-home.title.left,100);
        text(labels.chapter,32,-half,670,half*2,50);
        text(labels.objective,48,-half,25,half*2,80);
        text(labels.body,32,-half,-105,half*2,110);
        text(labels.bestRecord,28,0,-410,half*2,50,false);
        text(labels.action,38,55,(home.start.bottom+home.start.top)/2,540,80,false);
        text(labels.skip,32,0,(home.skip.bottom+home.skip.top)/2,Math.min(650,half*2-24),80,false);
        text(labels.footer,28,0,-805,half*2,45,false);
        labels.settings.string = '';
        this.skins.icon('home-settings','settings-icon',{left:(home.settings.left+home.settings.right)/2-36,right:(home.settings.left+home.settings.right)/2+36,bottom:711.5,top:783.5});
        this.skins.icon('home-start','play-icon',{left:-151,right:-85,bottom:(home.start.bottom+home.start.top)/2-33,top:(home.start.bottom+home.start.top)/2+33});
        for (let i=0;i<2;i++) {
            const rect = {left:i ? 12 : -half,right:i ? half : -12,bottom:-340,top:-200};
            this.skins.button(4+i,rect,'neutral');
            const width = rect.right-rect.left-144;
            text(labels.legends[i],28,rect.left+132,-270,width,90);
            // 固定高度扩展到极窄屏时说明换行，而不是裁掉能力文字或缩小热区。
            labels.legends[i].string = width < 210 ? i ? '冷凝\n减速控场' : '机枪\n集中输出' : i ? '冷凝 · 减速控场' : '机枪 · 集中输出';
        }
        this.skins.headerDivider(-half,half,-365);
        labels.title.string = '夜城防线';
        labels.title.color = new Color('#F4E9CD');
        labels.chapter.string = '第一关 · 夜城广场';
        labels.objective.string = '守住夜城入口';
        labels.body.string = '摆塔改路，让敌人走进火力区\n坚守八波，保护核心';
        labels.action.string = '开始布防';
        labels.skip.string = '自由布防 · 跳过引导';
        labels.footer.string = '本关自由布塔 · 无额外道具';
        if (typeof document !== 'undefined') document.querySelector('canvas')?.setAttribute('data-home-ui',JSON.stringify({
            version:'quality-v3',chrome:this.skins.diagnostics,art:this.introArt.diagnostics,
            titleFontSize:labels.title.fontSize,bodyFontSize:labels.body.fontSize,
        }));
    }

    private drawCoach(snapshot: FirstLevelExperienceSnapshot, grid: GridDefinition, previewCell: GridCell | null, inspectedCell: GridCell | null): void {
        this.chrome.button(firstLevelCoachSkipRect(this.layout));
        this.coachSkip.string = '跳过';
        const graphics = this.graphics;
        graphics.strokeColor = new Color('#FFE09C');
        graphics.lineWidth = 7;
        if (snapshot.step === 'select' || snapshot.step === 'shape' || snapshot.step === 'reinforce') {
            // 教学建议用指针，卡片内描边只留给真正“拿起炮塔”的输入态，避免首局误以为点网格即可落塔。
            this.pointAtTower(firstLevelControlRect(snapshot.suggestedTowerId === 'frost-coil' ? PHASE_B_FROST_BUTTON : PHASE_B_RIVET_BUTTON, true));
            if (snapshot.suggestedCell) this.outlineCell(snapshot.suggestedCell, grid);
        } else if (snapshot.step === 'place') {
            if (previewCell ?? snapshot.suggestedCell) this.outlineCell(previewCell ?? snapshot.suggestedCell!, grid);
        } else if (snapshot.step === 'route') {
            if (snapshot.suggestedCell) this.outlineCell(snapshot.suggestedCell, grid);
            else {
                const board = this.layout.boardMetrics(grid);
                this.outline({ left: board.left, right: board.left + board.width, bottom: board.bottom, top: board.bottom + board.height });
            }
        } else if (snapshot.step === 'upgrade') {
            if (snapshot.suggestedCell) this.outlineCell(snapshot.suggestedCell, grid);
            if (shouldOutlineGuidedUpgrade(snapshot.suggestedCell, inspectedCell)) {
                this.outline(firstLevelControlRect(PHASE_B_UPGRADE_BUTTON, true));
            }
        } else if (snapshot.step === 'ready') {
            this.outline(firstLevelControlRect(PHASE_B_EARLY_WAVE_BUTTON, true));
        }
        // 已满足硬门槛时同时指出可开波入口，推荐塔位仍只是可选的更稳构筑。
        if (snapshot.step === 'shape' && snapshot.canStartFirstWave) this.outline(firstLevelControlRect(PHASE_B_EARLY_WAVE_BUTTON, true));
    }

    private outlineCell(cell: GridCell, grid: GridDefinition): void {
        const center = this.layout.gridPointCenter(cell, grid);
        const size = this.layout.boardMetrics(grid).cellSize;
        this.graphics.roundRect(center.x - size / 2, center.y - size / 2, size, size, 12);
        this.graphics.stroke();
    }

    private pointAtTower(rect: PhaseBRect): void {
        const safe = this.layout.safeRect(rect);
        const x = (safe.left + safe.right) / 2;
        const tipY = safe.top + 12;
        this.graphics.fillColor = new Color('#FFE09C');
        this.graphics.moveTo(x, tipY);
        this.graphics.lineTo(x - 22, tipY + 27);
        this.graphics.lineTo(x + 22, tipY + 27);
        this.graphics.close();
        this.graphics.fill();
    }

    private outline(rect: PhaseBRect): void {
        this.graphics.roundRect(rect.left - 9, rect.bottom - 9, rect.right - rect.left + 18, rect.top - rect.bottom + 18, 18);
        this.graphics.stroke();
    }

    private label(fontSize: number, color: string, y: number, width: number, height: number, parent = this.root, name = 'ExperienceLabel'): Label {
        const node = new Node(name);
        node.layer = parent.layer;
        node.setPosition(0, y, 0);
        const label = node.addComponent(Label);
        const transform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
        transform.setContentSize(width, height);
        label.fontFamily = FIRST_LEVEL_UI_FONT;
        label.fontSize = firstLevelFontSize(fontSize);
        label.lineHeight = Math.round(label.fontSize * 1.45);
        label.color = new Color(color);
        label.horizontalAlign = HorizontalTextAlignment.CENTER;
        label.verticalAlign = VerticalTextAlignment.CENTER;
        label.overflow = Label.Overflow.CLAMP;
        parent.addChild(node);
        return label;
    }
}
