import { Color, Graphics, HorizontalTextAlignment, Label, Node, UITransform, VerticalTextAlignment } from 'cc';
import type { GridCell, GridDefinition } from '../core/GridTypes';
import {
    FIRST_LEVEL_SKIP_COACH_BUTTON,
    FIRST_LEVEL_SKIP_INTRO_BUTTON,
    FIRST_LEVEL_START_BUTTON,
    type FirstLevelExperienceSnapshot,
} from './FirstLevelExperience';
import {
    PHASE_B_DESIGN_HEIGHT,
    PHASE_B_DESIGN_WIDTH,
    PHASE_B_FROST_BUTTON,
    PHASE_B_RIVET_BUTTON,
    PHASE_B_UPGRADE_BUTTON,
    type PhaseBRect,
    PhaseBLayout,
} from './PhaseBLayout';

/** 首关入场卡与非阻塞高亮：只消费教学快照，不触碰经济或战斗对象。 */
export class FirstLevelExperienceView {
    private readonly root = new Node('FirstLevelExperience');
    private readonly graphics: Graphics;
    private readonly title: Label;
    private readonly body: Label;
    private readonly action: Label;
    private readonly skip: Label;
    private readonly coachSkip: Label;
    private signature = '';

    public constructor(parent: Node, private readonly layout: PhaseBLayout) {
        this.root.layer = parent.layer;
        this.root.addComponent(UITransform).setContentSize(PHASE_B_DESIGN_WIDTH, PHASE_B_DESIGN_HEIGHT);
        parent.addChild(this.root);
        this.graphics = this.root.addComponent(Graphics);
        this.title = this.label(66, '#F4D58D', 295, 820, 120);
        this.body = this.label(35, '#D9E9F4', 25, 770, 340);
        this.action = this.label(44, '#10283B', -270, 660, 110);
        this.skip = this.label(30, '#A9C4DB', -410, 450, 80);
        this.coachSkip = this.label(27, '#E9DDBE', 658, 145, 65);
        this.coachSkip.node.setPosition(375, 658, 0);
    }

    public render(snapshot: FirstLevelExperienceSnapshot, grid: GridDefinition, resultVisible: boolean, previewCell: GridCell | null): void {
        const signature = `${this.layout.safeHalfWidth}|${snapshot.mode}|${snapshot.step}|${snapshot.suggestedTowerId ?? ''}|${snapshot.suggestedCell?.column ?? ''},${snapshot.suggestedCell?.row ?? ''}|${grid.id}|${resultVisible}|${previewCell?.column ?? ''},${previewCell?.row ?? ''}`;
        if (signature === this.signature) return;
        this.signature = signature;
        this.graphics.clear();
        const home = snapshot.mode === 'home';
        const guided = snapshot.mode === 'guided' && !resultVisible;
        this.title.node.active = home;
        this.body.node.active = home;
        this.action.node.active = home;
        this.skip.node.active = home;
        this.coachSkip.node.active = guided;
        const coachSkipRect = this.layout.safeRect(FIRST_LEVEL_SKIP_COACH_BUTTON);
        this.coachSkip.node.setPosition((coachSkipRect.left + coachSkipRect.right) / 2, 658, 0);
        this.coachSkip.node.getComponent(UITransform)?.setContentSize(coachSkipRect.right - coachSkipRect.left, 65);
        if (home) this.drawHome();
        if (guided) this.drawCoach(snapshot, grid, previewCell);
    }

