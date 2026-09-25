import type { WaveDefinition } from '../config/PhaseBCombatConfig';

/** 波次文案只读取配置；增删敌人种类不必修改战斗或 HUD 的统计逻辑。 */
export function waveLineup(wave: WaveDefinition): string {
    const counts = new Map<string, number>();
    for (const group of wave.groups) {
        counts.set(group.enemy.label, (counts.get(group.enemy.label) ?? 0) + group.count);
    }
    return Array.from(counts, ([label, count]) => `${label}×${count}`).join(' · ');
}

export function waveThreatHint(wave: WaveDefinition): string | null {
    const runners = wave.groups
        .filter(({ enemy }) => enemy.id === 'clockwork-runner')
        .reduce((sum, group) => sum + group.count, 0);
    return runners > 0 ? `下波疾行机×${runners}：冷凝塔能压速` : null;
}
