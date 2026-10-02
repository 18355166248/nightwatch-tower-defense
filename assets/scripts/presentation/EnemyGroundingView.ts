import { Color, Graphics, Node, UITransform } from 'cc';
import type { EnemyId } from '../config/PhaseBCombatConfig';
import { enemyGroundingStyle, type EnemyArrivalPose } from './EnemyArrivalPresentation';

/** 接触斑独立于步伐 Body：身体弹起时脚下识别点仍贴着真实行进路线。 */
export class EnemyGroundingView {
    public static attach(enemy: Node): void {
        const ground = new Node('Grounding');
        ground.layer = enemy.layer;
        ground.addComponent(UITransform).setContentSize(100, 100);
        ground.addComponent(Graphics);
        enemy.addChild(ground);
    }

    public static render(enemy: Node, id: EnemyId, size: number, arrival: EnemyArrivalPose): void {
        const graphics = enemy.getChildByName('Grounding')?.getComponent(Graphics);
        if (!graphics) return;
        const { halfWidth, y, accent } = enemyGroundingStyle(id, size);
        graphics.clear();
        // 先压暗脚下石板，再给一条低亮色标；亮度由入场瞬间短促提高，随后严格归零。
        graphics.fillColor = new Color(6, 15, 24, 110);
        graphics.roundRect(-halfWidth, y - size * 0.045, halfWidth * 2, size * 0.11, size * 0.05);
        graphics.fill();
        graphics.fillColor = new Color(accent[0], accent[1], accent[2], 82);
        graphics.roundRect(-halfWidth * 0.76, y - size * 0.005, halfWidth * 1.52, size * 0.035, size * 0.018);
        graphics.fill();
        if (arrival.hatchGlowOpacity > 0) {
            graphics.strokeColor = new Color(accent[0], accent[1], accent[2], arrival.hatchGlowOpacity);
            graphics.lineWidth = 4;
            graphics.circle(0, y + size * 0.26, size * (0.35 + (128 - arrival.hatchGlowOpacity) / 128 * 0.12));
            graphics.stroke();
        }
    }
}
