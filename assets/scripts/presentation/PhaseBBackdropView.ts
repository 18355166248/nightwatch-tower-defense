import { isValid, Node, resources, Sprite, SpriteFrame, UITransform } from 'cc';
import { PHASE_B_DESIGN_HEIGHT, PHASE_B_DESIGN_WIDTH } from './PhaseBLayout';
import { ORIGINAL_FIRST_LEVEL_ART, type FirstLevelArtProfile } from './FirstLevelArtProfile';
import { VisibleAsyncAsset } from './VisibleAsyncAsset';

type BackdropAsset = { readonly frame: SpriteFrame; readonly path: string };

/** 底图与战斗画板独立加载；图片缺失时战场仍由程序化绘制正常运行。 */
export class PhaseBBackdropView {
    public loadedResourcePath: string | null = null;
    private readonly node: Node;
    private lease: VisibleAsyncAsset<BackdropAsset>;
    private visible = false;
    private pathKey = "";
    private readonly sprite: Sprite;
    private readonly defaults: readonly string[];
    public constructor(parent: Node, profile: FirstLevelArtProfile = ORIGINAL_FIRST_LEVEL_ART) {
        const node = new Node('FirstLevelBackdrop');
        this.node = node;
        node.layer = parent.layer;
        node.addComponent(UITransform).setContentSize(PHASE_B_DESIGN_WIDTH, PHASE_B_DESIGN_HEIGHT);
        const sprite = node.addComponent(Sprite);
        this.sprite = sprite; this.defaults = profile.backdrops;
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        parent.addChild(node);
        node.active = false;
        this.lease = this.createLease(profile.backdrops);
        node.on(Node.EventType.NODE_DESTROYED, () => this.lease.setVisible(false));
    }

    private createLease(candidates: readonly string[]): VisibleAsyncAsset<BackdropAsset> {
        const node=this.node,sprite=this.sprite;
        const loadCandidate = (index: number, complete: (asset: BackdropAsset | null) => void): void => {
            resources.load(candidates[index], SpriteFrame, (error, frame) => {
                if (error || !frame) {
                    // 在同一尺寸档内回退，避免低占用档缺图时悄悄加载高分底图；全失败才用程序战场。
                    if (index + 1 < candidates.length) loadCandidate(index + 1, complete);
                    else complete(null);
                    return;
                }
                complete({ frame, path: candidates[index] });
            });
        };
        return new VisibleAsyncAsset<BackdropAsset>(
            complete => loadCandidate(0, complete),
            asset => { asset.frame.addRef(); },
            asset => { asset.frame.decRef(); },
            asset => {
                this.loadedResourcePath = asset?.path ?? null;
                if (!isValid(node)) return;
                sprite.spriteFrame = asset?.frame ?? null;
                sprite.sizeMode = Sprite.SizeMode.CUSTOM;
                node.getComponent(UITransform)?.setContentSize(PHASE_B_DESIGN_WIDTH, PHASE_B_DESIGN_HEIGHT);
            },
        );
    }

    public setVisible(visible: boolean, resourcePath?: string): void {
        const key=resourcePath ?? '';
        if (key !== this.pathKey) {
            // 先废弃旧租约代次再建立新关卡加载，迟到回调只能归还资源，不能串关。
            this.lease.setVisible(false); this.pathKey=key;
            this.lease=this.createLease(resourcePath ? [resourcePath] : this.defaults);
        }
        this.visible=visible;
        // 首页完全遮盖战场；先清精灵引用再归还独占背景，暂停/结算仍需要底图，不释放共享角色。
        this.node.active = visible;
        this.lease.setVisible(visible);
    }
}
