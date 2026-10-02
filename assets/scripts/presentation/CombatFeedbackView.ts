import { Color, Graphics } from 'cc';
import type { GridDefinition } from '../core/GridTypes';
import type { PhaseBSceneState } from './PhaseBSceneState';
import { PhaseBLayout, type PhaseBPoint } from './PhaseBLayout';
import { enemyDeathPose } from './UnitVisualMotion';
import { rivetTrailPose } from './ShotTraceGeometry';
import type { CombatVisualAnchors } from './CombatVisualAnchors';
import { FeedbackVisualOrigins } from './FeedbackVisualOrigins';

/** 战斗事件的程序特效层；只绘制短生命周期快照，不持有伤害、索敌或额外动画时钟。 */
export class CombatFeedbackView {
    private readonly rewardOrigins = new FeedbackVisualOrigins();
    public rewardAlignmentSamples: {enemyId: string; origin: PhaseBPoint; logicalOrigin: PhaseBPoint}[] = [];
    public alignmentSamples: {targetId:string;barrel:0|1;origin:PhaseBPoint;target:PhaseBPoint;logicalTarget:PhaseBPoint}[] = [];
    public constructor(private readonly graphics: Graphics, private readonly layout: PhaseBLayout) {}

    public drawBehindUnits(state: PhaseBSceneState, cellSize: number, anchors?: CombatVisualAnchors): void {
        this.drawSlowPulses(state, cellSize);
        this.drawDeaths(state, cellSize, anchors);
        this.drawCoreHits(state, cellSize);
    }

    public drawAboveUnits(state: PhaseBSceneState, cellSize: number, anchors?: CombatVisualAnchors): void {
        this.alignmentSamples = [];
        this.rewardAlignmentSamples = [];
        // 减弱动态时去掉位移弹迹，但保留命中反馈与金币信息。
        if (!state.reducedMotion) this.drawShots(state, cellSize, anchors);
        this.drawImpacts(state, cellSize, anchors);
        this.drawRewards(state, cellSize, anchors);
    }

    private drawShots(state: PhaseBSceneState, cellSize: number, anchors?: CombatVisualAnchors): void {
        const graphics = this.graphics;
        for (const tracer of state.feedback.tracers) {
            const origin = anchors?.resolveEmitter(`${tracer.origin.column},${tracer.origin.row}`,this.center(tracer.origin,state.grid),tracer.barrel)
                ?? this.center(tracer.origin,state.grid);
            const logicalTarget = this.center(tracer.point,state.grid);
            const target = anchors?.resolveTarget(tracer.targetId,logicalTarget) ?? logicalTarget;
            // 同一目标ID连接当前身体/短尸影，不把分流中的敌人误连到旧格点；样本来自实际绘制端点。
            if(this.alignmentSamples.length<6)this.alignmentSamples.push({targetId:tracer.targetId,barrel:tracer.barrel,origin,target,logicalTarget});
            const life = tracer.remainingSeconds / tracer.durationSeconds;
            const frost = tracer.towerId === 'frost-coil';
            if (frost) {
                // 冷凝是持续短束，保持塔到目标的连接感；机枪则只画局部移动弹迹以免密集战斗铺满光线。
                graphics.strokeColor = new Color(80, 209, 234, Math.round(65 * life));
                graphics.lineWidth = 10;
                graphics.moveTo(origin.x, origin.y);
                graphics.lineTo(target.x, target.y);
                graphics.stroke();
                graphics.strokeColor = new Color(191, 248, 255, Math.round(235 * life));
                graphics.lineWidth = 3;
                graphics.moveTo(origin.x, origin.y);
                graphics.lineTo(target.x, target.y);
                graphics.stroke();
            } else {
                const trail = rivetTrailPose(origin, target, life, cellSize);
                graphics.strokeColor = new Color(255, 176, 73, Math.round(trail.opacity * 0.38));
                graphics.lineWidth = tracer.lethal ? 12 : 9;
                graphics.moveTo(trail.tail.x, trail.tail.y);
                graphics.lineTo(trail.head.x, trail.head.y);
                graphics.stroke();
                graphics.strokeColor = new Color(255, 235, 163, trail.opacity);
                graphics.lineWidth = tracer.lethal ? 5 : 3;
                graphics.moveTo(trail.tail.x, trail.tail.y);
                graphics.lineTo(trail.head.x, trail.head.y);
                graphics.stroke();
                graphics.fillColor = new Color(255, 244, 192, trail.opacity);
                graphics.circle(trail.head.x, trail.head.y, trail.headRadius);
                graphics.fill();
            }
            // 机枪枪口和冷凝能量芯各有一层短促亮点；它们随弹道衰减，不生成额外状态。
            graphics.fillColor = frost
                ? new Color(80, 214, 240, Math.round(75 * life))
                : new Color(255, 169, 67, Math.round(90 * life));
            graphics.circle(origin.x, origin.y, cellSize * (0.18 + 0.12 * life));
            graphics.fill();
            graphics.fillColor = frost
                ? new Color(190, 248, 255, Math.round(230 * life))
                : new Color(255, 239, 169, Math.round(230 * life));
            graphics.circle(origin.x, origin.y, cellSize * (0.08 + 0.07 * life));
            graphics.fill();
        }
    }

