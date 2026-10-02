import { isValid, Node, resources, SpriteFrame } from 'cc';
import { TOWER_HEAD_DIRECTIONS, type TowerHeadDirection } from './EightDirectionTowerAim';
import { VisibleAsyncAsset } from './VisibleAsyncAsset';
import { rivetHeadResourcePath } from './RivetHeadResourcePaths';

interface HeadFrameGroup {
    readonly frames: Map<TowerHeadDirection, SpriteFrame>;
    readonly leases: VisibleAsyncAsset<SpriteFrame>[];
    failed: boolean;
}

/** 资源适配器不持有战斗状态；整组就绪后才替换旧炮头，缺图不发布半套方向。 */
export class EightDirectionTowerFrames {
    private readonly groups = new Map<number, HeadFrameGroup>();
    private disposed = false;

    public constructor(private readonly owner: Node) {}
    public request(level: number = 1): void {
        if (this.groups.has(level) || this.disposed) return;
        if (![1, 2, 3].includes(level)) throw new RangeError('炮头等级必须为1/2/3');
        const group: HeadFrameGroup = {frames: new Map<TowerHeadDirection, SpriteFrame>(), leases: [], failed: false};
        this.groups.set(level, group);
        // 仅已布置等级请求整组；升级资源未齐时保留旧图，不混用半套方向。
        for (const direction of TOWER_HEAD_DIRECTIONS) {
            const lease = new VisibleAsyncAsset<SpriteFrame>(
                complete => resources.load(rivetHeadResourcePath(level, direction), SpriteFrame,
                    (error, frame) => complete(error ? null : frame)),
                frame => { frame.addRef(); }, frame => { frame.decRef(); },
                frame => {
                    // 旧等级退出后，迟到加载不能发布到新组；租约负责成对归还迟到资源。
                    if (this.disposed || this.groups.get(level) !== group || !isValid(this.owner)) return;
                    if (frame) group.frames.set(direction, frame);
                    else { group.frames.delete(direction); group.failed = true; }
                },
            );
            group.leases.push(lease);
            lease.setVisible(true);
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
    /** 调用前必须先换帧/清除精灵绑定；仅保留当前战场仍布置的等级。 */
    public retainLevels(levels: ReadonlySet<number>): void {
        for (const [level, group] of Array.from(this.groups.entries())) {
            if (levels.has(level)) continue;
            this.groups.delete(level);
            for (const lease of group.leases) lease.setVisible(false);
            group.frames.clear();
        }
    }
    public dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        this.retainLevels(new Set());
    }
}