    private drawHome(): void {
        const graphics = this.graphics;
        graphics.fillColor = new Color(5, 11, 22, 225);
        graphics.rect(-540, -960, 1080, 1920);
        graphics.fill();
        graphics.fillColor = new Color('#1C3045');
        const cardWidth = Math.min(910, this.layout.safeHalfWidth * 2);
        graphics.roundRect(-cardWidth / 2, -500, cardWidth, 1030, 36);
        graphics.fill();
        graphics.fillColor = new Color('#C79958');
        graphics.rect(-cardWidth / 2, 470, cardWidth, 60);
        graphics.fill();
        graphics.strokeColor = new Color('#C79958');
        graphics.lineWidth = 4;
        const bodyWidth = Math.min(820, cardWidth - 40);
        graphics.roundRect(-bodyWidth / 2, -170, bodyWidth, 340, 25);
        graphics.stroke();
        this.button(FIRST_LEVEL_START_BUTTON, '#83D2AD');
        this.title.string = '夜城防线';
        this.body.string = '第一关 · 守住夜城入口\n\n摆塔让敌人绕远路\n机枪负责输出，冷凝负责减速\n用 140 金完成第一道横墙，守住八波';
        this.action.string = '开始布防';
        this.skip.string = '直接开始 · 跳过引导';
    }

    private drawCoach(snapshot: FirstLevelExperienceSnapshot, grid: GridDefinition, previewCell: GridCell | null): void {
        this.button(this.layout.safeRect(FIRST_LEVEL_SKIP_COACH_BUTTON), '#30465B');
        this.coachSkip.string = '跳过';
        const graphics = this.graphics;
        graphics.strokeColor = new Color('#FFE09C');
        graphics.lineWidth = 7;
        if (snapshot.step === 'select' || snapshot.step === 'shape' || snapshot.step === 'reinforce') {
            this.outline(snapshot.suggestedTowerId === 'frost-coil' ? PHASE_B_FROST_BUTTON : PHASE_B_RIVET_BUTTON);
            if (snapshot.suggestedCell) this.outlineCell(snapshot.suggestedCell, grid);
        } else if (snapshot.step === 'place') {
            if (previewCell ?? snapshot.suggestedCell) this.outlineCell(previewCell ?? snapshot.suggestedCell!, grid);
        } else if (snapshot.step === 'route') {
            const board = this.layout.boardMetrics(grid);
            this.outline({ left: board.left, right: board.left + board.width, bottom: board.bottom, top: board.bottom + board.height });
        } else if (snapshot.step === 'upgrade') {
            if (snapshot.suggestedCell) this.outlineCell(snapshot.suggestedCell, grid);
            this.outline(PHASE_B_UPGRADE_BUTTON);
        } else if (snapshot.step === 'ready') {
            this.outline(this.layout.safeRect({ left: 100, right: 440, bottom: -600, top: -515 }));
        }
    }

    private outlineCell(cell: GridCell, grid: GridDefinition): void {
        const center = this.layout.gridPointCenter(cell, grid);
        const size = this.layout.boardMetrics(grid).cellSize;
        this.graphics.roundRect(center.x - size / 2, center.y - size / 2, size, size, 12);
        this.graphics.stroke();
    }

    private outline(rect: PhaseBRect): void {
        this.graphics.roundRect(rect.left - 9, rect.bottom - 9, rect.right - rect.left + 18, rect.top - rect.bottom + 18, 18);
        this.graphics.stroke();
    }

    private button(rect: PhaseBRect, color: string): void {
        this.graphics.fillColor = new Color(color);
        this.graphics.roundRect(rect.left, rect.bottom, rect.right - rect.left, rect.top - rect.bottom, 24);
        this.graphics.fill();
    }

    private label(fontSize: number, color: string, y: number, width: number, height: number): Label {
        const node = new Node('ExperienceLabel');
        node.layer = this.root.layer;
        node.setPosition(0, y, 0);
        const label = node.addComponent(Label);
        const transform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
        transform.setContentSize(width, height);
        label.fontSize = fontSize;
        label.lineHeight = Math.round(fontSize * 1.45);
        label.color = new Color(color);
        label.horizontalAlign = HorizontalTextAlignment.CENTER;
        label.verticalAlign = VerticalTextAlignment.CENTER;
        label.overflow = Label.Overflow.CLAMP;
        this.root.addChild(node);
        return label;
    }
}
