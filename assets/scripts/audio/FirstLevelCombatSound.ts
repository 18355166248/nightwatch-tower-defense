import type { CombatTickResult } from '../systems/WaveCombatRuntime';
import type { FirstLevelSoundCue } from './FirstLevelSoundRecipes';

/** 一帧只保留每类声意图一次；重装死亡优先于普通小怪，密集波不按塔数叠响。 */
export function combatSoundCues(result: CombatTickResult, coreBefore: number, coreAfter: number): readonly FirstLevelSoundCue[] {
    const cues: FirstLevelSoundCue[] = [];
    if (result.leaked.length > 0) cues.push('core-hit');
    if (coreBefore > 3 && coreAfter > 0 && coreAfter <= 3) cues.push('core-critical');
    if (result.killed.length > 0) {
        const ids = new Set(result.killed.map((enemy) => enemy.archetype.id));
        cues.push(ids.has('iron-canister-hauler') ? 'hauler-death' : ids.has('clockwork-runner') ? 'runner-death' : 'infantry-death');
    }
    if (result.shots.some((shot) => shot.towerId === 'rivet-gun')) cues.push('rivet-shot');
    if (result.shots.some((shot) => shot.towerId === 'frost-coil')) cues.push('frost-shot');
    if (result.shots.some((shot) => !shot.lethal && shot.towerId === 'rivet-gun')) cues.push('metal-hit');
    if (result.shots.some((shot) => !shot.lethal && shot.towerId === 'frost-coil')) cues.push('frost-hit');
    return cues;
}
