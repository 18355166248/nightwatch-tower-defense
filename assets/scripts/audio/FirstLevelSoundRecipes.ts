export type FirstLevelSoundCue = 'ui' | 'pickup' | 'place' | 'upgrade' | 'sell' | 'reject'
    | 'rivet-shot' | 'frost-shot' | 'metal-hit' | 'frost-hit' | 'kill'
    | 'infantry-death' | 'runner-death' | 'hauler-death'
    | 'core-hit' | 'core-critical' | 'wave-start' | 'wave-clear' | 'victory' | 'defeat';
export type AudioBus = 'ui' | 'sfx' | 'alert';
export interface SoundTone {
    readonly hz: number;
    readonly endHz?: number;
    readonly at: number;
    readonly duration: number;
    readonly gain: number;
    readonly wave: OscillatorType;
}
export interface SoundRecipe {
    readonly bus: AudioBus;
    readonly priority: number;
    readonly tones: readonly SoundTone[];
}

const tone = (hz: number, duration: number, gain: number, wave: OscillatorType = 'sine', at = 0, endHz?: number): SoundTone =>
    ({ hz, duration, gain, wave, at, endHz });
const ui = (...tones: SoundTone[]): SoundRecipe => ({ bus: 'ui', priority: 1, tones });
const sfx = (priority: number, ...tones: SoundTone[]): SoundRecipe => ({ bus: 'sfx', priority, tones });
const alert = (...tones: SoundTone[]): SoundRecipe => ({ bus: 'alert', priority: 3, tones });

/** 原创程序合成候选；旋律提示固定音高，重复枪声才轮换整组音色，避免和弦内部走调。 */
export const FIRST_LEVEL_SOUND_RECIPES: Readonly<Record<FirstLevelSoundCue, SoundRecipe>> = {
    ui: ui(tone(700, 0.055, 0.13, 'sine', 0, 820)),
    pickup: ui(tone(380, 0.075, 0.12, 'triangle', 0, 490)),
    place: ui(tone(430, 0.11, 0.22, 'triangle', 0, 550), tone(650, 0.12, 0.11, 'sine', 0.06)),
    upgrade: ui(tone(440, 0.09, 0.16, 'triangle'), tone(554, 0.1, 0.14, 'triangle', 0.07), tone(880, 0.18, 0.12, 'sine', 0.14)),
    sell: ui(tone(780, 0.07, 0.14), tone(520, 0.13, 0.13, 'triangle', 0.055)),
    reject: ui(tone(260, 0.14, 0.16, 'triangle', 0, 180)),
    'rivet-shot': sfx(0, tone(190, 0.045, 0.11, 'triangle', 0, 115), tone(1700, 0.026, 0.035, 'sine', 0, 850)),
    'frost-shot': sfx(0, tone(640, 0.12, 0.12, 'sine', 0, 390), tone(930, 0.08, 0.045, 'sine', 0.025)),
    'metal-hit': sfx(0, tone(1440, 0.052, 0.06, 'sine', 0, 810), tone(2310, 0.036, 0.025)),
    'frost-hit': sfx(0, tone(1050, 0.085, 0.05, 'sine', 0, 660)),
    kill: sfx(2, tone(500, 0.1, 0.12, 'sine', 0, 690), tone(760, 0.13, 0.08, 'sine', 0.055)),
    'infantry-death': sfx(1, tone(430, 0.075, 0.13, 'triangle', 0, 170), tone(1250, 0.065, 0.05, 'sine', 0.035, 650)),
    'runner-death': sfx(1, tone(880, 0.13, 0.11, 'sine', 0, 220), tone(1320, 0.065, 0.045, 'sine', 0.035, 520)),
    'hauler-death': sfx(2, tone(130, 0.27, 0.2, 'triangle', 0, 55), tone(760, 0.16, 0.075, 'sine', 0.025, 260), tone(1180, 0.12, 0.035, 'sine', 0.06, 510)),
    'core-hit': alert(tone(155, 0.28, 0.22, 'triangle', 0, 70)),
    'core-critical': alert(tone(330, 0.16, 0.15, 'triangle'), tone(330, 0.22, 0.15, 'triangle', 0.25)),
    'wave-start': alert(tone(330, 0.16, 0.1, 'triangle'), tone(440, 0.18, 0.12, 'triangle', 0.13)),
    'wave-clear': alert(tone(520, 0.15, 0.09), tone(660, 0.2, 0.11, 'sine', 0.13)),
    victory: { ...alert(tone(440, 0.2, 0.12, 'triangle'), tone(554, 0.22, 0.12, 'triangle', 0.16), tone(660, 0.36, 0.11, 'sine', 0.32)), priority: 4 },
    defeat: { ...alert(tone(240, 0.28, 0.12, 'triangle', 0, 175), tone(170, 0.35, 0.12, 'triangle', 0.22, 100)), priority: 4 },
};

export function soundRecipe(cue: FirstLevelSoundCue, occurrence: number): SoundRecipe {
    const recipe = FIRST_LEVEL_SOUND_RECIPES[cue];
    if (cue !== 'rivet-shot' && cue !== 'frost-shot') return recipe;
    const variant = Math.max(0, Math.floor(occurrence)) % 3;
    const pitch = [0.965, 1, 1.035][variant];
    const gain = [0.94, 1, 0.97][variant];
    return { ...recipe, tones: recipe.tones.map((spec) => ({ ...spec,
        hz: spec.hz * pitch, endHz: spec.endHz ? spec.endHz * pitch : undefined, gain: spec.gain * gain })) };
}
