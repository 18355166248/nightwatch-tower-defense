import type { GridCell } from '../core/GridTypes';

export interface RoadSeam {
    readonly cell: GridCell;
    /** 接缝横跨行进方向，避开拐角和箭头，保持路面细节安静。 */
    readonly axis: 'horizontal' | 'vertical';
}

export interface RoadSurfaceFeatures {
    readonly corners: readonly GridCell[];
    readonly seams: readonly RoadSeam[];
}

/** 只从已有的正交路径挑转弯和直路板缝，不修改路径、不补造连接。 */
export function roadSurfaceFeatures(path: readonly GridCell[]): RoadSurfaceFeatures {
    const corners: GridCell[] = [];
    const seams: RoadSeam[] = [];
    for (let index = 1; index < path.length - 1; index += 1) {
        const before = path[index - 1];
        const cell = path[index];
        const after = path[index + 1];
        const dxIn = cell.column - before.column;
        const dyIn = cell.row - before.row;
        const dxOut = after.column - cell.column;
        const dyOut = after.row - cell.row;
        if (Math.abs(dxIn) + Math.abs(dyIn) !== 1 || Math.abs(dxOut) + Math.abs(dyOut) !== 1) continue;
        if (dxIn !== dxOut || dyIn !== dyOut) {
            corners.push(cell);
        } else if (index % 2 === 1) {
            seams.push({ cell, axis: dxIn === 0 ? 'horizontal' : 'vertical' });
        }
    }
    return { corners, seams };
}
