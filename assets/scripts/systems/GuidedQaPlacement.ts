import { FIRST_LEVEL_GUIDED_UPGRADES, FIRST_LEVEL_OPENING, FIRST_LEVEL_REINFORCEMENTS } from '../config/FirstLevelOpening';
import type { TowerId } from '../config/PhaseBCombatConfig';
import { cellKey, sameCell, type GridCell } from '../core/GridTypes';
import type { PlacementModel } from './PlacementModel';

export interface GuidedQaPurchaseResult {
    readonly placed: number;
    readonly upgraded: number;
    readonly gold: number;
    readonly pathLength: number;
}

/** QA 浏览器夹具复用教学配置和真实事务；重复按键不会重复扣费。 */
export function applyGuidedQaOpening(model: PlacementModel): GuidedQaPurchaseResult {
    let placed = 0;
    for (const { cell, towerId } of FIRST_LEVEL_OPENING) placed += placeOnce(model, cell, towerId);
    return result(model, placed, 0);
}

/** 仅供清场后的 QA 快捷操作，教学玩家仍需亲手建塔和升级。 */
export function applyGuidedQaPurchases(model: PlacementModel, afterWave: number): GuidedQaPurchaseResult {
    let placed = 0;
    let upgraded = 0;
    for (const planned of FIRST_LEVEL_GUIDED_UPGRADES.filter(({ wave }) => wave === afterWave)) {
        const deployment = model.deployments.find(({ cell }) => sameCell(cell, planned.cell));
        if (!deployment || deployment.towerId !== planned.towerId) throw new Error(`QA 升级塔位不符：${cellKey(planned.cell)}`);
        let level = deployment.level ?? 1;
        if (level > planned.targetLevel) throw new Error(`QA 升级等级已超出计划：${cellKey(planned.cell)}`);
        while (level < planned.targetLevel) {
            const upgrade = model.upgrade(planned.cell);
            if (!upgrade.accepted) throw new Error(`QA 升级失败 ${cellKey(planned.cell)}：${upgrade.reason}`);
            level = upgrade.level;
            upgraded += 1;
        }
    }
    for (const { cell, towerId } of FIRST_LEVEL_REINFORCEMENTS.filter(({ afterWave: wave }) => wave === afterWave)) {
        placed += placeOnce(model, cell, towerId);
    }
    return result(model, placed, upgraded);
}

function placeOnce(model: PlacementModel, cell: GridCell, towerId: TowerId): number {
    const existing = model.deployments.find(({ cell: deployedCell }) => sameCell(deployedCell, cell));
    if (existing) {
        if (existing.towerId !== towerId) throw new Error(`QA 塔种不符：${cellKey(cell)}`);
        return 0;
    }
    const preview = model.preview(cell, [], towerId);
    if (!preview.accepted) throw new Error(`QA 预览失败 ${cellKey(cell)}：${preview.reason}`);
    const commit = model.commit(preview, []);
    if (!commit.accepted) throw new Error(`QA 建塔失败 ${cellKey(cell)}：${commit.reason}`);
    return 1;
}

function result(model: PlacementModel, placed: number, upgraded: number): GuidedQaPurchaseResult {
    return { placed, upgraded, gold: model.gold, pathLength: model.flowField.distanceAt(model.grid.entry) };
}
