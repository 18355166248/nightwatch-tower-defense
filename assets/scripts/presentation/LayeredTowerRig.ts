import { Node, Sprite, SpriteFrame, UITransform } from 'cc';
import type { UnitVisualPose } from './UnitVisualMotion';

export interface LayeredTowerSpec {
    readonly baseName: string;
    readonly activeName: string;
    readonly canvasScale: number;
    readonly activeScaleX: number;
    readonly activeScaleY: number;
    readonly activeX: number;
    readonly activeY: number;
}

export const RIVET_GUN_LAYER_SPEC: LayeredTowerSpec = {
    baseName: 'RivetBase', activeName: 'RivetHead', canvasScale: 1.4,
    activeScaleX: 0.68, activeScaleY: 0.68, activeX: 0.03, activeY: 0.12,
};

export const FROST_COIL_LAYER_SPEC: LayeredTowerSpec = {
    baseName: 'FrostBase', activeName: 'FrostCore', canvasScale: 1.4,
    activeScaleX: 0.65, activeScaleY: 0.65, activeX: 0, activeY: 0.04,
};

/** 分层塔共用透明画布配准和节点生命周期，塔种只配置部件比例与事件姿态。 */
export class LayeredTowerRig {
    public static create(key: string, layer: Node, baseFrame: SpriteFrame, activeFrame: SpriteFrame, size: number, spec: LayeredTowerSpec): Node {
        const canvasSize = size * spec.canvasScale;
        const root = new Node(key);
        root.layer = layer.layer;
        root.addComponent(UITransform).setContentSize(canvasSize, canvasSize);
        root.addChild(this.createPart(spec.baseName, root.layer, baseFrame, canvasSize, canvasSize));
        root.addChild(this.createPart(spec.activeName, root.layer, activeFrame, canvasSize * spec.activeScaleX, canvasSize * spec.activeScaleY));
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

    public static pose(root: Node, center: { readonly x: number; readonly y: number }, size: number, motion: UnitVisualPose | null, spec: LayeredTowerSpec): void {
        root.setPosition(center.x, center.y + 3, 0);
        const active = root.getChildByName(spec.activeName);
        if (!active) return;
        const canvasSize = size * spec.canvasScale;
        // 只让炮身或能量芯动，底座不离开逻辑塔位；无事件时恢复切图配准点。
        active.setPosition(canvasSize * spec.activeX + (motion?.x ?? 0), canvasSize * spec.activeY + (motion?.y ?? 0), 0);
        active.setScale(motion?.scaleX ?? 1, motion?.scaleY ?? 1, 1);
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
