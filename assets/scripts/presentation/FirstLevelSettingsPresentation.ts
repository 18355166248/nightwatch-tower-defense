import type { FirstLevelSettings } from '../systems/FirstLevelSettingsStore';
import type { PhaseBRect } from './PhaseBLayout';

export type FirstLevelSettingsAction =
    | { readonly kind: 'sound'; readonly enabled: boolean }
    | { readonly kind: 'volume'; readonly step: 1 | 2 | 3 | 4 }
    | { readonly kind: 'motion'; readonly reduced: boolean }
    | { readonly kind: 'speed'; readonly multiplier: 1 | 2 }
    | { readonly kind: 'back' };
export interface SettingsChoice {
    readonly text: string;
    readonly rect: PhaseBRect;
    readonly selected: boolean;
    readonly action: FirstLevelSettingsAction;
}
export interface SettingsCaption {
    readonly text: string;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly size: number;
}

/** 展示与输入共用带类型的动作，不再依赖易串位的第几个按钮；音量独占一行保证窄屏热区。 */
export function firstLevelSettingsPresentation(settings: FirstLevelSettings, speed: number, fromHome: boolean): {
    choices: readonly SettingsChoice[]; captions: readonly SettingsCaption[];
} {
    const pair = (y: number): readonly PhaseBRect[] => [
        { left: 30, right: 185, bottom: y - 75, top: y + 75 },
        { left: 205, right: 360, bottom: y - 75, top: y + 75 },
    ];
    const choices: SettingsChoice[] = [];
    const add = (text: string, rect: PhaseBRect, selected: boolean, action: FirstLevelSettingsAction) => choices.push({ text, rect, selected, action });
    pair(330).forEach((rect, i) => add(i ? '开' : '关', rect, settings.soundEnabled === Boolean(i), { kind: 'sound', enabled: Boolean(i) }));
    ([1, 2, 3, 4] as const).forEach((step, i) => add(`${step * 25}%`,
        { left: -360 + i * 184, right: -192 + i * 184, bottom: 20, top: 170 },
        settings.volumeStep === step, { kind: 'volume', step }));
    pair(-95).forEach((rect, i) => add(i ? '开' : '关', rect, settings.reducedMotion === Boolean(i), { kind: 'motion', reduced: Boolean(i) }));
    if (!fromHome) pair(-285).forEach((rect, i) => add(`${i + 1}×`, rect, speed === i + 1, { kind: 'speed', multiplier: i ? 2 : 1 }));
    add(fromHome ? '返回菜单' : '返回暂停', { left: -360, right: 360, bottom: -545, top: -395 }, false, { kind: 'back' });
    return { choices, captions: [
        { text: '声音', x: -360, y: 330, width: 340, size: 36 },
        { text: '音量', x: -360, y: 215, width: 200, size: 36 },
        { text: '音乐与音效共用', x: -100, y: 215, width: 460, size: 28 },
        { text: '减弱动态', x: -360, y: -75, width: 340, size: 36 },
        { text: '减少震动与闪烁', x: -360, y: -125, width: 340, size: 28 },
        { text: fromHome ? '偏好会在下次开局沿用' : '战斗速度', x: -360, y: -285, width: fromHome ? 720 : 340, size: fromHome ? 30 : 36 },
    ] };
}
