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
    type PhaseBRect,
    PhaseBLayout,
} from './PhaseBLayout';
import { FirstLevelHomeArtView } from './FirstLevelHomeArtView';
import { FirstLevelPageSkinView } from './FirstLevelPageSkinView';
import { formatRunDuration } from './BattleResultViewModel';
import { VisibleViewResource } from './VisibleViewResource';
import { firstLevelHomeLayout } from './FirstLevelEntryLayout';
import { FirstLevelPanelPainter } from './FirstLevelPanelPainter';
import { FIRST_LEVEL_UI_FONT, firstLevelFontSize } from './FirstLevelUiStyle';
import { firstLevelControlRect } from './FirstLevelUiGeometry';
import { firstLevelTowerPanelLayout } from './FirstLevelTowerPanelPresentation';

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
    private readonly introArt: FirstLevelHomeArtView;
    private readonly skins: FirstLevelPageSkinView;
    private repaint: (() => void) | null = null;
    private signature = '';
    private pulse = 0;
    private readonly targetLabel: Label;

    public constructor(parent: Node, private readonly layout: PhaseBLayout) {
        this.root.layer = parent.layer;
        this.root.addComponent(UITransform).setContentSize(PHASE_B_DESIGN_WIDTH, PHASE_B_DESIGN_HEIGHT);
        parent.addChild(this.root);
        this.graphics = this.root.addComponent(Graphics);
        this.chrome = new FirstLevelPanelPainter(this.graphics);
        this.targetLabel = this.label(54, '#FFFFFF', 0, 360, 76, this.root, 'CoachTarget');
        this.targetLabel.isBold = true; this.targetLabel.node.active = false;
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
        this.introArt = new FirstLevelHomeArtView(this.root, invalidate);
    }

    public render(snapshot: FirstLevelExperienceSnapshot, grid: GridDefinition, resultVisible: boolean, previewCell: GridCell | null,
        inspectedCell: GridCell | null, bestSeconds: number | null, bestRemainingHealth: number | null, visualSeconds = 0, reducedMotion = false): void {
        // 异步饰面只重绘最近快照，不能把之前首页状态覆盖当前战斗/结算。
        this.repaint = () => this.render(snapshot, grid, resultVisible, previewCell, inspectedCell, bestSeconds, bestRemainingHealth, visualSeconds, reducedMotion);
        // 只重绘引导图形，文字节点复用；降低动态效果时仍保留高对比静态目标。
        const animated = snapshot.mode === 'guided' && !resultVisible && snapshot.step !== 'combat';
        const frame = animated && !reducedMotion ? Math.floor(visualSeconds * 20) : 0;
        this.pulse = reducedMotion ? 0.5 : (1 + Math.sin(frame / 20 * Math.PI * 2 / 1.2)) / 2;
        const signature = `${frame}|${reducedMotion}|${this.layout.safeHalfWidth}|${snapshot.mode}|${snapshot.step}|${snapshot.canStartFirstWave ?? false}|${snapshot.suggestedTowerId ?? ''}|${snapshot.suggestedCell?.column ?? ''},${snapshot.suggestedCell?.row ?? ''}|${grid.id}|${resultVisible}|${previewCell?.column ?? ''},${previewCell?.row ?? ''}|${inspectedCell?.column ?? ''},${inspectedCell?.row ?? ''}|${bestSeconds ?? ''}|${bestRemainingHealth ?? ''}`;
        if (signature === this.signature) return;
        this.signature = signature;
        this.graphics.clear();
        this.targetLabel.node.active = false;
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
        if (homeLabels) this.drawHome(homeLabels);
        if (guided) {
            this.drawCoach(snapshot, grid, previewCell, inspectedCell);
            if (this.targetLabel.node.active) this.targetLabel.string = snapshot.step === 'upgrade' ? '点此塔升级' : snapshot.step === 'route' ? '点此塔调整' : snapshot.step === 'place' ? '点亮格放置' : '在亮格建塔';
        }
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
        labels.chapter.string = '第一关 · 新手关';
        labels.objective.string = '守住夜城入口';
        labels.body.string = '摆塔改路，让敌人走进火力区\n坚守八波，保护核心';
        labels.action.string = '第一关 · 开始引导';
        labels.skip.string = '第二关 · 高压防守';
        labels.footer.string = '引导：布塔 → 第一波 → 升级补塔';
        if (typeof document !== 'undefined') document.querySelector('canvas')?.setAttribute('data-home-ui',JSON.stringify({
            version:'quality-v3',chrome:this.skins.diagnostics,art:this.introArt.diagnostics,
            titleFontSize:labels.title.fontSize,bodyFontSize:labels.body.fontSize,
        }));
    }

    private drawCoach(snapshot: FirstLevelExperienceSnapshot, grid: GridDefinition, previewCell: GridCell | null, inspectedCell: GridCell | null): void {
        // 查看升级外观时收起地图教学遮罩，避免高亮跨过详情卡挡住当前/下一阶图像。
        if (inspectedCell && snapshot.step !== 'upgrade') return;
        const graphics = this.graphics;
        graphics.strokeColor = new Color('#FFFFFF');
        graphics.lineWidth = 10;
        // 棋盘轻压暗衬出目标，不创建输入遮罩，玩家仍可选择任意合法格子。
        if (snapshot.suggestedCell && snapshot.step !== 'combat') {
            const board = this.layout.boardMetrics(grid);
            graphics.fillColor = new Color(3, 10, 20, 80);
            graphics.rect(board.left, board.bottom, board.width, board.height); graphics.fill();
        }
        if (snapshot.step === 'select' || snapshot.step === 'shape' || snapshot.step === 'reinforce') {
            // 新流程先点空地再选塔，教学只强调地图落点，避免把玩家拉回底部塔栏。
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
                // 输入与新面板共用几何，旧HUD坐标会把升级提示画到战场空白处。
                this.outline(firstLevelTowerPanelLayout(this.layout.visibleDesignWidth,false,inspectedCell ? {center:this.layout.gridPointCenter(inspectedCell,grid),cellSize:this.layout.boardMetrics(grid).cellSize}:undefined).upgrade);
            }
        } else if (snapshot.step === 'ready') {
            this.outline(firstLevelControlRect(PHASE_B_EARLY_WAVE_BUTTON, true));
        }
        // 推荐补塔阶段只强调当前动作，开波按钮仍可用；准备完成后再单独高亮开波，避免多个亮框争抢注意。
    }

    private outlineCell(cell: GridCell, grid: GridDefinition): void {
        const center = this.layout.gridPointCenter(cell, grid);
        const size = this.layout.boardMetrics(grid).cellSize;
        const rect = {left:center.x-size/2,right:center.x+size/2,bottom:center.y-size/2,top:center.y+size/2};
        this.outline(rect);
        const y = center.y + size / 2 + 90 + this.pulse * 12;
        const x = Math.min(Math.max(center.x,-this.layout.safeHalfWidth+190),this.layout.safeHalfWidth-190);
        this.graphics.fillColor = new Color(5, 23, 34, 245);
        this.graphics.roundRect(x-180,y-38,360,76,20); this.graphics.fill();
        this.targetLabel.node.active = true; this.targetLabel.node.setPosition(x,y);
        this.targetLabel.string = '在亮格建塔';
        this.arrow(center.x, center.y + size/2 + 12);
    }

    private pointAtTower(rect: PhaseBRect): void {
        const safe = this.layout.safeRect(rect);
        this.outline(safe);
        this.arrow((safe.left+safe.right)/2, safe.top+16);
    }

    private arrow(x: number, tipY: number): void {
        const g = this.graphics, y = tipY + this.pulse * 12;
        // 大箭头配深色外轮廓，避免金色指针融进铜色地图；呼吸位移不改变实际热区。
        g.fillColor = new Color('#FFD34F'); g.strokeColor = new Color('#06121F'); g.lineWidth = 8;
        g.moveTo(x,y); g.lineTo(x-38,y+40); g.lineTo(x-16,y+40);
        g.lineTo(x-16,y+70); g.lineTo(x+16,y+70); g.lineTo(x+16,y+40); g.lineTo(x+38,y+40); g.close(); g.fill(); g.stroke();
    }

    private outline(rect: PhaseBRect): void {
        const g=this.graphics, expand=9+this.pulse*10;
        g.fillColor = new Color(44, 232, 255, 50 + Math.round(this.pulse * 35));
        g.roundRect(rect.left,rect.bottom,rect.right-rect.left,rect.top-rect.bottom,12);g.fill();
        g.strokeColor = new Color(43, 228, 255, 120);g.lineWidth=18;
        g.roundRect(rect.left-expand,rect.bottom-expand,rect.right-rect.left+expand*2,rect.top-rect.bottom+expand*2,18);g.stroke();
        g.strokeColor = new Color('#FFFFFF');g.lineWidth=7;
        g.roundRect(rect.left-4,rect.bottom-4,rect.right-rect.left+8,rect.top-rect.bottom+8,14);g.stroke();
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
