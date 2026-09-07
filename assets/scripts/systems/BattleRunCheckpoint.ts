import type { GridDefinition } from '../core/GridTypes';
import { EconomyLedger } from './EconomyLedger';
import { PlacementModel, type TowerDeployment } from './PlacementModel';
import type { TowerArchetype } from '../config/PhaseBCombatConfig';

export interface RestoredPlacement {
    readonly economy: EconomyLedger;
    readonly model: PlacementModel;
}

/** 保存开战瞬间的部署，使结算后的“重新部署”不依赖当前战斗残留。 */
export class BattleRunCheckpoint {
    private constructor(
        private readonly grid: GridDefinition,
        private readonly deployments: readonly TowerDeployment[],
        private readonly remainingGold: number,
        private readonly towers: readonly Pick<TowerArchetype, 'id' | 'cost'>[],
    ) {}

    public static capture(model: PlacementModel, _legacyTowerCost?: number): BattleRunCheckpoint {
        return new BattleRunCheckpoint(model.grid, model.deployments, model.gold, model.placementTowers);
    }

    public restore(): RestoredPlacement {
        const investedGold = this.deployments.reduce((sum, deployment) => {
            const tower = this.towers.find(({ id }) => id === deployment.towerId);
            if (!tower) throw new Error(`检查点缺少塔种配置：${deployment.towerId}`);
            return sum + tower.cost;
        }, 0);
        const economy = new EconomyLedger(this.remainingGold + investedGold);
        const model = new PlacementModel(this.grid, economy, this.towers);
        for (const deployment of this.deployments) {
            const result = model.commit(model.preview(deployment.cell, [], deployment.towerId), []);
            if (!result.accepted) throw new Error(`无法恢复塔坐标 (${deployment.cell.column},${deployment.cell.row})：${result.reason}`);
        }
        return { economy, model };
    }
}
