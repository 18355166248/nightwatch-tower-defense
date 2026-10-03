import { FROST_COIL_LAYER_SPEC, type LayeredTowerSpec } from './LayeredTowerGeometry';
import type { UnitVisualPose } from './UnitVisualMotion';

export interface TowerLayerPair<T> { readonly base: T; readonly active: T }
export const FROST_UPGRADE_PATHS = {
    2: { base: 'level-one/units/frost-coil-level-2-structure-v1/spriteFrame', active: 'level-one/units/frost-coil-level-2-energy-v1/spriteFrame' },
    3: { base: 'level-one/units/frost-coil-level-3-structure-v1/spriteFrame', active: 'level-one/units/frost-coil-level-3-energy-v1/spriteFrame' },
} as const;
export type FrostUpgradeLevel = keyof typeof FROST_UPGRADE_PATHS;

function registeredSpec(sourceY: number): LayeredTowerSpec {
    // 两层保留同一128画布；能量质心兼作轴点与发射点，小幅脉冲不会让弹道源随缩放漂移。
    const pivotY = 1 - sourceY / 128;
    return { ...FROST_COIL_LAYER_SPEC, activeScaleX: 1, activeScaleY: 1, activeX: 0, activeY: 0,
        activePivotX: .5, activePivotY: pivotY, emitterX: .5, emitterY: pivotY };
}
export const FROST_UPGRADE_SPECS: Readonly<Record<FrostUpgradeLevel, LayeredTowerSpec>> = {
    2: registeredSpec(70), 3: registeredSpec(53),
};

/** 整组切换，缺任一层就沿用旧塔；禁止新结构套旧能量芯，造成升级错位。 */
export function selectFrostArt<T>(level: number, upgrade: TowerLayerPair<T> | null, legacy: TowerLayerPair<T>) {
    const upgraded = (level === 2 || level === 3) && upgrade !== null;
    return { pair: upgraded && upgrade ? upgrade : legacy, resolvedLevel: upgraded ? level : 1,
        spec: upgraded ? FROST_UPGRADE_SPECS[level as FrostUpgradeLevel] : FROST_COIL_LAYER_SPEC };
}

export function frostUpgradePulse(remaining: number, duration: number): { pose: UnitVisualPose; opacity: number } {
    const life = duration > 0 ? Math.max(0, Math.min(1, remaining / duration)) : 0;
    // 静态结构已有冰芯，不再整体放大升级；同像素能量覆盖只在攻击时短促增强，避免铜边双影。
    const pulse = life * life;
    return { pose: { x: 0, y: 0, angle: 0, scaleX: 1 + .02 * pulse, scaleY: 1 + .02 * pulse }, opacity: Math.round(150 * pulse) };
}
