import type { FirstLevelExperienceSnapshot, FirstLevelEntryMode } from './FirstLevelExperience';
import type { BattlePhase } from '../systems/BattleStateMachine';
import type { PhaseBRect } from './PhaseBLayout';

export interface CoachPresentationInput {
    readonly experience: FirstLevelExperienceSnapshot;
    readonly phase: BattlePhase;
    readonly preparing: boolean;
    readonly held: boolean;
    readonly overlayVisible: boolean;
    readonly panelVisible: boolean;
    readonly guidanceText: string;
    readonly countdownSeconds: number;
    readonly upgradeTargetSelected?: boolean;
}

/** 视图与输入共用可见性，战斗/遮罩下不能留下不可见的跳过热区。 */
export function firstLevelCoachSkipVisible(mode: FirstLevelEntryMode, phase: BattlePhase, preparing: boolean, held: boolean, overlay: boolean): boolean {
    return mode === 'guided' && !overlay && (preparing || held || phase === 'countdown');
}

/** 教学待命与真正暂停不能混用；预览/选塔拥有操作说明时，轻提示立即让位。 */
export function firstLevelCoachPresentation(input: CoachPresentationInput) {
    const guided = input.experience.mode === 'guided';
    const window = input.preparing || input.held || input.phase === 'countdown';
    const visible = input.experience.mode !== 'home' && !input.overlayVisible && !input.panelVisible && window;
    const lines = (input.experience.guidanceText ?? input.guidanceText).split('\n');
    const progress = /推荐布防 (\d+)\/(\d+)/.exec(lines[0]);
    let title = lines[0].replace(/^推荐布防 \d+\/\d+ · /, '');
    let body = lines[1] ?? '';
    let help = input.held ? '建议布防，不强制完成才能开波' : '建议布防，不限制自由落点';
    if (input.experience.step === 'select') {
        title = '先点机枪塔'; body = '再点亮起的格子，摆下炮塔';
    } else if (input.experience.step === 'place' && !input.panelVisible) {
        title = '让敌人绕进火力区'; body = lines[1] ?? '点高亮格，查看路线变化';
        help = '进入建造预览后，这张卡让位';
    } else if (input.experience.step === 'upgrade') {
        // 升级建议仍从真实待升级塔产生；不能用示例中段机枪覆盖后期冷凝建议。
        title = lines[0].split(' · ')[0]; body = '点高亮炮塔，查看下一阶提升';
        help = `${lines[0].split(' · ')[1] ?? '建议升级'}；不强制升级才能开波`;
    } else if (input.experience.step === 'ready') {
        title = input.preparing ? '防线准备好了' : lines[0]; body = lines[1] ?? '点右下“开始下一波”继续防守';
        help = input.preparing ? '仍可自由调整；战前撤销全额返还' : '仍可自由加固；点击开波才继续';
    }
    if (guided && input.experience.readyToFinishTutorial) {
        title = '新手引导完成'; body = '点右下开始第二波，进入自由防守';
        help = '后续不再等待引导，可随时建塔和升级';
    }
    if (!guided) {
        title = input.preparing ? '自由布防' : '下一波即将到来';
        body = input.preparing ? input.guidanceText.split('\n')[0] : '可补塔、升级，或点右下提前开波';
        help = input.preparing ? input.guidanceText.split('\n')[1] ?? '保持入口与出口连通' : '自由模式继续原倒计时，不等待确认';
    }
    return { visible, skipVisible: firstLevelCoachSkipVisible(input.experience.mode,input.phase,input.preparing,input.held,input.overlayVisible),
        upgradeHighlighted: !input.overlayVisible && input.panelVisible && input.experience.step === 'upgrade' && Boolean(input.upgradeTargetSelected),
        title, body, help, progress: input.experience.readyToFinishTutorial ? '最后一步' : input.held ? '等待你继续'
            : input.phase === 'countdown' ? `${Math.max(0, Math.ceil(input.countdownSeconds))}秒后自动开波`
            : progress ? `布防 ${progress[1]} / ${progress[2]}` : input.preparing && guided ? '推荐布防' : '' };
}

/** 共用390几何；相对既有塔栏和顶边锚定，隐藏时不为轻卡预留空间。 */
export function firstLevelCoachLayout(width: number) {
    const scale = Math.min(1080, width) / 390;
    const bottom = -764 + 12 * scale;
    const rect = (x: number, y: number, w: number, h: number, top = 960): PhaseBRect => ({
        left: (x - 195) * scale, right: (x + w - 195) * scale,
        top: top - y * scale, bottom: top - (y + h) * scale,
    });
    const top = bottom + 84 * scale;
    // 长竖屏额外高度留给战场，跳过按钮仍在HUD下方固定安全槽，不随横向缩放上移进HUD。
    const skipTop = Math.min(960 - 72 * scale,780);
    const edgeShift = Math.max(0,24 - 12*scale);
    const rawSkip = rect(312,0,66,54,skipTop);
    const skip = {...rawSkip,left:rawSkip.left-edgeShift,right:rawSkip.right-edgeShift};
    const skipText = {rect:skip,size:10*scale,bold:false};
    const text = (x: number, y: number, w: number, h: number, size: number, bold = false, anchor = top) => ({rect:rect(x,y,w,h,anchor),size:size*scale,bold});
    return {scale, card:rect(12,0,366,84,top), skip,
        title:text(26,6,234,25,17,true), progress:text(260,8,100,20,11,true),
        body:text(26,33,334,23,14,true), help:text(26,59,334,15,10),
        kicker:text(24,73,266,12,9,false,960), lineup:text(24,85,266,17,11,false,960),
        tactic:text(24,102,266,15,10,false,960), skipText};
}
