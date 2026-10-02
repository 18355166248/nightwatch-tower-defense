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
}

export const RIVET_GUN_LAYER_SPEC: LayeredTowerSpec = {
    baseName: 'RivetBase', activeName: 'RivetHead', canvasScale: 1.4,
    activeScaleX: 0.68, activeScaleY: 0.68, activeX: 0.03, activeY: 0.12,
    // 128×128 炮身切图的连接轴约在 (64, 112)，不能绕画布中心旋转。
    activePivotX: 0.5, activePivotY: 0.125,
};

export const FROST_COIL_LAYER_SPEC: LayeredTowerSpec = {
    baseName: 'FrostBase', activeName: 'FrostCore', canvasScale: 1.4,
    activeScaleX: 0.65, activeScaleY: 0.65, activeX: 0, activeY: 0.04,
    activePivotX: 0.5, activePivotY: 0.5,
};

/** 改旋转轴时反向移动节点，使 0° 的切图仍保持原透明画布配准位置。 */
export function layeredTowerActivePosition(size: number, spec: LayeredTowerSpec, motion: UnitVisualPose | null): { x: number; y: number } {
    const canvasSize = size * spec.canvasScale;
    return {
        x: canvasSize * spec.activeX + (spec.activePivotX - 0.5) * canvasSize * spec.activeScaleX + (motion?.x ?? 0),
        y: canvasSize * spec.activeY + (spec.activePivotY - 0.5) * canvasSize * spec.activeScaleY + (motion?.y ?? 0),
    };
}
