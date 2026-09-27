interface KeyValueStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}

interface BestTimeSaveV1 {
    readonly version: 1;
    readonly bestSeconds: number;
}

const PLAYER_KEY = 'nightwatch:first-level:best-time:player:v1';
const QA_KEY = 'nightwatch:first-level:best-time:qa:v1';

function browserStorage(): KeyValueStorage | null {
    try {
        return typeof window === 'undefined' ? null : window.localStorage;
    } catch {
        return null;
    }
}

/** 本机纪录只存版本化的标量；浏览器拒绝存储时仍保留本次会话纪录。 */
export class FirstLevelBestTimeStore {
    private best: number | null;

    public constructor(
        private readonly qaMode: boolean,
        private readonly storageProvider: () => KeyValueStorage | null = browserStorage,
    ) {
        this.best = this.load();
    }

    public get bestSeconds(): number | null {
        return this.best;
    }

    public recordVictory(seconds: number): boolean {
        if (!Number.isFinite(seconds) || seconds <= 0) throw new RangeError('通关时间必须大于零');
        // 固定步进累加会留下浮点尾差；纪录统一到毫秒，避免同一成绩反复触发“新纪录”。
        const rounded = Math.max(0.001, Math.round(seconds * 1000) / 1000);
        if (this.best !== null && rounded >= this.best) return false;
        this.best = rounded;
        const value: BestTimeSaveV1 = { version: 1, bestSeconds: rounded };
        try {
            // localStorage 的单键 setItem 是原子替换；失败时不擦掉旧纪录。
            this.storageProvider()?.setItem(this.key, JSON.stringify(value));
        } catch {
            // 禁用存储、隐私模式配额和权限异常都只降级为会话内纪录。
        }
        return true;
    }

    private get key(): string {
        return this.qaMode ? QA_KEY : PLAYER_KEY;
    }

    private load(): number | null {
        try {
            const raw = this.storageProvider()?.getItem(this.key);
            if (!raw) return null;
            const value: unknown = JSON.parse(raw);
            if (typeof value !== 'object' || value === null) return null;
            const save = value as Partial<BestTimeSaveV1>;
            return save.version === 1 && typeof save.bestSeconds === 'number'
                && Number.isFinite(save.bestSeconds) && save.bestSeconds > 0
                ? Math.max(0.001, Math.round(save.bestSeconds * 1000) / 1000) : null;
        } catch {
            return null;
        }
    }
}
