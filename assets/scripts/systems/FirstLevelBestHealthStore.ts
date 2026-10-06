import { browserRecordStorage, loadFirstLevelRecord, saveFirstLevelRecord, type FirstLevelRecordStorage } from './FirstLevelRecordStorage';

interface BestHealthSaveV1 {
    readonly version: 1;
    readonly bestRemainingHealth: number;
}

const PLAYER_KEY = 'nightwatch:first-level:best-health:player:v1';
const QA_KEY = 'nightwatch:first-level:best-health:qa:v1';
// 历史纪录属于标准首关；QA 低生命夹具不得改变它的分母和有效范围。
export const FIRST_LEVEL_RECORD_CORE_CAPACITY = 10;

/** 只记录胜利时的剩余核心；失败、重试和战斗中受损都不得刷新纪录。 */
export class FirstLevelBestHealthStore {
    private best: number | null;

    public constructor(
        private readonly qaMode: boolean,
        private readonly storageProvider: () => FirstLevelRecordStorage | null = browserRecordStorage,
        private readonly recordScope = 'first-level',
    ) {
        this.best = this.load();
    }

    public get bestRemainingHealth(): number | null {
        return this.best;
    }

    public recordVictory(remainingHealth: number): boolean {
        if (!Number.isInteger(remainingHealth) || remainingHealth < 1 || remainingHealth > FIRST_LEVEL_RECORD_CORE_CAPACITY) {
            throw new RangeError('胜利剩余核心必须是 1～10 的整数');
        }
        if (this.best !== null && remainingHealth <= this.best) return false;
        this.best = remainingHealth;
        saveFirstLevelRecord(this.key, { version: 1, bestRemainingHealth: remainingHealth } satisfies BestHealthSaveV1, this.storageProvider);
        return true;
    }

    private get key(): string {
        // 不同关卡的成绩不能覆盖首关；保留既有首关键以兼容本机历史纪录。
        return (this.qaMode ? QA_KEY : PLAYER_KEY).replace('first-level', this.recordScope);
    }

    private load(): number | null {
        return loadFirstLevelRecord(this.key, (value) => {
            if (typeof value !== 'object' || value === null) return null;
            const save = value as Partial<BestHealthSaveV1>;
            return save.version === 1 && typeof save.bestRemainingHealth === 'number'
                && Number.isInteger(save.bestRemainingHealth)
                && save.bestRemainingHealth >= 1 && save.bestRemainingHealth <= FIRST_LEVEL_RECORD_CORE_CAPACITY
                ? save.bestRemainingHealth : null;
        }, this.storageProvider);
    }
}
