/** 金币已有独立数值卡片，事件行只保留发生了什么，避免短屏顶部重复挤字。 */
export function hudEventText(statusText: string): string {
    return statusText.replace(/\s*·\s*(?:剩余)?金币\s*\d+\s*$/, '');
}
