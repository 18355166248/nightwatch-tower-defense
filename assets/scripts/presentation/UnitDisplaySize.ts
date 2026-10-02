/** 只调整 Sprite 的显示画布，逻辑格、索敌、射程与触控命中仍由战斗系统和 PhaseBLayout 决定。 */
export function towerDisplaySize(cellSize: number): number {
    return Math.min(88, cellSize * 0.98);
}

export function enemyDisplaySize(cellSize: number, heavy: boolean, fitToCell = false): number {
    // 小怪原图留有透明画布，略放大主体；重装原本已接近满格，只微调避免密集群相互遮住。
    // 极窄屏显式按格收敛，不能硬撑92画布；常规屏与既有QA网格保持原尺寸策略。
    return heavy ? fitToCell ? Math.min(98, cellSize * 1.12) : Math.max(92, Math.min(98, cellSize * 1.12))
        : Math.min(90, cellSize * 1.06);
}
