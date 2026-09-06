import { sameCell, type GridCell } from '../core/GridTypes';
import { FlowField } from './FlowField';

export interface RouteSimulationResult {
    readonly reachedExit: boolean;
    readonly pathLength: number;
    readonly travelTimeSeconds: number;
}

export function simulateNoDamageRoute(flowField: FlowField, speedCellsPerSecond: number): RouteSimulationResult {
    if (!Number.isFinite(speedCellsPerSecond) || speedCellsPerSecond <= 0) {
        throw new RangeError('speedCellsPerSecond 必须为正有限数');
    }
    const path = flowField.pathFrom(flowField.grid.entry);
    const pathLength = path ? path.length - 1 : -1;
    return {
        reachedExit: Boolean(path && sameCell(path[path.length - 1], flowField.grid.exit)),
        pathLength,
        travelTimeSeconds: pathLength < 0 ? Number.POSITIVE_INFINITY : pathLength / speedCellsPerSecond,
    };
}

export function cellsFromKeys(keys: readonly string[]): GridCell[] {
    return keys.map((key) => {
        const [column, row] = key.split(',').map(Number);
        if (!Number.isInteger(column) || !Number.isInteger(row)) throw new Error(`非法格子坐标：${key}`);
        return { column, row };
    });
}
