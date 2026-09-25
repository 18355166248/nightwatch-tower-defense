export type FirstLevelEntryMode = 'home' | 'guided' | 'free';
export type FirstLevelCoachStep = 'select' | 'place' | 'shape' | 'route' | 'ready' | 'combat';

export interface FirstLevelCoachContext {
    readonly preparing: boolean;
    readonly towerCount: number;
    readonly pathDelta: number;
    readonly previewAccepted: boolean | null;
    readonly inputMode: string;
}

export interface FirstLevelExperienceSnapshot {
    readonly mode: FirstLevelEntryMode;
    readonly step: FirstLevelCoachStep | null;
    readonly guidanceText: string | null;
}

export const FIRST_LEVEL_START_BUTTON = { left: -340, right: 340, bottom: -345, top: -195 } as const;
export const FIRST_LEVEL_SKIP_INTRO_BUTTON = { left: -220, right: 220, bottom: -455, top: -365 } as const;
export const FIRST_LEVEL_SKIP_COACH_BUTTON = { left: 295, right: 455, bottom: 620, top: 695 } as const;

/** 入场与教学是独立的展示状态，不替代布塔门禁或战斗状态机。 */
export class FirstLevelExperience {
    private mode: FirstLevelEntryMode;

    public constructor(qaMode: boolean) {
        this.mode = qaMode ? 'free' : 'home';
    }

    public get entryMode(): FirstLevelEntryMode {
        return this.mode;
    }

    public begin(): void {
        if (this.mode === 'home') this.mode = 'guided';
    }

    public skip(): void {
        this.mode = 'free';
    }

    public snapshot(context: FirstLevelCoachContext): FirstLevelExperienceSnapshot {
        if (this.mode !== 'guided') return { mode: this.mode, step: null, guidanceText: null };
        if (!context.preparing) {
            return { mode: this.mode, step: 'combat', guidanceText: '战斗中也能补塔改路；注意漏怪会损失核心' };
        }
        if (context.previewAccepted !== null) {
            const ordinal = context.towerCount === 0 ? 1 : 2;
            return {
                mode: this.mode,
                step: 'place',
                guidanceText: context.previewAccepted
                    ? `第 ${ordinal} 步 · 绿色可建造，再点同一格确认`
                    : `第 ${ordinal} 步 · 红色不能建造，换一个格子`,
            };
        }
        if (context.towerCount === 0) {
            return context.inputMode === 'idle'
                ? { mode: this.mode, step: 'select', guidanceText: '第 1 步 · 点机枪塔，再点路线旁的格子' }
                : { mode: this.mode, step: 'place', guidanceText: '第 1 步 · 拖到格子落塔，或点格子预览' };
        }
        if (context.towerCount < 2) {
            if (context.inputMode !== 'idle') {
                return { mode: this.mode, step: 'place', guidanceText: '第 2 步 · 点路线旁的格子预览第二座塔' };
            }
            return {
                mode: this.mode,
                step: 'shape',
                guidanceText: '第 2 步 · 再建一塔，观察箭头怎样绕路',
            };
        }
        if (context.pathDelta < 2) {
            return { mode: this.mode, step: 'route', guidanceText: `第 2 步 · 路线还差 ${2 - context.pathDelta} 格；试着堵住直路` };
        }
        return { mode: this.mode, step: 'ready', guidanceText: '第 3 步 · 路线已变长，点 ▶ 开始第一波' };
    }
}
