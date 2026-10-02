/** 只裁水平透明留白；保留原高度、字号和 CLAMP 上限，不改变文字基线。 */
export function compactTextWidth(text: string, maximum: number, measure: (line: string) => number): number {
    let measured = 0;
    for (const line of text.split('\n')) {
        let width: number;
        try {
            width = measure(line);
        } catch {
            return maximum;
        }
        // 字体或测量能力异常时回退原尺寸，不能把可见文字裁掉。
        if (!Number.isFinite(width) || width < 0) return maximum;
        measured = Math.max(measured, width);
    }
    // 两侧留抗锯齿余量；偶数宽度保留居中节点的半像素相位。
    return Math.min(maximum, Math.ceil((measured + 4) / 2) * 2);
}
