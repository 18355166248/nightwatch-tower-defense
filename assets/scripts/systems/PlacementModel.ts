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
import type { TowerId } from '../config/PhaseBCombatConfig';
import { nextUpgradeCost, towerInvestment, type UpgradeTower } from './TowerLevelRules';

export interface TowerDeployment {
    readonly cell: GridCell;
    readonly towerId: TowerId;
    readonly level?: number;
}

type PlacementTower = UpgradeTower;

export type UpgradeRejectReason = 'not-found' | 'max-level' | 'insufficient-gold';
export interface UpgradeResult {
    readonly accepted: boolean;
    readonly reason?: UpgradeRejectReason;
    readonly level: number;
    readonly gold: number;
}

export interface PlacementPreview {
    readonly cell: GridCell;
    readonly towerId: TowerId;
    readonly cost: number;
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
    private readonly towerIdsByCell = new Map<string, TowerId>();
    private readonly towerLevelsByCell = new Map<string, number>();
    private readonly towersById = new Map<TowerId, PlacementTower>();
    private readonly defaultTowerId: TowerId;
    private currentMapVersion = 0;
    private readonly economy: EconomyLedger;
    private currentFlowField: FlowField;

    public constructor(
        public readonly grid: GridDefinition,
        initialGold: number | EconomyLedger,
        towerSource: number | readonly PlacementTower[],
        defaultTowerId: TowerId = 'rivet-gun',
    ) {
        this.economy = typeof initialGold === 'number' ? new EconomyLedger(initialGold) : initialGold;
        const towers = typeof towerSource === 'number'
            ? [{ id: 'rivet-gun' as const, cost: towerSource }]
            : towerSource;
        for (const tower of towers) this.towersById.set(tower.id, tower);
        if (!this.towersById.has(defaultTowerId)) throw new Error(`默认塔种不存在：${defaultTowerId}`);
        this.defaultTowerId = defaultTowerId;
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

    public get deployments(): readonly TowerDeployment[] {
        return Array.from(this.towerIdsByCell, ([key, towerId]) => ({ cell: this.cellFromKey(key), towerId, level: this.towerLevelsByCell.get(key) ?? 1 }));
    }

    public get placementTowers(): readonly PlacementTower[] {
        return Array.from(this.towersById.values());
    }

    public get flowField(): FlowField {
        return this.currentFlowField;
    }

    public preview(cell: GridCell, enemies: readonly EnemyRouteState[], towerId = this.defaultTowerId): PlacementPreview {
        const tower = this.requireTower(towerId);
        const staticReason = this.staticRejectReason(cell, enemies, tower.cost);
        if (staticReason) return this.rejected(cell, tower, staticReason);

        const blocked = new Set(this.towerCells);
        blocked.add(cellKey(cell));
        const flowField = new FlowField(this.grid, blocked);
        const path = flowField.pathFrom(this.grid.entry);
        if (!path) return this.rejected(cell, tower, 'would-block-path');

        for (const enemy of enemies) {
            if (!flowField.isReachable(enemy.toCell)) return this.rejected(cell, tower, 'would-block-path');
            if (!sameCell(enemy.toCell, this.grid.exit) && !flowField.nextCell(enemy.toCell, enemy.fromCell)) {
                return this.rejected(cell, tower, 'would-force-backtrack');
            }
        }

        return {
            cell,
            towerId: tower.id,
            cost: tower.cost,
            mapVersion: this.currentMapVersion,
            accepted: true,
            flowField,
            path,
        };
    }

    public commit(preview: PlacementPreview, enemies: readonly EnemyRouteState[]): PlacementCommit {
        if (preview.mapVersion !== this.currentMapVersion) return this.commitRejected('stale-preview');
        const fresh = this.preview(preview.cell, enemies, preview.towerId);
        if (!fresh.accepted || !fresh.flowField) return this.commitRejected(fresh.reason ?? 'would-block-path');

        // 金币、占格、版本与流场在同一事务中更新，避免快速触摸造成扣费但未建塔。
        if (!this.economy.trySpend(fresh.cost)) return this.commitRejected('insufficient-gold');
        const key = cellKey(preview.cell);
        this.towerCells.add(key);
        this.towerIdsByCell.set(key, preview.towerId);
        this.towerLevelsByCell.set(key, 1);
        this.currentMapVersion += 1;
        this.currentFlowField = fresh.flowField;
        return { accepted: true, mapVersion: this.currentMapVersion, gold: this.gold };
    }

    public upgrade(cell: GridCell): UpgradeResult {
        const key = cellKey(cell);
        const towerId = this.towerIdsByCell.get(key);
        if (!towerId) return { accepted: false, reason: 'not-found', level: 0, gold: this.gold };
        const level = this.towerLevelsByCell.get(key) ?? 1;
        const cost = nextUpgradeCost(this.requireTower(towerId), level);
        if (cost === null) return { accepted: false, reason: 'max-level', level, gold: this.gold };
        // 扣费成功后才推进等级；升级不改变占格/流场，不使玩家正在预览的路径失效。
        if (!this.economy.trySpend(cost)) return { accepted: false, reason: 'insufficient-gold', level, gold: this.gold };
        this.towerLevelsByCell.set(key, level + 1);
        return { accepted: true, level: level + 1, gold: this.gold };
    }

    public sell(cell: GridCell, preparing: boolean): boolean {
        const key = cellKey(cell);
        if (!preparing || !this.towerCells.has(key)) return false;
        const towerId = this.towerIdsByCell.get(key);
        if (!towerId) throw new Error(`塔位缺少塔种：${key}`);
        this.towerCells.delete(key);
        this.towerIdsByCell.delete(key);
        const tower = this.requireTower(towerId);
        const level = this.towerLevelsByCell.get(key) ?? 1;
        this.towerLevelsByCell.delete(key);
        this.economy.credit(towerInvestment(tower, level));
        this.currentMapVersion += 1;
        this.currentFlowField = new FlowField(this.grid, this.towerCells);
        return true;
    }

    private staticRejectReason(cell: GridCell, enemies: readonly EnemyRouteState[], cost: number): PlacementRejectReason | null {
        if (!isInsideGrid(this.grid, cell)) return 'out-of-bounds';
        if (sameCell(cell, this.grid.entry)) return 'entry';
        if (sameCell(cell, this.grid.exit)) return 'exit';
        if (this.towerCells.has(cellKey(cell))) return 'occupied';
        if (!this.economy.canSpend(cost)) return 'insufficient-gold';
        for (const enemy of enemies) {
            if (sameCell(cell, enemy.fromCell)) return 'enemy-current-cell';
            if (sameCell(cell, enemy.toCell)) return 'enemy-committed-cell';
        }
        return null;
    }

    private rejected(cell: GridCell, tower: PlacementTower, reason: PlacementRejectReason): PlacementPreview {
        return { cell, towerId: tower.id, cost: tower.cost, mapVersion: this.currentMapVersion, accepted: false, reason };
    }

    private commitRejected(reason: PlacementRejectReason): PlacementCommit {
        return { accepted: false, reason, mapVersion: this.currentMapVersion, gold: this.gold };
    }

    private requireTower(towerId: TowerId): PlacementTower {
        const tower = this.towersById.get(towerId);
        if (!tower) throw new Error(`未知塔种：${towerId}`);
        return tower;
    }

    private cellFromKey(key: string): GridCell {
        const [column, row] = key.split(',').map(Number);
        if (!Number.isInteger(column) || !Number.isInteger(row)) throw new Error(`非法塔坐标：${key}`);
        return { column, row };
    }
}
