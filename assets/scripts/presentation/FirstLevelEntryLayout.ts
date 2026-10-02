import { FIRST_LEVEL_HOME_SETTINGS_BUTTON, FIRST_LEVEL_START_BUTTON, FIRST_LEVEL_SKIP_INTRO_BUTTON } from './FirstLevelExperience';
import { type PhaseBLayout, type PhaseBRect } from './PhaseBLayout';
import { firstLevelCoachLayout } from './FirstLevelCoachPresentation';

/** 教学跳过留在棋盘上方右侧独立槽位；与暂停、敌情和棋盘都不争用触控区。 */
export function firstLevelCoachSkipRect(layout: PhaseBLayout): PhaseBRect {
    return firstLevelCoachLayout(layout.visibleDesignWidth).skip;
}

/** 首页卡内几何独立于Cocos；输入和视图共用按钮，不以裁字或缩小整张卡修窄屏。 */
export function firstLevelHomeLayout(layout: PhaseBLayout): {
    readonly card: PhaseBRect;
    readonly start: PhaseBRect;
    readonly settings: PhaseBRect;
    readonly skip: PhaseBRect;
    readonly hero: PhaseBRect;
    readonly title: PhaseBRect;
    readonly contentWidth: number;
} {
    const width = Math.min(1000, layout.safeHalfWidth * 2);
    const contentWidth = width - 48;
    const inset = layout.safeHalfWidth - width / 2 + 24;
    const settings = layout.fitRect(FIRST_LEVEL_HOME_SETTINGS_BUTTON, inset);
    const heroWidth = Math.min(900,contentWidth-44);
    return {
        card: { left: -width / 2, right: width / 2, bottom: -850, top: 850 },
        start: layout.fitRect(FIRST_LEVEL_START_BUTTON, inset),
        settings,
        skip: layout.fitRect(FIRST_LEVEL_SKIP_INTRO_BUTTON, inset),
        hero: {left:-heroWidth/2,right:heroWidth/2,bottom:90,top:635},
        // 所有尺寸都将标题与设置分区，避免扩大主视觉后再靠裁字解决窄屏碰撞。
        title: {left:Math.max(-425,-contentWidth/2+22),right:settings.left-24,bottom:710,top:820},
        contentWidth,
    };
}
