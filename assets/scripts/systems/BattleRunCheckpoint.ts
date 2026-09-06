import type { GridCell, GridDefinition } from '../core/GridTypes';
import { EconomyLedger } from './EconomyLedger';
import { PlacementModel } from './PlacementModel';

export interface RestoredPlacement {
    readonly economy: EconomyLedger;
    readonly model: PlacementModel;
}

/** 保存开战瞬间的部署，使结算后的“重新部署”不依赖当前战斗残留。 */
export class BattleRunCheckpoint {
    private constructor(
        private readonly grid: GridDefinition,
        private readonly cells: readonly GridCell[],
        private readonly remainingGold: number,
        private readonly towerCost: number,
    ) {}

    public static capture(model: PlacementModel, towerCost: number): BattleRunCheckpoint {
        // Cocos 的 loose Babel 构建不会正确降级 Set 展开，显式转数组保证 Web 发布包与测试环境一致。
        const cells = Array.from(model.towers).map((key) => {
            const [column, row] = key.split(',').map(Number);
            if (!Number.isInteger(column) || !Number.isInteger(row)) throw new Error(`非法塔坐标：${key}`);
            return { column, row };
        });
        return new BattleRunCheckpoint(model.grid, cells, model.gold, towerCost);
    }

    public restore(): RestoredPlacement {
        const economy = new EconomyLedger(this.remainingGold + this.cells.length * this.towerCost);
        const model = new PlacementModel(this.grid, economy, this.towerCost);
        for (const cell of this.cells) {
            const result = model.commit(model.preview(cell, []), []);
            if (!result.accepted) throw new Error(`无法恢复塔坐标 (${cell.column},${cell.row})：${result.reason}`);
        }
        return { economy, model };
    }
}
