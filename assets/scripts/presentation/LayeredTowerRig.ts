import { Node, Sprite, SpriteFrame, UITransform } from 'cc';
import type { UnitVisualPose } from './UnitVisualMotion';
import { layeredTowerActivePosition, type LayeredTowerSpec } from './LayeredTowerGeometry';
export { RIVET_GUN_LAYER_SPEC, FROST_COIL_LAYER_SPEC } from './LayeredTowerGeometry';
export type { LayeredTowerSpec } from './LayeredTowerGeometry';

/** 分层塔共用透明画布配准和节点生命周期，塔种只配置部件比例与事件姿态。 */
export class LayeredTowerRig {
    public static create(key: string, layer: Node, baseFrame: SpriteFrame, activeFrame: SpriteFrame, size: number, spec: LayeredTowerSpec): Node {
        const canvasSize = size * spec.canvasScale;
        const root = new Node(key);
        root.layer = layer.layer;
        root.addComponent(UITransform).setContentSize(canvasSize, canvasSize);
        root.addChild(this.createPart(spec.baseName, root.layer, baseFrame, canvasSize, canvasSize));
        const active = this.createPart(spec.activeName, root.layer, activeFrame, canvasSize * spec.activeScaleX, canvasSize * spec.activeScaleY);
        active.getComponent(UITransform)?.setAnchorPoint(spec.activePivotX, spec.activePivotY);
        root.addChild(active);
        layer.addChild(root);
        return root;
    }

    public static hasParts(root: Node, spec: LayeredTowerSpec): boolean {
        return Boolean(root.getChildByName(spec.baseName) && root.getChildByName(spec.activeName));
    }

    public static resize(root: Node, size: number, spec: LayeredTowerSpec): void {
        const canvasSize = size * spec.canvasScale;
        this.resizePart(root, canvasSize, canvasSize);
        const base = root.getChildByName(spec.baseName);
        const active = root.getChildByName(spec.activeName);
        if (base) this.resizePart(base, canvasSize, canvasSize);
        if (active) this.resizePart(active, canvasSize * spec.activeScaleX, canvasSize * spec.activeScaleY);
    }

    /** 升级复用节点时仍须同步两层帧与轴点；只resize会永远显示首次建造图。 */
    public static bindFrames(root: Node, baseFrame: SpriteFrame, activeFrame: SpriteFrame, size: number, spec: LayeredTowerSpec): void {
        const base = root.getChildByName(spec.baseName)?.getComponent(Sprite);
        if (base && base.spriteFrame !== baseFrame) base.spriteFrame = baseFrame;
        this.restoreActiveFrame(root, activeFrame, size, spec);
        this.resize(root, size, spec);
    }

    public static pose(root: Node, center: { readonly x: number; readonly y: number }, size: number, motion: UnitVisualPose | null, spec: LayeredTowerSpec, aimAngleDegrees = 0): void {
        root.setPosition(center.x, center.y + 3, 0);
        const active = root.getChildByName(spec.activeName);
        if (!active) return;
        // 只让炮身或能量芯动，底座不离开逻辑塔位；无事件时恢复切图配准点。
        const position = layeredTowerActivePosition(size, spec, motion);
        active.setPosition(position.x, position.y, 0);
        // 仅旋转独立炮身；每帧写回零角，确保停火、卖塔复用节点后不会保留旧方向。
        active.angle = aimAngleDegrees;
        active.setScale(motion?.scaleX ?? 1, motion?.scaleY ?? 1, 1);
    }

    /** 八向帧未齐/加载失败时恢复旧图的画布轴点，不能让旧透视帧套用旧炮身几何。 */
    public static restoreActiveFrame(root: Node, frame: SpriteFrame, size: number, spec: LayeredTowerSpec): void {
        const active = root.getChildByName(spec.activeName);
        if (!active) return;
        const sprite = active.getComponent(Sprite);
        if (sprite) { if (sprite.spriteFrame !== frame) sprite.spriteFrame = frame; sprite.trim = false; }
        active.getComponent(UITransform)?.setAnchorPoint(spec.activePivotX, spec.activePivotY);
        this.resizePart(active, size * spec.canvasScale * spec.activeScaleX, size * spec.canvasScale * spec.activeScaleY);
    }

    private static createPart(name: string, layer: number, frame: SpriteFrame, width: number, height: number): Node {
        const node = new Node(name);
        node.layer = layer;
        node.addComponent(UITransform).setContentSize(width, height);
        const sprite = node.addComponent(Sprite);
        sprite.spriteFrame = frame;
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        // 分层图靠同一 128×128 透明画布配准，不能让自动裁边改变相对位置。
        sprite.trim = false;
        return node;
    }

    private static resizePart(node: Node, width: number, height: number): void {
        const transform = node.getComponent(UITransform);
        if (transform && (transform.contentSize.width !== width || transform.contentSize.height !== height)) {
            transform.setContentSize(width, height);
        }
    }
}
