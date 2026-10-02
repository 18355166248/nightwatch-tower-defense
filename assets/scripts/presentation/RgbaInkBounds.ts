export interface InkBounds {
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
    readonly rgbaBytes: number;
}

/** 只统计alpha非零像素，连最浅的抗锯齿也保留；这是面积诊断，不是可释放GFX量。 */
export function rgbaInkBounds(data: ArrayLike<number>, width: number, height: number, alphaFloor = 0): InkBounds | null {
    if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0
        || !Number.isSafeInteger(width * height * 4) || data.length !== width * height * 4
        || !Number.isInteger(alphaFloor) || alphaFloor < 0 || alphaFloor > 255) return null;
    let left = width, top = height, right = -1, bottom = -1;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        if (data[(y * width + x) * 4 + 3] <= alphaFloor) continue;
        left = Math.min(left, x); right = Math.max(right, x);
        top = Math.min(top, y); bottom = Math.max(bottom, y);
    }
    if (right < 0) return { left: 0, top: 0, width: 0, height: 0, rgbaBytes: 0 };
    const inkWidth = right - left + 1, inkHeight = bottom - top + 1;
    return { left, top, width: inkWidth, height: inkHeight, rgbaBytes: inkWidth * inkHeight * 4 };
}
