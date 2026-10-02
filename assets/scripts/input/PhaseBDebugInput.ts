import { EventKeyboard, input, Input, KeyCode } from 'cc';

export type PhaseBDebugAction = 'reset' | 'apply-short' | 'apply-long' | 'apply-failure'
    | 'apply-mixed' | 'apply-guided-opening' | 'apply-guided-purchases' | 'select-rivet' | 'select-frost'
    | 'toggle-battle' | 'toggle-speed' | 'start-next-wave' | 'restart-run' | 'inject-route-fault'
    | 'enter-background' | 'leave-background';

/**
 * 浏览器灰盒的键盘适配层。这里只把物理按键翻译成动作，不依赖关卡或战斗实现。
 */
export class PhaseBDebugInput {
    private attached = false;

    public constructor(private readonly dispatch: (action: PhaseBDebugAction) => void) {}

    public attach(): void {
        if (this.attached) return;
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        this.attached = true;
    }

    public detach(): void {
        if (!this.attached) return;
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        this.attached = false;
    }

    private onKeyDown(event: EventKeyboard): void {
        if (event.keyCode === KeyCode.KEY_R) this.dispatch('reset');
        else if (event.keyCode === KeyCode.KEY_F) this.dispatch('apply-short');
        else if (event.keyCode === KeyCode.KEY_G) this.dispatch('apply-long');
        else if (event.keyCode === KeyCode.KEY_H) this.dispatch('apply-failure');
        else if (event.keyCode === KeyCode.KEY_J) this.dispatch('apply-mixed');
        else if (event.keyCode === KeyCode.KEY_A) this.dispatch('apply-guided-opening');
        else if (event.keyCode === KeyCode.KEY_B) this.dispatch('apply-guided-purchases');
        else if (event.keyCode === KeyCode.KEY_Q) this.dispatch('select-rivet');
        else if (event.keyCode === KeyCode.KEY_W) this.dispatch('select-frost');
        else if (event.keyCode === KeyCode.KEY_X) this.dispatch('toggle-speed');
        else if (event.keyCode === KeyCode.KEY_N) this.dispatch('start-next-wave');
        else if (event.keyCode === KeyCode.KEY_K) this.dispatch('inject-route-fault');
        else if (event.keyCode === KeyCode.KEY_L) this.dispatch('enter-background');
        else if (event.keyCode === KeyCode.KEY_O) this.dispatch('leave-background');
        else if (event.keyCode === KeyCode.ENTER) this.dispatch('restart-run');
        else if (event.keyCode === KeyCode.SPACE) this.dispatch('toggle-battle');
    }
}
