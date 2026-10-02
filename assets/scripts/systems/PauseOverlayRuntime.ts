export type PauseReason = 'user' | 'lifecycle' | 'orientation' | 'route-error';
export type PauseScreen = 'menu' | 'settings' | 'confirm-restart' | 'confirm-home' | 'route-error';

export interface PauseOverlaySnapshot {
    readonly visible: boolean;
    readonly screen: PauseScreen;
    readonly reason: PauseReason | null;
    readonly canContinue: boolean;
    readonly lifecycleRecovery: boolean;
}

/** 暂停原因可叠加；后台原因解除后仍等待玩家显式继续。 */
export class PauseOverlayRuntime {
    private readonly reasons = new Set<PauseReason>();
    private needsContinue = false;
    private hidden = false;
    private lifecycleRecovery = false;
    private currentScreen: PauseScreen = 'menu';

    public get snapshot(): PauseOverlaySnapshot {
        return {
            visible: this.needsContinue,
            screen: this.currentScreen,
            reason: this.reasons.has('route-error') ? 'route-error' : this.reasons.has('lifecycle') ? 'lifecycle'
                : this.reasons.has('orientation') ? 'orientation' : this.reasons.has('user') ? 'user' : null,
            canContinue: this.needsContinue && !this.hidden
                && !this.reasons.has('lifecycle') && !this.reasons.has('orientation') && !this.reasons.has('route-error'),
            lifecycleRecovery: this.lifecycleRecovery,
        };
    }

    public hasReason(reason: PauseReason): boolean {
        return this.reasons.has(reason);
    }

    public enterRouteError(): void {
        this.needsContinue = true;
        this.reasons.add('route-error');
        this.currentScreen = 'route-error';
    }

    public enterUser(): boolean {
        const first = !this.needsContinue;
        this.needsContinue = true;
        this.reasons.add('user');
        this.currentScreen = this.reasons.has('route-error') ? 'route-error' : 'menu';
        return first;
    }

    public enterLifecycle(): boolean {
        const first = !this.needsContinue;
        this.needsContinue = true;
        this.hidden = true;
        this.lifecycleRecovery = true;
        this.reasons.add('lifecycle');
        this.currentScreen = this.reasons.has('route-error') ? 'route-error' : 'menu';
        return first;
    }

    public leaveLifecycle(): void {
        this.hidden = false;
        this.reasons.delete('lifecycle');
        // 返回后保留恢复来源供UI解释，但不将它作为阻塞原因；只有显式继续/清局才清掉。
        // 后台解除只消除阻塞来源；needsContinue 保留到玩家点继续。
    }

    public enterOrientation(): boolean {
        const first = !this.needsContinue;
        this.needsContinue = true;
        this.reasons.add('orientation');
        this.currentScreen = this.reasons.has('route-error') ? 'route-error' : 'menu';
        return first;
    }

    public leaveOrientation(): void {
        this.reasons.delete('orientation');
        // 转回竖屏不能自动续战；仍需玩家主动按“继续”。
    }

    public show(screen: PauseScreen): void {
        if (this.needsContinue) this.currentScreen = this.reasons.has('route-error') ? 'route-error' : screen;
    }

    public continue(): boolean {
        if (!this.needsContinue || this.hidden || this.reasons.has('lifecycle') || this.reasons.has('orientation') || this.reasons.has('route-error')) return false;
        this.reasons.delete('user');
        if (this.reasons.size > 0) return false;
        this.clear();
        return true;
    }

    public clear(): void {
        this.reasons.clear();
        this.needsContinue = false;
        this.hidden = false;
        this.lifecycleRecovery = false;
        this.currentScreen = 'menu';
    }
}
