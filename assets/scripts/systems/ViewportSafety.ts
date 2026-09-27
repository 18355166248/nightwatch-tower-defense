export interface ViewportSafetyFrame {
    readonly width: number;
    readonly height: number;
    readonly coarsePointer: boolean;
}

/** 桌面横屏是正常开发视口；只拦截触控设备的横向游戏视口。 */
export function isCoarseLandscape(frame: ViewportSafetyFrame): boolean {
    return frame.coarsePointer && Number.isFinite(frame.width) && Number.isFinite(frame.height)
        && frame.width > 0 && frame.height > 0 && frame.width > frame.height;
}
