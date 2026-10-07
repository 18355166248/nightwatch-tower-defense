import { Color, Graphics, HorizontalTextAlignment, Label, Node, UITransform, VerticalTextAlignment } from 'cc';
import type { GridCell, GridDefinition } from '../core/GridTypes';
import {
    shouldOutlineGuidedUpgrade,
    type FirstLevelExperienceSnapshot,
} from './FirstLevelExperience';
import {
    PHASE_B_DESIGN_HEIGHT,
    PHASE_B_DESIGN_WIDTH,
    PHASE_B_EARLY_WAVE_BUTTON,
    type PhaseBRect,
    PhaseBLayout,
} from './PhaseBLayout';
import { FIRST_LEVEL_UI_FONT, firstLevelFontSize } from './FirstLevelUiStyle';
import { firstLevelControlRect } from './FirstLevelUiGeometry';
import { firstLevelTowerPanelLayout } from './FirstLevelTowerPanelPresentation';

/** 首关非阻塞教学高亮：只消费教学快照，不触碰经济或战斗对象。 */
export class FirstLevelExperienceView {
    private readonly root = new Node('FirstLevelExperience');
    private readonly graphics: Graphics;
    private signature = '';
    private pulse = 0;
    private readonly targetLabel: Label;

    public constructor(parent: Node, private readonly layout: PhaseBLayout) {
        this.root.layer = parent.layer;
        this.root.addComponent(UITransform).setContentSize(PHASE_B_DESIGN_WIDTH, PHASE_B_DESIGN_HEIGHT);
        parent.addChild(this.root);
        this.graphics = this.root.addComponent(Graphics);
        this.targetLabel = this.label(54, '#FFFFFF', 0, 360, 76, this.root, 'CoachTarget');
        this.targetLabel.isBold = true; this.targetLabel.node.active = false;

    }

    public render(snapshot: FirstLevelExperienceSnapshot, grid: GridDefinition, resultVisible: boolean, previewCell: GridCell | null,
        inspectedCell: GridCell | null, bestSeconds: number | null, bestRemainingHealth: number | null, visualSeconds = 0, reducedMotion = false): void {
        // 只重绘引导图形，文字节点复用；降低动态效果时仍保留高对比静态目标。
        const animated = snapshot.mode === 'guided' && !resultVisible && snapshot.step !== 'combat';
        const frame = animated && !reducedMotion ? Math.floor(visualSeconds * 20) : 0;
        this.pulse = reducedMotion ? 0.5 : (1 + Math.sin(frame / 20 * Math.PI * 2 / 1.2)) / 2;
        const signature = `${frame}|${reducedMotion}|${this.layout.safeHalfWidth}|${snapshot.mode}|${snapshot.step}|${snapshot.canStartFirstWave ?? false}|${snapshot.suggestedTowerId ?? ''}|${snapshot.suggestedCell?.column ?? ''},${snapshot.suggestedCell?.row ?? ''}|${grid.id}|${resultVisible}|${previewCell?.column ?? ''},${previewCell?.row ?? ''}|${inspectedCell?.column ?? ''},${inspectedCell?.row ?? ''}|${bestSeconds ?? ''}|${bestRemainingHealth ?? ''}`;
        if (signature === this.signature) return;
        this.signature = signature;
        this.graphics.clear();
        this.targetLabel.node.active = false;
        const guided = snapshot.mode === 'guided' && !resultVisible;
        if (guided) {
            this.drawCoach(snapshot, grid, previewCell, inspectedCell);
            if (this.targetLabel.node.active) this.targetLabel.string = snapshot.step === 'upgrade' ? '点此塔升级' : snapshot.step === 'route' ? '点此塔调整' : snapshot.step === 'place' ? '点亮格放置' : '在亮格建塔';
        }
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
