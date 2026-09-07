import type { WaveDefinition } from '../config/PhaseBCombatConfig';

/** 校验并索引关卡波次，避免运行中依赖数组下标或静默跳波。 */
export class WaveCatalog {
    private readonly byNumber = new Map<number, WaveDefinition>();

    public constructor(waves: readonly WaveDefinition[]) {
        if (waves.length === 0) throw new Error('波次目录不能为空');
        for (let index = 0; index < waves.length; index += 1) {
            const wave = waves[index];
            const expected = index + 1;
            if (wave.wave !== expected) throw new Error(`波次必须从 1 连续编号，期望 ${expected}，实际 ${wave.wave}`);
            if (wave.groups.length === 0) throw new Error(`第 ${wave.wave} 波缺少敌人分组`);
            this.byNumber.set(wave.wave, wave);
        }
    }

    public get totalWaves(): number {
        return this.byNumber.size;
    }

    public get(wave: number): WaveDefinition {
        const definition = this.byNumber.get(wave);
        if (!definition) throw new RangeError(`不存在第 ${wave} 波配置`);
        return definition;
    }
}
