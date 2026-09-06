import { cellKey, isInsideGrid, sameCell, type GridCell, type GridDefinition } from '../core/GridTypes';

const UNREACHABLE = -1;

const DIRECTIONS: readonly GridCell[] = [
    { column: 0, row: 1 },
    { column: 1, row: 0 },
    { column: -1, row: 0 },
    { column: 0, row: -1 },
];

export class FlowField {
    private readonly distances: Int32Array;

    public constructor(
        public readonly grid: GridDefinition,
        public readonly blocked: ReadonlySet<string>,
    ) {
        this.distances = this.buildDistances();
    }

    public distanceAt(cell: GridCell): number {
        if (!isInsideGrid(this.grid, cell)) return UNREACHABLE;
        return this.distances[this.indexOf(cell)] ?? UNREACHABLE;
    }

    public isReachable(cell: GridCell): boolean {
        return this.distanceAt(cell) >= 0;
    }

    public nextCell(cell: GridCell, forbiddenBacktrack?: GridCell): GridCell | null {
        const distance = this.distanceAt(cell);
        if (distance <= 0) return null;

        if (forbiddenBacktrack) {
            // 敌人抵达新格后先沿原朝向继续，只有前方不再属于最短路时才走固定方向序，避免等长路径抖动。
            const forward = {
                column: cell.column + cell.column - forbiddenBacktrack.column,
                row: cell.row + cell.row - forbiddenBacktrack.row,
            };
            if (this.distanceAt(forward) === distance - 1) return forward;
        }

        for (const direction of DIRECTIONS) {
            const candidate = {
                column: cell.column + direction.column,
                row: cell.row + direction.row,
            };
            if (forbiddenBacktrack && sameCell(candidate, forbiddenBacktrack)) continue;
            if (this.distanceAt(candidate) === distance - 1) return candidate;
        }
        return null;
    }

    public pathFrom(start: GridCell, forbiddenFirstCell?: GridCell): readonly GridCell[] | null {
        if (!this.isReachable(start)) return null;
        const path: GridCell[] = [start];
        let current = start;
        let forbidden = forbiddenFirstCell;
        const limit = this.grid.columns * this.grid.rows + 1;

        while (!sameCell(current, this.grid.exit) && path.length <= limit) {
            const next = this.nextCell(current, forbidden);
            if (!next) return null;
            path.push(next);
            forbidden = undefined;
            current = next;
        }
        return sameCell(current, this.grid.exit) ? path : null;
    }

    private buildDistances(): Int32Array {
        const distances = new Int32Array(this.grid.columns * this.grid.rows);
        distances.fill(UNREACHABLE);
        if (this.blocked.has(cellKey(this.grid.exit))) return distances;

        const queue: GridCell[] = [this.grid.exit];
        distances[this.indexOf(this.grid.exit)] = 0;
        for (let cursor = 0; cursor < queue.length; cursor += 1) {
            const current = queue[cursor];
            const nextDistance = distances[this.indexOf(current)] + 1;
            for (const direction of DIRECTIONS) {
                const neighbor = {
                    column: current.column + direction.column,
                    row: current.row + direction.row,
                };
                if (!isInsideGrid(this.grid, neighbor) || this.blocked.has(cellKey(neighbor))) continue;
                const index = this.indexOf(neighbor);
                if (distances[index] !== UNREACHABLE) continue;
                distances[index] = nextDistance;
                queue.push(neighbor);
            }
        }
        return distances;
    }

    private indexOf(cell: GridCell): number {
        return cell.row * this.grid.columns + cell.column;
    }
}
