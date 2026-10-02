export interface TextureRequestTiming {
    readonly name: string;
    readonly encodedBodySize: number;
    readonly transferSize: number;
    readonly responseEnd: number;
}

/** 同源已完成图片请求按实际响应计数，重复请求也计入；未知响应大小不能伪装为0字节通过。 */
export function textureTransferSummary(entries: readonly TextureRequestTiming[], origin: string) {
    let requests = 0, bodyBytes = 0, wireBytes = 0, unknown = 0;
    for (const entry of entries) {
        const url = new URL(entry.name,origin);
        if (!/\.(png|jpe?g|webp)$/i.test(url.pathname) || entry.responseEnd <= 0) continue;
        requests++;
        if (url.origin !== origin || !Number.isSafeInteger(entry.encodedBodySize) || entry.encodedBodySize <= 0
            || !Number.isSafeInteger(entry.transferSize) || entry.transferSize < 0) { unknown++; continue; }
        bodyBytes += entry.encodedBodySize; wireBytes += entry.transferSize;
    }
    return {requests,bodyBytes,wireBytes,unknown,complete:unknown===0 && requests>0};
}

/** 首屏记录在离开首页时封存；后续结算请求不能混入首页预算，也不清空浏览器性能证据。 */
export class BrowserTextureTransferProbe {
    private firstScreen: ReturnType<typeof textureTransferSummary> | null = null;
    private leftHome = false;
    private lastSampleAt = -Infinity;
    private lastHomeVisible = true;
    private snapshot: object = {textureRequestsSupported:false};
    public read(homeVisible: boolean) {
        if (typeof performance === 'undefined' || typeof window === 'undefined') return {textureRequestsSupported:false};
        const now = performance.now();
        // 和GFX探针同样节流；离开首页这一帧必须重采，不能因缓存延迟把结算请求混进首屏。
        if (homeVisible === this.lastHomeVisible && now - this.lastSampleAt < 500) return this.snapshot;
        this.lastHomeVisible = homeVisible; this.lastSampleAt = now;
        const current = textureTransferSummary(performance.getEntriesByType('resource') as PerformanceResourceTiming[],window.location.origin);
        if (!this.leftHome) {this.firstScreen = current; if (!homeVisible) this.leftHome = true;}
        this.snapshot = {textureRequestsSupported:true,textureRequestsCurrent:current,
            textureRequestsFirstScreen:this.firstScreen,textureRequestsFirstScreenFrozen:this.leftHome};
        return this.snapshot;
    }
}
