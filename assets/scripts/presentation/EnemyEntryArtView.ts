import { isValid, Node, resources, Sprite, SpriteFrame, UITransform } from 'cc';
import type { GridDefinition } from '../core/GridTypes';
import { PhaseBLayout } from './PhaseBLayout';

const ENTRY_ART = 'level-one/units/enemy-entry-hatch-v1/spriteFrame';

/** 敌军入口是纯视觉地标；图片不可用时道路入口与刷怪逻辑照常工作。 */
export class EnemyEntryArtView {
    private readonly node = new Node('EnemyEntryHatchArt');
    private readonly sprite: Sprite;

    public constructor(parent: Node, private readonly layout: PhaseBLayout) {
        this.node.layer = parent.layer;
        this.node.addComponent(UITransform);
        this.sprite = this.node.addComponent(Sprite);
        this.sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        this.node.active = false;
        parent.addChild(this.node);
        // 道路在其下方，活动敌人 Sprite 在其上方；洞口不得盖住刚出现的敌人。
        this.node.setSiblingIndex(3);
        resources.load(ENTRY_ART, SpriteFrame, (error, frame) => {
            if (error || !frame || !isValid(this.node)) return;
            this.sprite.spriteFrame = frame;
        });
    }

    public get ready(): boolean {
        return Boolean(this.sprite.spriteFrame);
    }

    public render(grid: GridDefinition, resultVisible: boolean): void {
        this.node.active = this.ready && !resultVisible;
        if (!this.node.active) return;
        const center = this.layout.routePointCenter(grid.entry, grid);
        // 棋盘上方独立地标按中线定位，透明安全边保留，不再随某一列格心偏移。
        const size = this.layout.boardMetrics(grid).cellSize * 1.55;
        this.node.setPosition(center.x, center.y, 0);
        this.node.getComponent(UITransform)?.setContentSize(size, size);
    }
}
