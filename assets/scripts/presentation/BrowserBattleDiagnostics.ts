export interface BrowserBattleDiagnosticsState {
    readonly entryMode: string;
    readonly gridId: string;
    readonly columns: number;
    readonly rows: number;
    readonly gold: number;
    readonly mapVersion: number;
    readonly towerCount: number;
    readonly rivetTowerCount: number;
    readonly frostTowerCount: number;
    readonly selectedTowerId: string;
    readonly inspectedTowerCell: string | null;
    readonly slowedEnemyCount: number;
    readonly waveRewardTotal: number;
    readonly pathLength: number;
    readonly pathDelta: number;
    readonly phase: string;
    readonly wave: number;
    readonly totalWaves: number;
    readonly countdownSeconds: number;
    readonly speedMultiplier: number;
    readonly soundEnabled: boolean;
    readonly soundReady: boolean;
    readonly canStartNextWaveEarly: boolean;
    readonly coreHealth: number;
    readonly activeEnemyCount: number;
    readonly waveSpawnedEnemyCount: number;
    readonly waveTotalEnemyCount: number;
    readonly infantryGaitFrameLoaded: boolean;
    readonly runnerGaitFrameLoaded: boolean;
    readonly spawningCompleted: boolean;
    readonly spawnedEnemyCount: number;
    readonly defeatedEnemyCount: number;
    readonly leakedEnemyCount: number;
    readonly activeFeedbackCount: number;
    readonly resultVisible: boolean;
    readonly retryAvailable: boolean;
    readonly inputMode: string;
    readonly previewAccepted: boolean | null;
    readonly status: string;
}

/** 浏览器 QA 适配层只发布只读状态，不向玩法层暴露跳过输入的修改接口。 */
export class BrowserBattleDiagnostics {
    private publishedDiagnostics = '';

    public publish(state: BrowserBattleDiagnosticsState, ariaLabel: string): void {
        if (typeof document === 'undefined') return;
        const canvas = document.querySelector('canvas');
        if (!canvas) return;
        const diagnostics = JSON.stringify(state);
        if (diagnostics === this.publishedDiagnostics) return;
        canvas.setAttribute('data-phase-a-state', diagnostics);
        canvas.setAttribute('aria-label', ariaLabel);
        this.publishedDiagnostics = diagnostics;
    }
}
