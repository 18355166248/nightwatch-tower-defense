/** 满血单位保留干净轮廓；只有真实受伤后才展示血条，密集敌群不常驻一排横线。 */
export function enemyHealthBarRatio(health: number, maxHealth: number): number | null {
    if (!Number.isFinite(health) || !Number.isFinite(maxHealth) || maxHealth <= 0 || health <= 0 || health >= maxHealth) return null;
    return health / maxHealth;
}
