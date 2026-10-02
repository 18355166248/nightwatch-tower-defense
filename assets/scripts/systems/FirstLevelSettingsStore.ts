interface KeyValueStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}

export interface FirstLevelSettings {
    readonly version: 1;
    readonly soundEnabled: boolean;
    readonly volumeStep: 1 | 2 | 3 | 4;
    readonly reducedMotion: boolean;
}

export const DEFAULT_FIRST_LEVEL_SETTINGS: FirstLevelSettings = {
    version: 1, soundEnabled: true, volumeStep: 4, reducedMotion: false,
};

const PLAYER_KEY = 'nightwatch:first-level:settings:player:v1';
const QA_KEY = 'nightwatch:first-level:settings:qa:v1';

function browserStorage(): KeyValueStorage | null {
    try {
        return typeof window === 'undefined' ? null : window.localStorage;
    } catch {
        return null;
    }
}

function parseSettings(raw: string | null): FirstLevelSettings | null {
    if (!raw) return null;
    try {
        const value: unknown = JSON.parse(raw);
        if (typeof value !== 'object' || value === null) return null;
        const settings = value as Partial<FirstLevelSettings>;
        if (settings.version !== 1 || typeof settings.soundEnabled !== 'boolean'
            || !Number.isInteger(settings.volumeStep) || (settings.volumeStep ?? 0) < 1 || (settings.volumeStep ?? 0) > 4
            || typeof settings.reducedMotion !== 'boolean') return null;
        return { version: 1, soundEnabled: settings.soundEnabled, volumeStep: settings.volumeStep as 1 | 2 | 3 | 4,
            reducedMotion: settings.reducedMotion };
    } catch {
        return null;
    }
}

/** 设置只存版本化标量；主键损坏读备份，存储不可用则本局继续使用内存态。 */
export class FirstLevelSettingsStore {
    private current: FirstLevelSettings;

    public constructor(
        private readonly qaMode: boolean,
        private readonly storageProvider: () => KeyValueStorage | null = browserStorage,
    ) {
        this.current = this.load();
    }

    public get snapshot(): FirstLevelSettings {
        return this.current;
    }

    public toggleSound(): FirstLevelSettings {
        return this.commit({ ...this.current, soundEnabled: !this.current.soundEnabled });
    }

    public cycleVolume(): FirstLevelSettings {
        const next = this.current.volumeStep === 4 ? 1 : this.current.volumeStep + 1;
        return this.commit({ ...this.current, volumeStep: next as 1 | 2 | 3 | 4, soundEnabled: true });
    }

    public toggleReducedMotion(): FirstLevelSettings {
        return this.commit({ ...this.current, reducedMotion: !this.current.reducedMotion });
    }

    public setSoundEnabled(enabled: boolean): FirstLevelSettings {
        return enabled === this.current.soundEnabled ? this.current : this.commit({ ...this.current, soundEnabled: enabled });
    }

    public setVolumeStep(step: 1 | 2 | 3 | 4): FirstLevelSettings {
        if (!Number.isInteger(step) || step < 1 || step > 4) throw new RangeError('音量档位必须在1到4之间');
        // 调整音量不擅自取消静音，声音开关与音量偏好是两个独立状态。
        return step === this.current.volumeStep ? this.current : this.commit({ ...this.current, volumeStep: step });
    }

    public setReducedMotion(reducedMotion: boolean): FirstLevelSettings {
        return reducedMotion === this.current.reducedMotion ? this.current : this.commit({ ...this.current, reducedMotion });
    }

    private get key(): string {
        return this.qaMode ? QA_KEY : PLAYER_KEY;
    }

    private load(): FirstLevelSettings {
        try {
            const storage = this.storageProvider();
            return parseSettings(storage?.getItem(this.key) ?? null)
                ?? parseSettings(storage?.getItem(`${this.key}:backup`) ?? null)
                ?? DEFAULT_FIRST_LEVEL_SETTINGS;
        } catch {
            return DEFAULT_FIRST_LEVEL_SETTINGS;
        }
    }

    private commit(next: FirstLevelSettings): FirstLevelSettings {
        this.current = next;
        try {
            const storage = this.storageProvider();
            if (storage) {
                // localStorage 单键写入原子替换；先写同版本备份，主键失败也有可恢复的新值。
                const encoded = JSON.stringify(next);
                storage.setItem(`${this.key}:backup`, encoded);
                storage.setItem(this.key, encoded);
            }
        } catch {
            // 隐私模式和配额异常只降级为会话内偏好，不中断首局。
        }
        return next;
    }
}
