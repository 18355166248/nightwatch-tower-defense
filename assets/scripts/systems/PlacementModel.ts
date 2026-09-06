import {
    cellKey,
    isInsideGrid,
    sameCell,
    type EnemyRouteState,
    type GridCell,
    type GridDefinition,
    type PlacementRejectReason,
} from '../core/GridTypes';
import { FlowField } from './FlowField';
import { EconomyLedger } from './EconomyLedger';

export interface PlacementPreview {
    readonly cell: GridCell;
    readonly mapVersion: number;
    readonly accepted: boolean;
    readonly reason?: PlacementRejectReason;
    readonly flowField?: FlowField;
    readonly path?: readonly GridCell[];
}

export interface PlacementCommit {
    readonly accepted: boolean;
    readonly reason?: PlacementRejectReason;
    readonly mapVersion: number;
    readonly gold: number;
}

export class PlacementModel {
    private readonly towerCells = new Set<string>();
    private currentMapVersion = 0;
    private readonly economy: EconomyLedger;
    private currentFlowField: FlowField;

    public constructor(
        public readonly grid: GridDefinition,
        initialGold: number | EconomyLedger,
        private readonly towerCost: number,
    ) {
        this.economy = typeof initialGold === 'number' ? new EconomyLedger(initialGold) : initialGold;
        this.currentFlowField = new FlowField(grid, this.towerCells);
    }

    public get mapVersion(): number {
        return this.currentMapVersion;
    }

    public get gold(): number {
        return this.economy.balance;
    }

    public get towers(): ReadonlySet<string> {
        return this.towerCells;
    }

    public get flowField(): FlowField {
        return this.currentFlowField;
    }

    public preview(cell: GridCell, enemies: readonly EnemyRouteState[]): PlacementPreview {
        const staticReason = this.staticRejectReason(cell, enemies);
        if (staticReason) return this.rejected(cell, staticReason);

        const blocked = new Set(this.towerCells);
        blocked.add(cellKey(cell));
        const flowField = new FlowField(this.grid, blocked);
        const path = flowField.pathFrom(this.grid.entry);
        if (!path) return this.rejected(cell, 'would-block-path');

        for (const enemy of enemies) {
            if (!flowField.isReachable(enemy.toCell)) return this.rejected(cell, 'would-block-path');
            if (!sameCell(enemy.toCell, this.grid.exit) && !flowField.nextCell(enemy.toCell, enemy.fromCell)) {
                return this.rejected(cell, 'would-force-backtrack');
            }
        }

        return {
            cell,
            mapVersion: this.currentMapVersion,
            accepted: true,
            flowField,
            path,
        };
    }

    public commit(preview: PlacementPreview, enemies: readonly EnemyRouteState[]): PlacementCommit {
        if (preview.mapVersion !== this.currentMapVersion) return this.commitRejected('stale-preview');
        const fresh = this.preview(preview.cell, enemies);
        if (!fresh.accepted || !fresh.flowField) return this.commitRejected(fresh.reason ?? 'would-block-path');

        // 金币、占格、版本与流场在同一事务中更新，避免快速触摸造成扣费但未建塔。
        if (!this.economy.trySpend(this.towerCost)) return this.commitRejected('insufficient-gold');
        this.towerCells.add(cellKey(preview.cell));
        this.currentMapVersion += 1;
        this.currentFlowField = fresh.flowField;
        return { accepted: true, mapVersion: this.currentMapVersion, gold: this.gold };
    }

    public sell(cell: GridCell, preparing: boolean): boolean {
        const key = cellKey(cell);
        if (!preparing || !this.towerCells.has(key)) return false;
        this.towerCells.delete(key);
        this.economy.credit(this.towerCost);
        this.currentMapVersion += 1;
        this.currentFlowField = new FlowField(this.grid, this.towerCells);
        return true;
    }

    private staticRejectReason(cell: GridCell, enemies: readonly EnemyRouteState[]): PlacementRejectReason | null {
        if (!isInsideGrid(this.grid, cell)) return 'out-of-bounds';
        if (sameCell(cell, this.grid.entry)) return 'entry';
        if (sameCell(cell, this.grid.exit)) return 'exit';
        if (this.towerCells.has(cellKey(cell))) return 'occupied';
        if (!this.economy.canSpend(this.towerCost)) return 'insufficient-gold';
        for (const enemy of enemies) {
            if (sameCell(cell, enemy.fromCell)) return 'enemy-current-cell';
            if (sameCell(cell, enemy.toCell)) return 'enemy-committed-cell';
        }
        return null;
    }

    private rejected(cell: GridCell, reason: PlacementRejectReason): PlacementPreview {
        return { cell, mapVersion: this.currentMapVersion, accepted: false, reason };
    }

    private commitRejected(reason: PlacementRejectReason): PlacementCommit {
        return { accepted: false, reason, mapVersion: this.currentMapVersion, gold: this.gold };
    }
}
