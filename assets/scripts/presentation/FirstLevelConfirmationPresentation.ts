export type FirstLevelConfirmationScreen = 'confirm-restart' | 'confirm-home';
import type { PhaseBRect } from './PhaseBLayout';
export type FirstLevelConfirmationAction = 'restart' | 'home' | 'cancel';

export interface FirstLevelConfirmationCopy {
    readonly title: string;
    readonly actions: readonly [string, string];
    readonly footer: string;
    readonly kicker: string;
    readonly body: readonly [string, string, string];
    readonly actionKinds: readonly [FirstLevelConfirmationAction, FirstLevelConfirmationAction];
}

/** 文案与语义动作成对提供，返回首页的安全主操作换序后不依赖旧按钮下标。 */
export function firstLevelConfirmationPresentation(screen: FirstLevelConfirmationScreen): FirstLevelConfirmationCopy {
    if (screen === 'confirm-home') return {
        title: '返回首页？',
        kicker: '离开当前战斗',
        body: ['当前战斗将结束，本局进度不会保存。', '再次开始时，从第一波重新布防。', '历史最好纪录与设置仍保留。'],
        actions: ['保留原局 · 返回暂停', '结束本局 · 返回首页'],
        actionKinds: ['cancel', 'home'],
        footer: '返回暂停后，可手动继续战斗',
    };
    // 检查点恢复开战前的剩余金币，而不是清零；战斗中获得的收益不会带回布防。
    return {
        title: '回到战前布防？',
        kicker: '重新部署',
        body: ['恢复开战前的塔位、等级与金币。', '本局敌人、波次及战斗统计将重置。', '历史最好纪录不受影响。'],
        actions: ['确认重新部署', '保留原局 · 返回暂停'],
        actionKinds: ['restart', 'cancel'],
        footer: '重新部署后，可调整塔位再开波',
    };
}

/** 390×844获批稿的坐标一次转换到Cocos中心坐标，文字与触控一起等比缩放，不再二次缩字号。 */
export function firstLevelConfirmationLayout(visibleWidth: number) {
    const scale = Math.min(1080, visibleWidth) / 390;
    const rect = (x: number, y: number, w: number, h: number): PhaseBRect => ({
        left: (x - 195) * scale, right: (x + w - 195) * scale,
        top: (422 - y) * scale, bottom: (422 - y - h) * scale,
    });
    const text = (x: number, y: number, w: number, h: number, size: number, line: number) => ({ rect: rect(x, y, w, h), size: size * scale, line: line * scale });
    return {
        scale, panel: rect(23, 258, 344, 394.45), icon: rect(46, 285.4, 36, 36),
        kicker: text(94, 283, 250, 13, 10, 13), title: text(94, 300, 250, 23.8, 17, 23.8),
        context: text(46, 338.8, 298, 18.15, 11, 18.15), divider: rect(46, 369, 298, 1),
        body: [text(46, 383.95, 298, 22.8, 12, 22.8), text(46, 406.75, 298, 22.8, 12, 22.8),
            text(46, 429.55, 298, 20.9, 11, 20.9)],
        buttons: [rect(46, 481.95, 298, 54), rect(46, 545.95, 298, 54)],
        actionSize: 13 * scale, actionLine: 18.2 * scale,
        footer: text(46, 612.95, 298, 16.5, 10, 16.5),
    };
}
