/** 常驻几何级标不依赖攻击动画或颜色，暂停/静音/减少动态时仍能辨认冷凝等级。 */
export function towerVisualRank(level: number) {
    const rank = Math.min(3, Math.max(1, Math.floor(level)));
    return { rank, fins: rank - 1, coreScale: 1 + (rank - 1) * 0.12,
        color: ['#8ACCD4', '#8EEDFF', '#D9FAFF'][rank - 1] };
}
