/** B 已确认的面板源图缩为 3/4；只补偿九宫格边框，不改变页面、文字和热区尺寸。 */
export const PAGE_PANEL_SOURCE_SCALE = 3 / 4;
export const PAGE_PANEL_SOURCE_INSET = 42 * PAGE_PANEL_SOURCE_SCALE;

export function pagePanelBorderScale(borderWidth = 42): number {
    return borderWidth / PAGE_PANEL_SOURCE_INSET;
}