    private drawSlowPulses(state: PhaseBSceneState, cellSize: number): void {
        const graphics = this.graphics;
        for (const pulse of state.feedback.slowPulses) {
            const point = this.center(pulse.point, state.grid);
            const progress = 1 - pulse.remainingSeconds / pulse.durationSeconds;
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const radius = cellSize * pulse.radiusCells * (0.58 + 0.42 * easeOut);
            const life = 1 - progress;
            // 范围波纹只在真实减速事件产生，并比弹道多留一段可读时间。
            graphics.fillColor = new Color(89, 208, 231, Math.round(25 * life));
            graphics.circle(point.x, point.y, radius);
            graphics.fill();
            graphics.strokeColor = new Color(131, 242, 255,
                Math.round((pulse.affectedEnemyCount > 1 ? 205 : 130) * life));
            graphics.lineWidth = pulse.affectedEnemyCount > 1 ? 8 : 6;
            graphics.circle(point.x, point.y, radius);
            graphics.stroke();
        }
    }

    private drawImpacts(state: PhaseBSceneState, cellSize: number, anchors?: CombatVisualAnchors): void {
        const graphics = this.graphics;
        for (const impact of state.feedback.impacts) {
            const point = anchors?.resolveTarget(impact.targetId,this.center(impact.point,state.grid)) ?? this.center(impact.point,state.grid);
            const origin = anchors?.resolveEmitter(`${impact.origin.column},${impact.origin.row}`,this.center(impact.origin,state.grid),impact.barrel)
                ?? this.center(impact.origin,state.grid);
            const progress = 1 - impact.remainingSeconds / impact.durationSeconds;
            const life = 1 - progress;
            const frost = impact.towerId === 'frost-coil';
            graphics.fillColor = frost
                ? new Color(184, 246, 255, Math.round(85 * life))
                : new Color(255, 201, 105, Math.round(95 * life));
            graphics.circle(point.x, point.y, cellSize * (0.18 + progress * 0.12));
            graphics.fill();
            graphics.strokeColor = frost
                ? new Color(153, 237, 255, Math.round(205 * life))
                : new Color(255, 231, 170, Math.round(225 * life));
            graphics.lineWidth = frost ? 4 : impact.lethal ? 5 : 3;
            graphics.circle(point.x, point.y, cellSize * (0.1 + progress * 0.2));
            graphics.stroke();

            // 普通连射只给两道前向短火花；低频致命命中和冷凝各自增加辨识形状。
            const direction = Math.atan2(point.y - origin.y, point.x - origin.x);
            const angles = frost ? [-Math.PI / 2, 0, Math.PI / 2, Math.PI]
                : impact.lethal ? [-0.8, -0.38, 0, 0.38, 0.8] : [-0.4, 0.4];
            for (const offset of angles) {
                const angle = frost ? offset : direction + offset;
                const inner = cellSize * (0.13 + progress * 0.08);
                const outer = cellSize * (frost ? 0.33 : impact.lethal ? 0.43 : 0.31) * (1 + progress * 0.5);
                graphics.moveTo(point.x + Math.cos(angle) * inner, point.y + Math.sin(angle) * inner);
                graphics.lineTo(point.x + Math.cos(angle) * outer, point.y + Math.sin(angle) * outer);
            }
            graphics.stroke();
        }
    }

