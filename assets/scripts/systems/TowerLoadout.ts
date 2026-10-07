import type { TowerArchetype, TowerId } from '../config/PhaseBCombatConfig';

export const MAX_LOADOUT_SIZE = 5;
export interface LoadoutRules {
    readonly allowed: readonly TowerId[];
    readonly defaults: readonly TowerId[];
    readonly fixed?: boolean;
}
export interface LoadoutStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}

/** 严格校验存档而非悄悄删掉坏数据；不合法时恢复关卡默认，避免空阵容进入战斗。 */
export function validLoadout(value: unknown, allowed: readonly string[]): value is TowerId[] {
    return Array.isArray(value) && value.length >= 1 && value.length <= MAX_LOADOUT_SIZE
        && value.every(id => typeof id === 'string' && allowed.includes(id))
        && new Set(value).size === value.length;
}

export class TowerLoadout {
    private selected: TowerId[];
    public constructor(private readonly rules: LoadoutRules) {
        if (!validLoadout(rules.defaults, rules.allowed)) throw new Error('默认配塔无效');
        this.selected = [...rules.defaults];
    }
    public get ids(): readonly TowerId[] { return [...this.selected]; }
    public choose(ids: readonly TowerId[]): boolean {
        if (this.rules.fixed || !validLoadout(ids, this.rules.allowed)) return false;
        this.selected = [...ids];
        return true;
    }
    public get warnings(): readonly string[] {
        if (this.rules.fixed) return [];
        return [!this.selected.includes('piercing-cannon') ? '未携带穿甲炮：坦克护甲会大幅减伤' : '',
            !this.selected.includes('arc-tower') ? '未携带电弧塔：护盾兵需要更长时间处理' : ''].filter(Boolean);
    }
    /** 出战获得独立快照；此后配塔页的编辑不能改变本局可购买目录。 */
    public freeze(catalog: readonly TowerArchetype[]): readonly TowerArchetype[] {
        return Object.freeze(this.selected.map(id => {
            const tower = catalog.find(item => item.id === id);
            if (!tower) throw new Error(`配塔目录缺少 ${id}`);
            return tower;
        }));
    }
    public restore(storage: LoadoutStorage, levelId: string): void {
        this.selected = [...this.rules.defaults];
        if (this.rules.fixed) return;
        try {
            const saved = JSON.parse(storage.getItem(this.key(levelId)) ?? 'null');
            if (saved?.version === 1 && validLoadout(saved.ids, this.rules.allowed)) this.selected = [...saved.ids];
        } catch { /* 存储被禁用或内容损坏时仍可使用默认阵容开局。 */ }
    }
    public save(storage: LoadoutStorage, levelId: string): boolean {
        try {
            storage.setItem(this.key(levelId), JSON.stringify({ version: 1, ids: this.selected }));
            return true;
        } catch { return false; }
    }
    private key(levelId: string): string { return `nightwatch:loadout:v1:${levelId}`; }
}

export const FIXED_BEGINNER_LOADOUT: LoadoutRules = {
    allowed: ['rivet-gun', 'frost-coil'], defaults: ['rivet-gun', 'frost-coil'], fixed: true,
};
export const THIRD_LEVEL_LOADOUT: LoadoutRules = {
    allowed: ['rivet-gun', 'frost-coil', 'piercing-cannon', 'arc-tower'],
    defaults: ['rivet-gun', 'frost-coil', 'piercing-cannon', 'arc-tower'],
};
