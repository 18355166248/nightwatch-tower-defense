/** 只用于结算页声明的图片集合，不负责选择路径或改变结算数据。 */
export function resultAssetNeeded(name: string, kind: 'victory' | 'defeat' | null): boolean {
    if (kind === null) return false;
    if (name === 'victory-badge') return kind === 'victory';
    if (name === 'defeat-badge') return kind === 'defeat';
    // 失败第三栏展示破损徽章，不展示剩余核心爱心；避免加载不可见的图。
    if (name === 'heart-icon') return kind === 'victory';
    return true;
}
