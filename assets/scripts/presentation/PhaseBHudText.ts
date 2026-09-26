/** 金币已有独立数值卡片，事件行只保留发生了什么，避免短屏顶部重复挤字。 */
export function hudEventText(statusText: string): string {
    return statusText.replace(/\s*·\s*(?:剩余)?金币\s*\d+\s*$/, '');
}

/** 击杀金币已逐只入账；这里只汇总本波所得，不重复发钱。 */
export function waveClearIncomeText(wave: number, killGold: number, clearGold: number): string {
    return `第 ${wave} 波守住 · 本波 +${killGold + clearGold}（清场 +${clearGold}）`;
}
