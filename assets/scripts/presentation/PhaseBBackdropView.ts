import { isValid, Node, resources, Sprite, SpriteFrame, UITransform } from 'cc';
import { PHASE_B_DESIGN_HEIGHT, PHASE_B_DESIGN_WIDTH } from './PhaseBLayout';

/** 底图与战斗画板独立加载；图片缺失时战场仍由程序化绘制正常运行。 */
export class PhaseBBackdropView {
    public constructor(parent: Node) {
        const node = new Node('FirstLevelBackdrop');
        node.layer = parent.layer;
        node.addComponent(UITransform).setContentSize(PHASE_B_DESIGN_WIDTH, PHASE_B_DESIGN_HEIGHT);
        const sprite = node.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        parent.addChild(node);
        resources.load('level-one/backdrop/spriteFrame', SpriteFrame, (error, frame) => {
            if (error || !frame || !isValid(node)) return;
            sprite.spriteFrame = frame;
            sprite.sizeMode = Sprite.SizeMode.CUSTOM;
            node.getComponent(UITransform)?.setContentSize(PHASE_B_DESIGN_WIDTH, PHASE_B_DESIGN_HEIGHT);
        });
    }
}
