import type { TowerId } from '../config/PhaseBCombatConfig';
import { FIRST_WAVE_MIN_PATH_DELTA, FIRST_WAVE_MIN_TOWER_COUNT } from '../systems/BattleStateMachine';
import { waveStartActionText } from './PhaseBHudText';

export interface FirstLevelGuidanceState {
    readonly preparing: boolean;
    readonly towerCount: number;
    readonly pathDelta: number;
    readonly previewAccepted: boolean | null;
    readonly selectedTowerId: TowerId;
}

/** 只根据玩法快照生成首关引导；提示不反向改变布塔或战斗规则。 */
export function firstLevelGuidance(state: FirstLevelGuidanceState): string {
    if (!state.preparing) return '战斗中仍可布塔改路；留意敌人的行进方向';
    if (state.previewAccepted === false) return '这个位置不能建造，请换一个格子';
    if (state.previewAccepted === true) return '绿色是可建造位置；再点一次确认，或松手落塔';
    if (state.towerCount === 0) return '点空地选择炮塔，点选即可建造';
    if (state.towerCount < FIRST_WAVE_MIN_TOWER_COUNT) return '再建一座塔；观察箭头怎样绕开塔位';
    if (state.pathDelta < FIRST_WAVE_MIN_PATH_DELTA) return `路线还需延长 ${FIRST_WAVE_MIN_PATH_DELTA - state.pathDelta} 格，才能开始第一波`;
    return state.selectedTowerId === 'frost-coil'
        ? `冷凝塔减速敌人\n${waveStartActionText('first')}`
        : `开波条件已满足 · 可改塔位\n${waveStartActionText('first')}`;
}
