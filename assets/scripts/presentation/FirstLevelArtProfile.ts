export interface FirstLevelArtProfile {
    readonly id: 'original' | 'compact-candidate';
    readonly backdrops: readonly [string, string];
    readonly infantryWalk: string;
    readonly infantryCollapse: string;
}

export const ORIGINAL_FIRST_LEVEL_ART: FirstLevelArtProfile = Object.freeze({
    id: 'original',
    backdrops: Object.freeze(['level-one/backdrop-plaza-v2/spriteFrame', 'level-one/backdrop/spriteFrame'] as const),
    infantryWalk: 'level-one/units/clockwork-infantry-walk-rig-v2',
    infantryCollapse: 'level-one/units/clockwork-infantry-collapse-rig-v1',
});
export const COMPACT_FIRST_LEVEL_ART: FirstLevelArtProfile = Object.freeze({
    id: 'compact-candidate',
    backdrops: Object.freeze(['level-one/backdrop-plaza-budget-v1/spriteFrame', 'level-one/backdrop-budget-v1/spriteFrame'] as const),
    infantryWalk: 'level-one/units/clockwork-infantry-walk-rig-budget-v1',
    infantryCollapse: 'level-one/units/clockwork-infantry-collapse-rig-budget-v1',
});

/** 尺寸对比不修改规则、存档或默认画风；显式参数才选择低占用候选，两档资源不同时加载。 */
export function firstLevelArtProfile(search: string): FirstLevelArtProfile {
    return new URLSearchParams(search).get('artBudget') === 'compact' ? COMPACT_FIRST_LEVEL_ART : ORIGINAL_FIRST_LEVEL_ART;
}
