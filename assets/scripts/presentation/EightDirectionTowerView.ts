import { Node, Sprite, SpriteFrame, UITransform } from 'cc';
import { directionalHeadMuzzlePoint, type DirectionalHeadRegistration } from './EightDirectionTowerAim';
import type { UnitVisualPose } from './UnitVisualMotion';
import type { VisualPoint } from './CombatVisualAnchors';

/** 固定底座上交换真实透视帧，节点不做平面旋转；枪口与透明画布共用轴点。 */
export function poseDirectionalTowerHead(root: Node, frame: SpriteFrame, registration: DirectionalHeadRegistration,
    center: VisualPoint, size: number, motion: UnitVisualPose | null): VisualPoint {
    const active = root.getChildByName('RivetHead');
    if (!active) return center;
    const displaySize = size * 1.3;
    const transform = active.getComponent(UITransform);
    transform?.setContentSize(displaySize, displaySize);
    transform?.setAnchorPoint(registration.pivot.x, 1 - registration.pivot.y);
    const sprite = active.getComponent(Sprite);
    if (sprite) { sprite.spriteFrame = frame; sprite.trim = false; }
    const x = motion?.x ?? 0;
    const y = motion?.y ?? 0;
    active.setPosition(x, y, 0);
    active.angle = 0;
    active.setScale(motion?.scaleX ?? 1, motion?.scaleY ?? 1, 1);
    return directionalHeadMuzzlePoint(registration, { x: center.x + x, y: center.y + 3 + y }, displaySize, 0,
        { x: motion?.scaleX ?? 1, y: motion?.scaleY ?? 1 });
}
