import { Color, isValid, Node, resources, Sprite, SpriteFrame, UITransform } from 'cc';
import type { GridDefinition } from '../core/GridTypes';
import type { TimedFeedback } from './CombatFeedbackRuntime';
import { coreObjectiveReactionPose } from './CoreObjectiveReaction';
import { PhaseBLayout } from './PhaseBLayout';

const CORE_ART = 'level-one/units/core-reactor-v1/spriteFrame';

/** 出口实体切图独立于生命圆环和战斗单位；缺图时原有目标圆环仍可独立显示。 */
export class CoreObjectiveArtView {
    private readonly node = new Node('CoreObjectiveArt');
    private readonly sprite: Sprite;

    public constructor(parent: Node, private readonly layout: PhaseBLayout) {
        this.node.layer = parent.layer;
        this.node.addComponent(UITransform);
        this.sprite = this.node.addComponent(Sprite);
        this.sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        this.node.active = false;
        parent.addChild(this.node);
        // 战场画板先绘出圆环与状态，再铺实体切图；敌人与塔仍保持在目标上方。
        this.node.setSiblingIndex(2);
        resources.load(CORE_ART, SpriteFrame, (error, frame) => {
            if (error || !frame || !isValid(this.node)) return;
            this.sprite.spriteFrame = frame;
        });
    }

    public render(grid: GridDefinition, coreHits: readonly TimedFeedback[], resultVisible: boolean, reducedMotion = false): void {
        this.node.active = Boolean(this.sprite.spriteFrame) && !resultVisible;
        if (!this.node.active) return;
        const center = this.layout.routePointCenter(grid.exit, grid);
        // 减弱动态只移除目标抖动/缩放，漏怪警示仍由战场圆环保留。
        const reaction = coreObjectiveReactionPose(reducedMotion ? [] : coreHits);
        // 核心独立放在棋盘下方并横向居中，生命环与受击反馈使用同一出口投影。
        const size = this.layout.boardMetrics(grid).cellSize * 1.22;
        this.node.setPosition(center.x, center.y + reaction.offsetY, 0);
        this.node.setScale(reaction.scaleX, reaction.scaleY, 1);
        this.sprite.color = new Color(255, reaction.green, reaction.blue);
        this.node.getComponent(UITransform)?.setContentSize(size, size);
    }
}
