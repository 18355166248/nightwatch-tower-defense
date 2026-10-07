import { PHASE_B_CENTER_PAUSE_BUTTON, PHASE_B_EARLY_WAVE_BUTTON, PHASE_B_FROST_BUTTON,
    PHASE_B_RIVET_BUTTON, PHASE_B_SELL_BUTTON, PHASE_B_SPEED_BUTTON, PHASE_B_UPGRADE_BUTTON,
    PHASE_B_UPGRADE_FULL_BUTTON, type PhaseBRect } from './PhaseBLayout';

export const FIRST_LEVEL_INSPECT_CLOSE: PhaseBRect = { left: 366, right: 516, bottom: -630, top: -480 };
/** 设计坐标转成 Cocos 中心原点；普通模式和命中读取同一契约，QA 旧布局不受影响。 */
export function firstLevelControlRect(rect: PhaseBRect, quality: boolean): PhaseBRect {
    if (!quality) return rect;
    if (rect === PHASE_B_RIVET_BUTTON) return { left: -492, right: -182, bottom: -936, top: -764 };
    if (rect === PHASE_B_FROST_BUTTON) return { left: -172, right: 138, bottom: -936, top: -764 };
    if (rect === PHASE_B_SPEED_BUTTON) return { left: 35, right: 205, bottom: -926, top: -774 };
    if (rect === PHASE_B_EARLY_WAVE_BUTTON) return { left: 225, right: 492, bottom: -926, top: -774 };
    if (rect === PHASE_B_SELL_BUTTON) return { left: -320, right: 0, bottom: -728, top: -568 };
    if (rect === PHASE_B_UPGRADE_BUTTON || rect === PHASE_B_UPGRADE_FULL_BUTTON)
        return { left: 20, right: 360, bottom: -728, top: -568 };
    if (rect === PHASE_B_CENTER_PAUSE_BUTTON) return { left: 340, right: 490, bottom: 786, top: 936 };
    return rect;
}
