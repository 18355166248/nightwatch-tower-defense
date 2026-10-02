import { isValid, Node, resources, Sprite, SpriteFrame, UITransform } from 'cc';
import { PHASE_B_DESIGN_HEIGHT, PHASE_B_DESIGN_WIDTH } from './PhaseBLayout';
import { ORIGINAL_FIRST_LEVEL_ART, type FirstLevelArtProfile } from './FirstLevelArtProfile';

/** 底图与战斗画板独立加载；图片缺失时战场仍由程序化绘制正常运行。 */
export class PhaseBBackdropView {
    public loadedResourcePath: string | null = null;
    public constructor(parent: Node, profile: FirstLevelArtProfile = ORIGINAL_FIRST_LEVEL_ART) {
        const node = new Node('FirstLevelBackdrop');
        node.layer = parent.layer;
        node.addComponent(UITransform).setContentSize(PHASE_B_DESIGN_WIDTH, PHASE_B_DESIGN_HEIGHT);
        const sprite = node.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        parent.addChild(node);
        const candidates = profile.backdrops;
        const loadCandidate = (index: number): void => {
            resources.load(candidates[index], SpriteFrame, (error, frame) => {
                if (!isValid(node)) return;
                if (error || !frame) {
                    // 在同一尺寸档内回退，避免低占用档缺图时悄悄加载高分底图；全失败才用程序战场。
                    if (index + 1 < candidates.length) loadCandidate(index + 1);
                    return;
                }
                sprite.spriteFrame = frame;
                this.loadedResourcePath = candidates[index];
                sprite.sizeMode = Sprite.SizeMode.CUSTOM;
                node.getComponent(UITransform)?.setContentSize(PHASE_B_DESIGN_WIDTH, PHASE_B_DESIGN_HEIGHT);
            });
        };
        loadCandidate(0);
    }
}
