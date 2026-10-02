/** 字号属于表现契约，不影响布局尺寸和输入命中；全 UI 跟随 Cocos 参考分辨率等比缩放。 */
export const FIRST_LEVEL_UI_TEXT_SCALE = 0.72;
export const FIRST_LEVEL_UI_FONT = 'PingFang SC';
export function firstLevelFontSize(baseSize: number): number {
    return Math.round(baseSize * FIRST_LEVEL_UI_TEXT_SCALE * 100) / 100;
}
