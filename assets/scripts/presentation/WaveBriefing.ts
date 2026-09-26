import type { WaveDefinition } from '../config/PhaseBCombatConfig';

/** 波次文案只读取配置；增删敌人种类不必修改战斗或 HUD 的统计逻辑。 */
export function waveLineup(wave: WaveDefinition): string {
    const counts = new Map<string, number>();
    for (const group of wave.groups) {
        counts.set(group.enemy.label, (counts.get(group.enemy.label) ?? 0) + group.count);
    }
    return Array.from(counts, ([label, count]) => `${label}×${count}`).join(' · ');
}

/** 顶栏事件行只提示当前开波与先头单位；完整编队留在波前预告，避免三类混编挤进资源槽。 */
export function waveStartStatus(wave: WaveDefinition): string {
    const first = wave.groups[0];
    return wave.groups.length > 1
        ? `第 ${wave.wave} 波 · ${first.enemy.label}先行，后续混编来袭`
        : `第 ${wave.wave} 波 · ${first.enemy.label}×${first.count}进场`;
}

export function waveThreatHint(wave: WaveDefinition): string | null {
    const runners = wave.groups
        .filter(({ enemy }) => enemy.id === 'clockwork-runner')
        .reduce((sum, group) => sum + group.count, 0);
    const haulers = wave.groups
        .filter(({ enemy }) => enemy.id === 'iron-canister-hauler')
        .reduce((sum, group) => sum + group.count, 0);
    if (haulers > 0 && runners > 0) return `下波疾行×${runners} + 铁罐×${haulers}：冷凝控快，机枪集火`;
    if (haulers > 0) return `下波铁罐×${haulers}：冷凝拖慢，机枪集火`;
    return runners > 0 ? `下波疾行机×${runners}：冷凝塔能压速` : null;
}
