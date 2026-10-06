export interface GridCell {
    readonly column: number;
    readonly row: number;
}

export type GridId = 'grid-9x13' | 'grid-10x14' | 'grid-8x13' | 'grid-6x13';

export interface GridDefinition {
    readonly id: GridId;
    readonly columns: number;
    readonly rows: number;
    readonly entry: GridCell;
    readonly exit: GridCell;
}

export interface EnemyRouteState {
    readonly id: string;
    readonly fromCell: GridCell;
    readonly toCell: GridCell;
    readonly progress: number;
}

export type PlacementRejectReason =
    | 'out-of-bounds'
    | 'entry'
    | 'exit'
    | 'occupied'
    | 'enemy-current-cell'
    | 'enemy-committed-cell'
    | 'would-block-path'
    | 'would-force-backtrack'
    | 'insufficient-gold'
    | 'stale-preview';

export function cellKey(cell: GridCell): string {
    return `${cell.column},${cell.row}`;
}

export function sameCell(left: GridCell, right: GridCell): boolean {
    return left.column === right.column && left.row === right.row;
}

export function isInsideGrid(grid: GridDefinition, cell: GridCell): boolean {
    return cell.column >= 0 && cell.column < grid.columns && cell.row >= 0 && cell.row < grid.rows;
}
