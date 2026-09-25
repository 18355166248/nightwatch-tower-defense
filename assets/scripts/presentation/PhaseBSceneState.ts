import type { TowerId } from '../config/PhaseBCombatConfig';
import type { GridCell, GridDefinition, GridId } from '../core/GridTypes';
import type { BattleResultViewModel } from './BattleResultViewModel';
import type { CombatFeedbackSnapshot } from './CombatFeedbackRuntime';
import type { RouteChangeSnapshot } from './RouteChangeFeedback';

/** 各表现层共享只读快照，渲染实现不反向持有战斗或经济对象。 */
export interface PhaseBSceneState {
    readonly qaMode: boolean;
    readonly useUnitSprites: boolean;
    readonly selectedGridId: GridId;
    readonly grid: GridDefinition;
    readonly towers: ReadonlySet<string>;
    readonly towerIdsByCell: ReadonlyMap<string, TowerId>;
    readonly activePath: readonly GridCell[] | null;
    readonly preview: { readonly accepted: boolean; readonly cell: GridCell; readonly towerId: TowerId } | null;
    readonly inspectedTower: { readonly cell: GridCell; readonly towerId: TowerId } | null;
    readonly enemies: readonly {
        readonly id: string;
        readonly spawnOrder: number;
        readonly health: number;
        readonly archetype: { readonly id: 'clockwork-infantry' | 'clockwork-runner'; readonly maxHealth: number };
        readonly fromCell: GridCell;
        readonly toCell: GridCell;
        readonly progress: number;
        readonly slowRemainingSeconds: number;
    }[];
    readonly feedback: CombatFeedbackSnapshot;
    readonly routeChange: RouteChangeSnapshot | null;
    readonly gold: number;
    readonly coreHealth: number;
    readonly maxCoreHealth: number;
    readonly speedMultiplier: number;
    readonly soundEnabled: boolean;
    readonly selectedTowerId: TowerId;
    readonly canStartNextWaveEarly: boolean;
    readonly showPlayControl: boolean;
    readonly result: BattleResultViewModel | null;
}
