import type { UnitVisualPose } from './UnitVisualMotion';

export interface LayeredTowerSpec {
    readonly baseName: string;
    readonly activeName: string;
    readonly canvasScale: number;
    readonly activeScaleX: number;
    readonly activeScaleY: number;
    readonly activeX: number;
    readonly activeY: number;
    readonly activePivotX: number;
    readonly activePivotY: number;
    readonly emitterX: number;
    readonly emitterY: number;
}

export const RIVET_GUN_LAYER_SPEC: LayeredTowerSpec = {
    baseName: 'RivetBase', activeName: 'RivetHead', canvasScale: 1.4,
    activeScaleX: 0.68, activeScaleY: 0.68, activeX: 0.03, activeY: 0.12,
    // 128×128 炮身切图的连接轴约在 (64, 112)，不能绕画布中心旋转。
    activePivotX: 0.5, activePivotY: 0.125,
    // 128画布主枪管开口(42,22)，Y转换为Cocos向上；不是底座中心或透明画布中心。
    emitterX: 42 / 128, emitterY: 106 / 128,
};

export const FROST_COIL_LAYER_SPEC: LayeredTowerSpec = {
    baseName: 'FrostBase', activeName: 'FrostCore', canvasScale: 1.4,
    activeScaleX: 0.65, activeScaleY: 0.65, activeX: 0, activeY: 0.04,
    activePivotX: 0.5, activePivotY: 0.5,
    emitterX: 64 / 128, emitterY: 73 / 128,
};

/** 改旋转轴时反向移动节点，使 0° 的切图仍保持原透明画布配准位置。 */
export function layeredTowerActivePosition(size: number, spec: LayeredTowerSpec, motion: UnitVisualPose | null): { x: number; y: number } {
    const canvasSize = size * spec.canvasScale;
    return {
        x: canvasSize * spec.activeX + (spec.activePivotX - 0.5) * canvasSize * spec.activeScaleX + (motion?.x ?? 0),
        y: canvasSize * spec.activeY + (spec.activePivotY - 0.5) * canvasSize * spec.activeScaleY + (motion?.y ?? 0),
    };
}

/** 发射点和炮身使用同一配准、缩放、旋转与后坐力，不从逻辑塔位猜炮口。 */
export function layeredTowerEmissionPoint(center: {readonly x:number;readonly y:number}, size:number,
    motion:UnitVisualPose|null,spec:LayeredTowerSpec,angleDegrees=0):{x:number;y:number} {
    const position = layeredTowerActivePosition(size,spec,motion);
    const x = (spec.emitterX-spec.activePivotX)*size*spec.canvasScale*spec.activeScaleX*(motion?.scaleX??1);
    const y = (spec.emitterY-spec.activePivotY)*size*spec.canvasScale*spec.activeScaleY*(motion?.scaleY??1);
    const angle = angleDegrees*Math.PI/180;
    return {x:center.x+position.x+x*Math.cos(angle)-y*Math.sin(angle),
        y:center.y+3+position.y+x*Math.sin(angle)+y*Math.cos(angle)};
}
