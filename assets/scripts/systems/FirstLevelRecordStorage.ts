export interface FirstLevelRecordStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}

export function browserRecordStorage(): FirstLevelRecordStorage | null {
    try {
        return typeof window === 'undefined' ? null : window.localStorage;
    } catch {
        return null;
    }
}

/** 浏览器单键写入是原子的；主值读取失败再读独立备份，不让坏存档阻断首关。 */
export function loadFirstLevelRecord<T>(
    key: string,
    parse: (value: unknown) => T | null,
    storageProvider: () => FirstLevelRecordStorage | null,
): T | null {
    let storage: FirstLevelRecordStorage | null;
    try {
        storage = storageProvider();
    } catch {
        return null;
    }
    if (!storage) return null;
    for (const recordKey of [key, `${key}:backup`]) {
        try {
            const raw = storage.getItem(recordKey);
            if (!raw) continue;
            const parsed = parse(JSON.parse(raw));
            if (parsed !== null) return parsed;
        } catch {
            // 单个键可能损坏或读不到；继续尝试备份。
        }
    }
    return null;
}

export function saveFirstLevelRecord<T>(
    key: string,
    value: T,
    storageProvider: () => FirstLevelRecordStorage | null,
): void {
    try {
        const storage = storageProvider();
        if (!storage) return;
        const encoded = JSON.stringify(value);
        // 先提交主值；若后续备份写失败，新纪录仍可在刷新后读取。
        storage.setItem(key, encoded);
        storage.setItem(`${key}:backup`, encoded);
    } catch {
        // 无存储权限或配额不足时，Store 自身仍保留会话内纪录。
    }
}
