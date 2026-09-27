export type PauseReason = 'user' | 'lifecycle';
export type PauseScreen = 'menu' | 'settings' | 'confirm-restart' | 'confirm-home';

export interface PauseOverlaySnapshot {
    readonly visible: boolean;
    readonly screen: PauseScreen;
    readonly reason: PauseReason | null;
    readonly canContinue: boolean;
}

/** 暂停原因可叠加；后台原因解除后仍等待玩家显式继续。 */
export class PauseOverlayRuntime {
    private readonly reasons = new Set<PauseReason>();
    private needsContinue = false;
    private hidden = false;
    private currentScreen: PauseScreen = 'menu';

    public get snapshot(): PauseOverlaySnapshot {
        return {
            visible: this.needsContinue,
            screen: this.currentScreen,
            reason: this.reasons.has('lifecycle') ? 'lifecycle' : this.reasons.has('user') ? 'user' : null,
            canContinue: this.needsContinue && !this.hidden && !this.reasons.has('lifecycle'),
        };
    }

    public enterUser(): boolean {
        const first = !this.needsContinue;
        this.needsContinue = true;
        this.reasons.add('user');
        this.currentScreen = 'menu';
        return first;
    }

    public enterLifecycle(): boolean {
        const first = !this.needsContinue;
        this.needsContinue = true;
        this.hidden = true;
        this.reasons.add('lifecycle');
        this.currentScreen = 'menu';
        return first;
    }

    public leaveLifecycle(): void {
        this.hidden = false;
        this.reasons.delete('lifecycle');
        // 后台解除只消除阻塞来源；needsContinue 保留到玩家点继续。
    }

    public show(screen: PauseScreen): void {
        if (this.needsContinue) this.currentScreen = screen;
    }

    public continue(): boolean {
        if (!this.needsContinue || this.hidden || this.reasons.has('lifecycle')) return false;
        this.reasons.delete('user');
        if (this.reasons.size > 0) return false;
        this.clear();
        return true;
    }

    public clear(): void {
        this.reasons.clear();
        this.needsContinue = false;
        this.hidden = false;
        this.currentScreen = 'menu';
    }
}
