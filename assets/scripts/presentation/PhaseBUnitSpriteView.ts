import { Color, Graphics, isValid, Node, resources, Sprite, SpriteFrame, UIOpacity, UITransform } from 'cc';
import { cellKey, type GridCell } from '../core/GridTypes';
import { PHASE_B_DESIGN_HEIGHT, PHASE_B_DESIGN_WIDTH, PhaseBLayout } from './PhaseBLayout';
import type { PhaseBSceneState } from './PhaseBSceneState';

const UNIT_ASSETS = {
    'rivet-gun': 'level-one/units/rivet-gun/spriteFrame',
    'frost-coil': 'level-one/units/frost-coil/spriteFrame',
    'clockwork-infantry': 'level-one/units/clockwork-infantry/spriteFrame',
} as const;
type UnitArtId = keyof typeof UNIT_ASSETS;

/** 单位切图层只同步视觉节点；全部资源就绪前由 Graphics 保留灰盒兜底。 */
export class PhaseBUnitSpriteView {
    private readonly root = new Node('FirstLevelUnitSprites');
    private readonly towerLayer = new Node('TowerSprites');
    private readonly enemyLayer = new Node('EnemySprites');
    private readonly shopLayer = new Node('ShopSprites');
    private readonly frames = new Map<UnitArtId, SpriteFrame>();
    private readonly towers = new Map<string, Node>();
    private readonly enemies = new Map<string, Node>();
    private readonly layout: PhaseBLayout;
    private readonly preview: Node;

    public constructor(parent: Node, layout: PhaseBLayout) {
        this.layout = layout;
        this.root.layer = parent.layer;
        this.root.addComponent(UITransform).setContentSize(PHASE_B_DESIGN_WIDTH, PHASE_B_DESIGN_HEIGHT);
        parent.addChild(this.root);
        for (const layer of [this.towerLayer, this.enemyLayer, this.shopLayer]) {
            layer.layer = parent.layer;
            this.root.addChild(layer);
        }
        this.preview = new Node('PlacementSpritePreview');
        this.preview.layer = parent.layer;
        this.preview.addComponent(UITransform).setContentSize(108, 108);
        this.preview.addComponent(Sprite).sizeMode = Sprite.SizeMode.CUSTOM;
        this.preview.addComponent(UIOpacity).opacity = 160;
        this.preview.active = false;
        this.towerLayer.addChild(this.preview);

        for (const [id, resourcePath] of Object.entries(UNIT_ASSETS) as [UnitArtId, string][]) {
            resources.load(resourcePath, SpriteFrame, (error, frame) => {
                if (error || !frame || !isValid(this.root)) return;
                this.frames.set(id, frame);
            });
        }
    }

    public get ready(): boolean {
        return this.frames.size === Object.keys(UNIT_ASSETS).length;
    }

    public render(state: PhaseBSceneState): void {
        this.root.active = this.ready && !state.result;
        if (!this.root.active) return;
        this.renderTowers(state);
        this.renderEnemies(state);
        this.renderPreview(state);
        this.renderShop();
    }

    private renderTowers(state: PhaseBSceneState): void {
        const visible = new Set<string>();
        // Creator 的发布转译对 iterable 展开存在差异，Map 在表现层显式转数组后迭代。
        for (const [key, towerId] of Array.from(state.towerIdsByCell.entries())) {
            const cell = this.cellFromKey(key);
            const frame = this.frames.get(towerId);
            if (!frame) continue;
            const node = this.ensureNode(this.towers, key, this.towerLayer, frame, 108);
            const point = this.layout.gridPointCenter(cell, state.grid);
            node.setPosition(point.x, point.y + 3, 0);
            visible.add(key);
        }
        this.removeMissing(this.towers, visible);
    }

    private renderEnemies(state: PhaseBSceneState): void {
        const visible = new Set<string>();
        const frame = this.frames.get('clockwork-infantry');
        if (!frame) return;
        for (const enemy of state.enemies) {
            const node = this.ensureNode(this.enemies, enemy.id, this.enemyLayer, frame, 88);
            this.renderEnemyIndicators(node, enemy);
            const from = this.layout.gridPointCenter(enemy.fromCell, state.grid);
            const to = this.layout.gridPointCenter(enemy.toCell, state.grid);
            const x = from.x + (to.x - from.x) * enemy.progress;
            const y = from.y + (to.y - from.y) * enemy.progress;
            node.setPosition(x, y, 0);
            visible.add(enemy.id);
        }
        this.removeMissing(this.enemies, visible);
    }

    private renderEnemyIndicators(node: Node, enemy: PhaseBSceneState['enemies'][number]): void {
        let indicators = node.getChildByName('CombatIndicators')?.getComponent(Graphics);
        if (!indicators) {
            const child = new Node('CombatIndicators');
            child.layer = this.root.layer;
            child.addComponent(UITransform).setContentSize(100, 100);
            indicators = child.addComponent(Graphics);
            node.addChild(child);
        }
        indicators.clear();
        // 切图在战场 Graphics 之上，血量和减速提示也必须跟随敌人节点绘制在切图之上。
        if (enemy.slowRemainingSeconds > 0) {
            indicators.strokeColor = new Color('#8BE8F4');
            indicators.lineWidth = 5;
            indicators.circle(0, 0, 34);
            indicators.stroke();
        }
        const width = 52;
        indicators.fillColor = new Color('#35262C');
        indicators.rect(-width / 2, 48, width, 7);
        indicators.fill();
        indicators.fillColor = new Color('#69D391');
        indicators.rect(-width / 2, 48, width * Math.max(0, enemy.health / enemy.archetype.maxHealth), 7);
        indicators.fill();
    }

    private renderPreview(state: PhaseBSceneState): void {
        const selected = state.preview;
        this.preview.active = Boolean(selected);
        if (!selected) return;
        const sprite = this.preview.getComponent(Sprite);
        if (sprite) sprite.spriteFrame = this.frames.get(selected.towerId) ?? null;
        const point = this.layout.gridPointCenter(selected.cell, state.grid);
        this.preview.setPosition(point.x, point.y + 3, 0);
    }

    private renderShop(): void {
        for (const [towerId, x] of [['rivet-gun', -89], ['frost-coil', 89]] as const) {
            const frame = this.frames.get(towerId);
            if (!frame) continue;
            const node = this.ensureNode(this.towers, `shop:${towerId}`, this.shopLayer, frame, 86);
            node.setPosition(x, -776, 0);
        }
    }

    private ensureNode(nodes: Map<string, Node>, key: string, layer: Node, frame: SpriteFrame, size: number): Node {
        const existing = nodes.get(key);
        if (existing) return existing;
        const node = new Node(key);
        node.layer = this.root.layer;
        const transform = node.addComponent(UITransform);
        const sprite = node.addComponent(Sprite);
        sprite.spriteFrame = frame;
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        transform.setContentSize(size, size);
        layer.addChild(node);
        nodes.set(key, node);
        return node;
    }

    private removeMissing(nodes: Map<string, Node>, visible: ReadonlySet<string>): void {
        for (const [key, node] of Array.from(nodes.entries())) {
            if (key.startsWith('shop:') || visible.has(key)) continue;
            node.destroy();
            nodes.delete(key);
        }
    }

    private cellFromKey(key: string): GridCell {
        const [column, row] = key.split(',').map(Number);
        return { column, row };
    }
}
