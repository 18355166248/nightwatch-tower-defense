import { browserRecordStorage, loadFirstLevelRecord, saveFirstLevelRecord, type FirstLevelRecordStorage } from './FirstLevelRecordStorage';

interface BestTimeSaveV2 {
    readonly version: 2;
    readonly bestSeconds: number;
}

// 双段布防改变了可比较的通关时长；旧纪录保留在 v1 键，不迁移也不覆盖。
const PLAYER_KEY = 'nightwatch:first-level:best-time:player:v2';
const QA_KEY = 'nightwatch:first-level:best-time:qa:v2';

/** 本机纪录只存版本化的标量；浏览器拒绝存储时仍保留本次会话纪录。 */
export class FirstLevelBestTimeStore {
    private best: number | null;

    public constructor(
        private readonly qaMode: boolean,
        private readonly storageProvider: () => FirstLevelRecordStorage | null = browserRecordStorage,
        private readonly recordScope = 'first-level',
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
        const value: BestTimeSaveV2 = { version: 2, bestSeconds: rounded };
        saveFirstLevelRecord(this.key, value, this.storageProvider);
        return true;
    }

    private get key(): string {
        // 不同关卡的成绩不能覆盖首关；保留既有首关键以兼容本机历史纪录。
        return (this.qaMode ? QA_KEY : PLAYER_KEY).replace('first-level', this.recordScope);
    }

    private load(): number | null {
        return loadFirstLevelRecord(this.key, (value) => {
            if (typeof value !== 'object' || value === null) return null;
            const save = value as Partial<BestTimeSaveV2>;
            return save.version === 2 && typeof save.bestSeconds === 'number'
                && Number.isFinite(save.bestSeconds) && save.bestSeconds > 0
                ? Math.max(0.001, Math.round(save.bestSeconds * 1000) / 1000) : null;
        }, this.storageProvider);
    }
}
