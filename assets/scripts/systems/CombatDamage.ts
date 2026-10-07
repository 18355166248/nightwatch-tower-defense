import type { EnemyArchetype, TowerArchetype } from '../config/PhaseBCombatConfig';

export interface DamageResult {
    readonly shieldDamage: number;
    readonly healthDamage: number;
    readonly shieldBroken: boolean;
}

/** 护盾先消耗对应的原始伤害，剩余伤害再过护甲；不能把破盾伤害重复扣到生命上。 */
export function resolveCombatDamage(health: number, shield: number,
    enemy: Pick<EnemyArchetype, 'armorReduction'>,
    tower: Pick<TowerArchetype, 'damage' | 'armorIgnore' | 'shieldDamageMultiplier'>): DamageResult {
    const multiplier = tower.shieldDamageMultiplier ?? 1;
    if (!Number.isFinite(multiplier) || multiplier <= 0) throw new RangeError('护盾伤害倍率须大于零');
    const shieldDamage = Math.min(Math.max(0, shield), tower.damage * multiplier);
    const remainingRaw = Math.max(0, tower.damage - shieldDamage / multiplier);
    const armor = Math.max(0, Math.min(1, enemy.armorReduction ?? 0));
    const ignore = Math.max(0, Math.min(1, tower.armorIgnore ?? 0));
    return { shieldDamage, healthDamage: Math.min(Math.max(0, health), remainingRaw * (1 - armor * (1 - ignore))),
        shieldBroken: shield > 0 && shieldDamage >= shield };
}
