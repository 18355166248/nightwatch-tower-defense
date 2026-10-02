export type MusicMood = 'off' | 'paused' | 'calm' | 'intense';

/** 音乐只读已有阶段；教学波间保持基础层，真实暂停冻结音乐，结果/首页结束音乐。 */
export function firstLevelMusicMood(state: {
    readonly home: boolean;
    readonly phase: string;
    readonly wave: number;
    readonly preparing: boolean;
    readonly pauseVisible: boolean;
    readonly guidedHold: boolean;
}): MusicMood {
    if (state.home || state.phase === 'victory' || state.phase === 'defeat') return 'off';
    if (state.pauseVisible || state.phase === 'paused' && !state.guidedHold) return 'paused';
    return !state.preparing && !state.guidedHold && state.wave >= 5 ? 'intense' : 'calm';
}
