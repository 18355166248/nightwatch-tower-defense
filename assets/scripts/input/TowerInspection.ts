import { sameCell, type GridCell } from '../core/GridTypes';

export type TowerInspectionAction = 'inspect' | 'sell' | 'dismiss';

/** 已建塔的查看与二次确认独立于布塔预览，避免一次误触直接撤销。 */
export class TowerInspection {
    private current: GridCell | null = null;

    public get cell(): GridCell | null {
        return this.current;
    }

    public tap(cell: GridCell, canSell: boolean): TowerInspectionAction {
        if (!this.current || !sameCell(this.current, cell)) {
            this.current = { ...cell };
            return 'inspect';
        }
        this.current = null;
        return canSell ? 'sell' : 'dismiss';
    }

    public clear(): void {
        this.current = null;
    }
}
