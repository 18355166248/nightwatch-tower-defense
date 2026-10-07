import type { GridDefinition } from '../core/GridTypes';
import { EconomyLedger } from './EconomyLedger';
import { PlacementModel, type TowerDeployment } from './PlacementModel';
import { towerInvestment, type UpgradeTower } from './TowerLevelRules';

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
        private readonly towers: readonly UpgradeTower[],
    ) {}

    public static capture(model: PlacementModel, _legacyTowerCost?: number): BattleRunCheckpoint {
        return new BattleRunCheckpoint(model.grid, model.deployments, model.gold, model.placementTowers);
    }

    public restore(): RestoredPlacement {
        const investedGold = this.deployments.reduce((sum, deployment) => {
            const tower = this.towers.find(({ id }) => id === deployment.towerId);
            if (!tower) throw new Error(`检查点缺少塔种配置：${deployment.towerId}`);
            return sum + towerInvestment(tower, deployment.level ?? 1);
        }, 0);
        const economy = new EconomyLedger(this.remainingGold + investedGold);
        // 阵容可以只携带电弧等新塔；恢复目录以本局首塔为默认，不能强制要求机枪。
        const model = new PlacementModel(this.grid, economy, this.towers, this.towers[0].id);
        for (const deployment of this.deployments) {
            const result = model.commit(model.preview(deployment.cell, [], deployment.towerId), []);
            if (!result.accepted) throw new Error(`无法恢复塔坐标 (${deployment.cell.column},${deployment.cell.row})：${result.reason}`);
            for (let level = 1; level < (deployment.level ?? 1); level += 1) {
                if (!model.upgrade(deployment.cell).accepted) {
                    throw new Error(`无法恢复塔等级 (${deployment.cell.column},${deployment.cell.row})`);
                }
            }
        }
        return { economy, model };
    }
}