    private drawDeaths(state: PhaseBSceneState, cellSize: number, anchors?: CombatVisualAnchors): void {
        const graphics = this.graphics;
        for (const death of state.feedback.deaths) {
            const logicalPoint = this.center(death.point, state.grid);
            const point = anchors?.resolveTarget(death.enemyId, logicalPoint) ?? logicalPoint;
            const pose = enemyDeathPose(death.archetypeId, death.remainingSeconds, death.durationSeconds, death.spawnOrder);
            const heavy = death.archetypeId === 'iron-canister-hauler';
            const runner = death.archetypeId === 'clockwork-runner';
            const accent = heavy ? [255, 198, 104] : runner ? [125, 226, 244] : [240, 143, 113];
            graphics.strokeColor = new Color(accent[0], accent[1], accent[2], pose.ringOpacity);
            graphics.lineWidth = heavy ? 9 : runner ? 5 : 3;
            graphics.circle(point.x, point.y, cellSize * pose.ringRadiusCells);
            graphics.stroke();
            // 普通击杀只留弱环，放射火花优先留给低频重装，避免后段弹幕遮路。
            for (let ray = 0; ray < pose.rays; ray += 1) {
                const angle = ray * Math.PI * 2 / pose.rays;
                const inner = cellSize * pose.ringRadiusCells * 0.75;
                const outer = cellSize * pose.ringRadiusCells * 1.35;
                graphics.moveTo(point.x + Math.cos(angle) * inner, point.y + Math.sin(angle) * inner);
                graphics.lineTo(point.x + Math.cos(angle) * outer, point.y + Math.sin(angle) * outer);
            }
            if (pose.rays > 0) graphics.stroke();
        }
    }

    private drawRewards(state: PhaseBSceneState, cellSize: number, anchors?: CombatVisualAnchors): void {
        const graphics = this.graphics;
        this.rewardOrigins.retain(new Set(state.feedback.rewards.map(reward => reward.enemyId)));
        for (const reward of state.feedback.rewards) {
            const logicalPoint = this.center(reward.point, state.grid);
            // 金币从实际击杀身体处升起；尸影寿命可能短于金币，后续帧必须沿用首次点。
            const point = this.rewardOrigins.resolve(reward.enemyId,
                anchors?.resolveTarget(reward.enemyId, logicalPoint) ?? logicalPoint);
            if (this.rewardAlignmentSamples.length < 6) {
                this.rewardAlignmentSamples.push({ enemyId: reward.enemyId, origin: point, logicalOrigin: logicalPoint });
            }
            const progress = 1 - reward.remainingSeconds / reward.durationSeconds;
            const y = point.y + cellSize * (0.35 + progress * 0.55);
            const alpha = Math.round(255 * Math.min(1, reward.remainingSeconds / 0.2));
            graphics.fillColor = new Color(244, 198, 82, alpha);
            for (let coin = 0; coin < Math.min(4, reward.amount); coin += 1) {
                graphics.circle(point.x + (coin - 1.5) * cellSize * 0.11, y, cellSize * 0.055);
                graphics.fill();
            }
        }
    }

    private drawCoreHits(state: PhaseBSceneState, cellSize: number): void {
        const graphics = this.graphics;
        for (const coreHit of state.feedback.coreHits) {
            const exit = this.center(state.grid.exit, state.grid);
            const progress = 1 - coreHit.remainingSeconds / coreHit.durationSeconds;
            graphics.strokeColor = new Color(255, 82, 82, Math.round(245 * (1 - progress)));
            graphics.lineWidth = 12;
            graphics.circle(exit.x, exit.y, cellSize * (0.35 + progress * 0.45));
            graphics.stroke();
        }
    }

    private center(point: { readonly column: number; readonly row: number }, grid: GridDefinition): PhaseBPoint {
        return this.layout.gridPointCenter(point, grid);
    }
}
