import { isValid, Node, resources, SpriteFrame } from 'cc';
import { TOWER_HEAD_DIRECTIONS, type TowerHeadDirection } from './EightDirectionTowerAim';

/** 资源适配器不持有战斗状态；整组就绪后才替换旧炮头，缺图不发布半套方向。 */
export class EightDirectionTowerFrames {
    private readonly groups = new Map<number, {frames: Map<TowerHeadDirection, SpriteFrame>; failed: boolean}>();
    private disposed = false;

    public constructor(private readonly owner: Node) {}
    public request(level: number = 1): void {
        if (this.groups.has(level) || this.disposed) return;
        if (![1, 2, 3].includes(level)) throw new RangeError('炮头等级必须为1/2/3');
        const group = {frames: new Map<TowerHeadDirection, SpriteFrame>(), failed: false};
        this.groups.set(level, group);
        const folder = level === 1 ? 'rivet-head-eight-v1' : `rivet-head-eight-level-${level}-v1`;
        // 仅已布置等级请求整组；升级资源未齐时保留旧图，不混用半套方向。
        for (const direction of TOWER_HEAD_DIRECTIONS) {
            resources.load(`level-one/units/${folder}/${direction}/spriteFrame`, SpriteFrame, (error, frame) => {
                if (this.disposed || !isValid(this.owner)) return;
                if (error || !frame) { group.failed = true; return; }
                frame.addRef();
                group.frames.set(direction, frame);
            });
        }
    }
    public get status(): string {
        if (this.disposed) return 'disposed';
        const groups = Array.from(this.groups.values());
        return groups.some(group => group.failed) ? 'unavailable' : groups.length === 0 ? 'idle'
            : groups.every(group => group.frames.size === 8) ? 'ready' : 'loading';
    }
    public frame(direction: TowerHeadDirection, level: number = 1): SpriteFrame | null {
        const group = this.groups.get(level);
        return !this.disposed && group && !group.failed && group.frames.size === 8 ? group.frames.get(direction) ?? null : null;
    }
    public dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        for (const group of this.groups.values()) for (const frame of group.frames.values()) frame.decRef();
        this.groups.clear();
    }
}
