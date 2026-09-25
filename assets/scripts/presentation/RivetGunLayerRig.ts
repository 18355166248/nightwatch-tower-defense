import { Node, Sprite, SpriteFrame, UITransform } from 'cc';
import type { UnitVisualPose } from './UnitVisualMotion';

const HEAD_SCALE = 0.68;
const HEAD_X = 0.03;
const HEAD_Y = 0.12;
// 分层图保留透明配准画布，可见部分只占约六成；放大画布以恢复原静态塔的格内轮廓。
const CANVAS_SCALE = 1.4;

/** 机枪塔的底座与炮身使用同一原画画布坐标；仅炮身消费开火姿态。 */
export class RivetGunLayerRig {
    public static create(key: string, layer: Node, baseFrame: SpriteFrame, headFrame: SpriteFrame, size: number): Node {
        const canvasSize = size * CANVAS_SCALE;
        const root = new Node(key);
        root.layer = layer.layer;
        root.addComponent(UITransform).setContentSize(canvasSize, canvasSize);
        root.addChild(this.createPart('RivetBase', root.layer, baseFrame, canvasSize));
        root.addChild(this.createPart('RivetHead', root.layer, headFrame, canvasSize * HEAD_SCALE));
        layer.addChild(root);
        this.resize(root, size);
        return root;
    }

    public static resize(root: Node, size: number): void {
        const canvasSize = size * CANVAS_SCALE;
        this.resizePart(root, canvasSize);
        const base = root.getChildByName('RivetBase');
        const head = root.getChildByName('RivetHead');
        if (base) this.resizePart(base, canvasSize);
        if (head) this.resizePart(head, canvasSize * HEAD_SCALE);
    }

    public static pose(root: Node, center: { readonly x: number; readonly y: number }, size: number, recoil: UnitVisualPose | null): void {
        root.setPosition(center.x, center.y + 3, 0);
        const head = root.getChildByName('RivetHead');
        if (!head) return;
        const canvasSize = size * CANVAS_SCALE;
        // 只移动炮身，底座牢牢落在格心；没有开火事件时立即回到切图对齐点。
        head.setPosition(canvasSize * HEAD_X + (recoil?.x ?? 0), canvasSize * HEAD_Y + (recoil?.y ?? 0), 0);
        head.setScale(recoil?.scaleX ?? 1, recoil?.scaleY ?? 1, 1);
    }

    private static createPart(name: string, layer: number, frame: SpriteFrame, size: number): Node {
        const node = new Node(name);
        node.layer = layer;
        node.addComponent(UITransform).setContentSize(size, size);
        const sprite = node.addComponent(Sprite);
        sprite.spriteFrame = frame;
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        // 两张分层图以相同的 128×128 透明画布配准，不能让自动裁边改变相对位置。
        sprite.trim = false;
        return node;
    }

    private static resizePart(node: Node, size: number): void {
        const transform = node.getComponent(UITransform);
        if (transform && transform.contentSize.width !== size) transform.setContentSize(size, size);
    }
}
