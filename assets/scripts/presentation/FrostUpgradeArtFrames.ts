import { isValid, Node, resources, SpriteFrame } from 'cc';
import { FROST_UPGRADE_PATHS, type FrostUpgradeLevel, type TowerLayerPair } from './FrostUpgradeArt';
import { VisibleAsyncAsset } from './VisibleAsyncAsset';

interface LayerGroup { base: SpriteFrame | null; active: SpriteFrame | null; failed: boolean }

/** 两级共四张128图预载，复用异步资源租约；只发布完整等级，加载失败不阻断玩法。 */
export class FrostUpgradeArtFrames {
    private readonly groups = new Map<FrostUpgradeLevel, LayerGroup>();
    private readonly leases: VisibleAsyncAsset<SpriteFrame>[] = [];
    private disposed = false;
    public constructor(owner: Node) {
        for (const level of [2, 3] as const) {
            const group: LayerGroup = { base: null, active: null, failed: false };
            this.groups.set(level, group);
            for (const part of ['base', 'active'] as const) {
                const lease = new VisibleAsyncAsset<SpriteFrame>(
                    complete => resources.load(FROST_UPGRADE_PATHS[level][part], SpriteFrame, (error, frame) => complete(error ? null : frame)),
                    frame => { frame.addRef(); }, frame => { frame.decRef(); },
                    frame => {
                        // 销毁后的迟到结果由租约归还；不能回填旧节点或发布半套配准资源。
                        if (this.disposed || !isValid(owner)) return;
                        group[part] = frame;
                        if (!frame) group.failed = true;
                    },
                );
                this.leases.push(lease); lease.setVisible(true);
            }
        }
    }
    public pair(level: number): TowerLayerPair<SpriteFrame> | null {
        const group = this.groups.get(level as FrostUpgradeLevel);
        return !this.disposed && group && !group.failed && group.base && group.active
            ? { base: group.base, active: group.active } : null;
    }
    public get status(): string {
        if (this.disposed) return 'disposed';
        const groups = Array.from(this.groups.values());
        return groups.some(group => group.failed) ? 'unavailable' : groups.every(group => group.base && group.active) ? 'ready' : 'loading';
    }
    /** 调用前先清除Sprite绑定，避免归还租约时仍有渲染节点引用。 */
    public dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        for (const lease of this.leases) lease.setVisible(false);
        this.groups.clear(); this.leases.length = 0;
    }
}
