import type { TimedFeedback } from './CombatFeedbackRuntime';

export interface CoreObjectiveReactionPose {
    readonly strength: number;
    readonly scaleX: number;
    readonly scaleY: number;
    readonly offsetY: number;
    readonly green: number;
    readonly blue: number;
}

/** 漏怪只挤压和闪暖目标切图；多只同时漏怪取最强一次，避免累积抖动。 */
export function coreObjectiveReactionPose(hits: readonly TimedFeedback[]): CoreObjectiveReactionPose {
    let strength = 0;
    for (const hit of hits) {
        if (!Number.isFinite(hit.remainingSeconds) || !Number.isFinite(hit.durationSeconds)
            || hit.durationSeconds <= 0 || hit.remainingSeconds <= 0) continue;
        const life = Math.max(0, Math.min(1, hit.remainingSeconds / hit.durationSeconds));
        strength = Math.max(strength, life * life);
    }
    return {
        strength,
        scaleX: 1 + strength * 0.12,
        scaleY: 1 - strength * 0.06,
        offsetY: strength > 0 ? -strength * 3 : 0,
        green: Math.round(255 - strength * 52),
        blue: Math.round(255 - strength * 68),
    };
}
