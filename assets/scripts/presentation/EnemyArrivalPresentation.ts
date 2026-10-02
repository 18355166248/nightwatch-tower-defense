import type { EnemyId } from '../config/PhaseBCombatConfig';

export interface EnemyArrivalPose {
    readonly scale: number;
    readonly opacity: number;
    readonly hatchGlowOpacity: number;
}

const ARRIVAL_SECONDS = 0.24;

/** 入场只用局内时钟；暂停冻结、倍速跟随战斗，绝不改变敌人的逻辑位置。 */
export function enemyArrivalPose(ageSeconds: number, reducedMotion: boolean): EnemyArrivalPose {
    if (reducedMotion || !Number.isFinite(ageSeconds) || ageSeconds >= ARRIVAL_SECONDS) {
        return { scale: 1, opacity: 255, hatchGlowOpacity: 0 };
    }
    const progress = Math.max(0, ageSeconds) / ARRIVAL_SECONDS;
    const settle = 1 - (1 - progress) * (1 - progress);
    return {
        scale: 0.82 + 0.18 * settle,
        opacity: Math.round(145 + 110 * settle),
        hatchGlowOpacity: Math.round(128 * (1 - progress) * (1 - progress)),
    };
}

/** 路面接触斑比立绘更稳：三类敌人用形状和色温分层，密集波仍保持低亮度。 */
export function enemyGroundingStyle(id: EnemyId, size: number): {
    readonly halfWidth: number;
    readonly y: number;
    readonly accent: readonly [number, number, number];
} {
    const heavy = id === 'iron-canister-hauler';
    return {
        halfWidth: size * (heavy ? 0.34 : 0.27),
        y: -size * (heavy ? 0.35 : 0.34),
        accent: id === 'clockwork-runner' ? [99, 218, 239]
            : heavy ? [246, 189, 103] : [230, 142, 112],
    };
}

/** 仅存新敌人首次出现的局内秒数；离场即清理，重开时钟倒退也会清空。 */
export class EnemyArrivalPresentation {
    private readonly bornAt = new Map<string, number>();
    private lastSeconds = 0;

    public pose(id: string, nowSeconds: number, reducedMotion: boolean): EnemyArrivalPose {
        if (!Number.isFinite(nowSeconds)) return enemyArrivalPose(Infinity, reducedMotion);
        if (nowSeconds < this.lastSeconds) this.bornAt.clear();
        this.lastSeconds = nowSeconds;
        let born = this.bornAt.get(id);
        if (born === undefined) {
            born = nowSeconds;
            this.bornAt.set(id, born);
        }
        return enemyArrivalPose(nowSeconds - born, reducedMotion);
    }

    public retain(activeIds: ReadonlySet<string>): void {
        for (const id of this.bornAt.keys()) if (!activeIds.has(id)) this.bornAt.delete(id);
    }
}
