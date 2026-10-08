import type { PauseOverlaySnapshot } from '../systems/PauseOverlayRuntime';
import type { FirstLevelConfirmationCopy } from './FirstLevelConfirmationPresentation';

/** 异常页不是可取消确认：仅列出已有恢复出口，文案必须说明重置范围。 */
export function firstLevelRouteRecoveryPresentation(): FirstLevelConfirmationCopy {
    return {
        title: '路线异常，暂时停战', kicker: '安全保护 · 战斗已冻结',
        body: ['当前路线无法继续，不会自动判胜负。', '重新开始会清空炮塔，恢复关卡初始金币。', '敌人、波次与本局统计将重置。'],
        actions: ['清空本局 · 重新开始', '结束本局 · 返回地图'],
        actionKinds: ['restart', 'home'],
        footer: '历史纪录与设置保留 · 不会自动继续战斗',
    };
}

/** 恢复来源只控制解释文案；是否能继续仍完全服从暂停运行时的阻塞条件。 */
export function firstLevelPauseMenuPresentation(pause: PauseOverlaySnapshot) {
    const recovering = pause.lifecycleRecovery;
    return {
        title: recovering ? pause.reason === 'lifecycle' ? '后台安全暂停' : '已返回 · 战斗仍暂停' : '战斗暂停',
        actions: [pause.canContinue ? '继续战斗' : '等待返回页面', '重新开始本关', '战斗设置', '返回地图'] as const,
        footer: !pause.canContinue ? '返回页面后，手动继续战斗'
            : recovering ? '塔位与进度保留 · 点继续才恢复' : '战斗已冻结，继续后恢复',
        smallTitle: recovering,
    };
}
