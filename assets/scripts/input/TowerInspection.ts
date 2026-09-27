import { sameCell, type GridCell } from '../core/GridTypes';

export type TowerInspectionAction = 'inspect' | 'dismiss';

/** 点塔只切换查看，出售必须走明确按钮，避免连续点塔时误删关键路线。 */
export class TowerInspection {
    private current: GridCell | null = null;

    public get cell(): GridCell | null {
        return this.current;
    }

    public tap(cell: GridCell): TowerInspectionAction {
        if (!this.current || !sameCell(this.current, cell)) {
            this.current = { ...cell };
            return 'inspect';
        }
        this.current = null;
        return 'dismiss';
    }

    public clear(): void {
        this.current = null;
    }
}
