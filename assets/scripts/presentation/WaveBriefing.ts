import type { EnemyId, WaveDefinition } from '../config/PhaseBCombatConfig';

interface CountedEnemy {
    readonly id: EnemyId;
    readonly label: string;
    readonly count: number;
}

export interface UpcomingWaveBriefing {
    readonly wave: number;
    readonly lineup: string;
    readonly tactic: string;
    readonly accessibleLineup: string;
}

const SHORT_ENEMY_NAMES: Record<EnemyId, string> = {
    'clockwork-infantry': '步兵',
    'clockwork-runner': '疾行',
    'iron-canister-hauler': '重装',
};

const DENSE_ENEMY_NAMES: Record<EnemyId, string> = {
    'clockwork-infantry': '步兵',
    'clockwork-runner': '疾行',
    'iron-canister-hauler': '重甲',
};

function countedEnemies(wave: WaveDefinition): readonly CountedEnemy[] {
    const counts = new Map<EnemyId, CountedEnemy>();
    for (const group of wave.groups) {
        const previous = counts.get(group.enemy.id);
        counts.set(group.enemy.id, { id: group.enemy.id, label: group.enemy.label,
            count: (previous?.count ?? 0) + group.count });
    }
    return Array.from(counts.values());
}

/** 波次文案只读取配置；增删敌人种类不必修改战斗或 HUD 的统计逻辑。 */
export function waveLineup(wave: WaveDefinition): string {
    return countedEnemies(wave).map(({ label, count }) => `${label}×${count}`).join(' · ');
}

/** 波间预告与辅助描述共用真实编队；短标签留给窄屏，完整敌名留给朗读。 */
export function upcomingWaveBriefing(wave: WaveDefinition): UpcomingWaveBriefing {
    const enemies = countedEnemies(wave);
    return {
        wave: wave.wave,
        // 三种敌人的完整名称会在手机顶栏挤小字号；已逐波介绍过的终局混编用短名，朗读仍保留全称。
        lineup: enemies.length >= 3
            ? enemies.map(({ id, count }) => `${DENSE_ENEMY_NAMES[id]}${count}`).join(' · ')
            : enemies.map(({ id, count }) => `${SHORT_ENEMY_NAMES[id]}×${count}`).join(' · '),
        tactic: waveThreatHint(wave),
        accessibleLineup: waveLineup(wave),
    };
}

/** 顶栏事件行只提示当前开波与先头单位；完整编队留在波前预告，避免三类混编挤进资源槽。 */
export function waveStartStatus(wave: WaveDefinition): string {
    const first = wave.groups[0];
    return wave.groups.length > 1
        ? `第 ${wave.wave} 波 · ${first.enemy.label}先行，后续混编来袭`
        : `第 ${wave.wave} 波 · ${first.enemy.label}×${first.count}进场`;
}

export function waveThreatHint(wave: WaveDefinition): string {
    const ids = new Set(wave.groups.map(({ enemy }) => enemy.id));
    if (ids.has('iron-canister-hauler') && ids.has('clockwork-runner')) return '疾行控速 · 重装集火';
    if (ids.has('iron-canister-hauler')) return '冷凝拖慢 · 机枪集火';
    return ids.has('clockwork-runner') ? '疾行更快 · 冷凝压速' : '机枪守线 · 留意改路';
}
