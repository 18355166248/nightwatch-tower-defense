import type { EnemyId, TowerId } from '../config/PhaseBCombatConfig';
import type { GridCell, GridDefinition, GridId } from '../core/GridTypes';
import type { BattleResultViewModel } from './BattleResultViewModel';
import type { CombatFeedbackSnapshot } from './CombatFeedbackRuntime';
import type { RouteChangeSnapshot } from './RouteChangeFeedback';
import type { WaveStartButtonViewModel } from './PhaseBHudText';

/** 各表现层共享只读快照，渲染实现不反向持有战斗或经济对象。 */
export interface PhaseBSceneState {
    readonly qaMode: boolean;
    readonly useUnitSprites: boolean;
    readonly missingUnitArt?: ReadonlySet<EnemyId | TowerId>;
    readonly selectedGridId: GridId;
    readonly grid: GridDefinition;
    readonly towers: ReadonlySet<string>;
    readonly towerIdsByCell: ReadonlyMap<string, TowerId>;
    readonly activePath: readonly GridCell[] | null;
    /** 只在合法布塔预览中提供当前真实路线，供战场对比旧路与候选路。 */
    readonly previewBaselinePath: readonly GridCell[] | null;
    readonly preview: { readonly accepted: boolean; readonly cell: GridCell; readonly towerId: TowerId } | null;
    readonly inspectedTower: { readonly cell: GridCell; readonly towerId: TowerId; readonly level: number; readonly upgradeCost: number | null; readonly saleRefund: number | null } | null;
    readonly towerLevelsByCell: ReadonlyMap<string, number>;
    readonly enemies: readonly {
        readonly id: string;
        readonly spawnOrder: number;
        readonly health: number;
        readonly shield?: number;
        readonly archetype: { readonly id: EnemyId; readonly maxHealth: number; readonly maxShield?: number };
        readonly fromCell: GridCell;
        readonly toCell: GridCell;
        readonly progress: number;
        readonly slowRemainingSeconds: number;
        readonly trafficLane?: 0 | 1;
    }[];
    readonly feedback: CombatFeedbackSnapshot;
    readonly routeChange: RouteChangeSnapshot | null;
    readonly gold: number;
    readonly coreHealth: number;
    readonly maxCoreHealth: number;
    readonly speedMultiplier: number;
    readonly soundEnabled: boolean;
    readonly reducedMotion: boolean;
    /** 仅操作已拿起炮塔时才高亮卡片；记住上次塔类型不等于正在放置。 */
    readonly activePlacementTowerId: TowerId | null;
    readonly waveStartButton: WaveStartButtonViewModel;
    readonly showCenterPause: boolean;
    readonly result: BattleResultViewModel | null;
    readonly resultRevealProgress: number;
}
