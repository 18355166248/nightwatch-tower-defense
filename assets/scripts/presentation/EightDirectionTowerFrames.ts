import { isValid, Node, resources, SpriteFrame } from 'cc';
import { TOWER_HEAD_DIRECTIONS, type TowerHeadDirection } from './EightDirectionTowerAim';

/** 资源适配器不持有战斗状态；整组就绪后才替换旧炮头，缺图不发布半套方向。 */
export class EightDirectionTowerFrames {
    private readonly frames = new Map<TowerHeadDirection, SpriteFrame>();
    private started = false;
    private disposed = false;
    private failed = false;

    public constructor(private readonly owner: Node) {}
    public request(): void {
        if (this.started || this.disposed) return;
        this.started = true;
        for (const direction of TOWER_HEAD_DIRECTIONS) {
            resources.load(`level-one/units/rivet-head-eight-v1/${direction}/spriteFrame`, SpriteFrame, (error, frame) => {
                if (this.disposed || !isValid(this.owner)) return;
                if (error || !frame) { this.failed = true; return; }
                frame.addRef();
                this.frames.set(direction, frame);
            });
        }
    }
    public get status(): string {
        return this.disposed ? 'disposed' : this.failed ? 'unavailable' : this.frames.size === 8 ? 'ready' : this.started ? 'loading' : 'idle';
    }
    public frame(direction: TowerHeadDirection): SpriteFrame | null {
        return this.status === 'ready' ? this.frames.get(direction) ?? null : null;
    }
    public dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        for (const frame of this.frames.values()) frame.decRef();
        this.frames.clear();
    }
}
