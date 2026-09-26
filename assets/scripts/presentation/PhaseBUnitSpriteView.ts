import { Color, Graphics, isValid, Node, resources, Sprite, SpriteFrame, UIOpacity, UITransform } from 'cc';
import { FROST_COIL } from '../config/PhaseBCombatConfig';
import type { GridCell } from '../core/GridTypes';
import { PHASE_B_DESIGN_HEIGHT, PHASE_B_DESIGN_WIDTH, PhaseBLayout } from './PhaseBLayout';
import type { PhaseBSceneState } from './PhaseBSceneState';
import { FROST_COIL_LAYER_SPEC, LayeredTowerRig, RIVET_GUN_LAYER_SPEC, type LayeredTowerSpec } from './LayeredTowerRig';
import { EnemySlowIndicatorView } from './EnemySlowIndicatorView';
import { enemyGaitFrame, enemySlowVisualStrength, enemyStridePose, enemyVisualOffset, frostCorePulsePose, towerRecoilPose } from './UnitVisualMotion';

const UNIT_ASSETS = {
    'rivet-gun': 'level-one/units/rivet-gun/spriteFrame',
    'frost-coil': 'level-one/units/frost-coil/spriteFrame',
    'clockwork-infantry': 'level-one/units/clockwork-infantry/spriteFrame',
    'clockwork-runner': 'level-one/units/clockwork-runner/spriteFrame',
    'iron-canister-hauler': 'level-one/units/iron-canister-hauler/spriteFrame',
} as const;
type UnitArtId = keyof typeof UNIT_ASSETS;
const ENEMY_GAIT_ASSETS = {
    'clockwork-infantry': 'level-one/units/clockwork-infantry-step-b-v2/spriteFrame',
    'clockwork-runner': 'level-one/units/clockwork-runner-step-b-v2/spriteFrame',
} as const;
type EnemyGaitArtId = keyof typeof ENEMY_GAIT_ASSETS;
const TOWER_LAYER_ASSETS = {
    'rivet-gun': {
        base: 'level-one/units/rivet-gun-base-v2/spriteFrame',
        active: 'level-one/units/rivet-gun-head-v2/spriteFrame',
    },
    'frost-coil': {
        base: 'level-one/units/frost-coil-base-v2/spriteFrame',
        active: 'level-one/units/frost-coil-core-v2/spriteFrame',
    },
} as const;
type LayeredTowerId = keyof typeof TOWER_LAYER_ASSETS;

/** 单位切图层只同步视觉节点；全部资源就绪前由 Graphics 保留灰盒兜底。 */
export class PhaseBUnitSpriteView {
    private readonly root = new Node('FirstLevelUnitSprites');
    private readonly towerLayer = new Node('TowerSprites');
    private readonly enemyLayer = new Node('EnemySprites');
    private readonly deathLayer = new Node('DeathSprites');
    private readonly shopLayer = new Node('ShopSprites');
    private readonly frames = new Map<UnitArtId, SpriteFrame>();
    private readonly gaitFrames = new Map<EnemyGaitArtId, SpriteFrame>();
    private readonly towerLayers = new Map<string, SpriteFrame>();
    private readonly towers = new Map<string, Node>();
    private readonly enemies = new Map<string, Node>();
    private readonly deaths = new Map<string, Node>();
    private readonly layout: PhaseBLayout;
    private readonly preview: Node;

    public constructor(parent: Node, layout: PhaseBLayout) {
        this.layout = layout;
        this.root.layer = parent.layer;
        this.root.addComponent(UITransform).setContentSize(PHASE_B_DESIGN_WIDTH, PHASE_B_DESIGN_HEIGHT);
        parent.addChild(this.root);
        for (const layer of [this.towerLayer, this.enemyLayer, this.deathLayer, this.shopLayer]) {
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
        for (const [id, resourcePath] of Object.entries(ENEMY_GAIT_ASSETS) as [EnemyGaitArtId, string][]) {
            resources.load(resourcePath, SpriteFrame, (error, frame) => {
                // 动作帧是可选增强；缺图时敌人始终保留原静态 SpriteFrame。
                if (error || !frame || !isValid(this.root)) return;
                this.gaitFrames.set(id, frame);
            });
        }
        for (const [towerId, paths] of Object.entries(TOWER_LAYER_ASSETS) as [LayeredTowerId, { base: string; active: string }][]) {
            for (const [part, resourcePath] of Object.entries(paths) as ['base' | 'active', string][]) {
                resources.load(resourcePath, SpriteFrame, (error, frame) => {
                    if (error || !frame || !isValid(this.root)) return;
                    this.towerLayers.set(`${towerId}:${part}`, frame);
                });
            }
        }
    }

    public get ready(): boolean {
        return this.frames.size === Object.keys(UNIT_ASSETS).length;
    }

    public hasGaitFrame(id: EnemyGaitArtId): boolean {
        return this.gaitFrames.has(id);
    }

    public render(state: PhaseBSceneState): void {
        this.root.active = this.ready && !state.result;
        if (!this.root.active) return;
        this.renderTowers(state);
        this.renderEnemies(state);
        this.renderDeaths(state);
        this.renderPreview(state);
        this.renderShop();
    }

    private renderTowers(state: PhaseBSceneState): void {
        const visible = new Set<string>();
        const towerSize = Math.min(82, this.layout.boardMetrics(state.grid).cellSize * 0.9);
        const recentShots = new Map<string, typeof state.feedback.tracers[number]>();
        for (const tracer of state.feedback.tracers) {
            const key = `${tracer.origin.column},${tracer.origin.row}`;
            // 反馈按产生时间追加；同塔短时间连发时保留最新一发的后坐力方向。
            recentShots.set(key, tracer);
        }
        // Creator 的发布转译对 iterable 展开存在差异，Map 在表现层显式转数组后迭代。
        for (const [key, towerId] of Array.from(state.towerIdsByCell.entries())) {
            const cell = this.cellFromKey(key);
            const frame = this.frames.get(towerId);
            if (!frame) continue;
            // 战场单位不得大于格子，否则横墙会互相遮挡，也会盖住敌人与路径。
            const point = this.layout.gridPointCenter(cell, state.grid);
            const shot = recentShots.get(key);
            const recoil = shot ? towerRecoilPose(towerId, shot.remainingSeconds, shot.durationSeconds, {
                x: shot.point.column - shot.origin.column,
                y: shot.origin.row - shot.point.row,
            }) : null;
            const base = this.towerLayers.get(`${towerId}:base`);
            const active = this.towerLayers.get(`${towerId}:active`);
            if (base && active) {
                const spec = this.specFor(towerId);
                const node = this.ensureLayerRig(key, towerSize, base, active, spec);
                const motion = towerId === 'frost-coil'
                    ? frostCorePulsePose(shot?.remainingSeconds ?? 0, shot?.durationSeconds ?? 0)
                    : recoil;
                LayeredTowerRig.pose(node, point, towerSize, motion, spec);
            } else {
                const node = this.ensureNode(this.towers, key, this.towerLayer, frame, towerSize);
                node.setPosition(point.x + (recoil?.x ?? 0), point.y + 3 + (recoil?.y ?? 0), 0);
                node.setScale(recoil?.scaleX ?? 1, recoil?.scaleY ?? 1, 1);
            }
            visible.add(key);
        }
        this.removeMissing(this.towers, visible);
    }

    private renderEnemies(state: PhaseBSceneState): void {
        const visible = new Set<string>();
        const cellSize = this.layout.boardMetrics(state.grid).cellSize;
        for (const enemy of state.enemies) {
            const frame = this.frames.get(enemy.archetype.id);
            if (!frame) continue;
            const heavy = enemy.archetype.id === 'iron-canister-hauler';
            const node = this.ensureEnemyNode(enemy.id, frame, heavy ? 92 : 78);
            this.renderEnemyIndicators(node, enemy, heavy);
            const from = this.layout.gridPointCenter(enemy.fromCell, state.grid);
            const to = this.layout.gridPointCenter(enemy.toCell, state.grid);
            const x = from.x + (to.x - from.x) * enemy.progress;
            const y = from.y + (to.y - from.y) * enemy.progress;
            const offset = enemyVisualOffset(enemy.spawnOrder, cellSize);
            node.setPosition(x + offset.x, y + offset.y, 0);
            const hit = state.feedback.tracers.find((tracer) => tracer.targetId === enemy.id);
            const life = hit ? hit.remainingSeconds / hit.durationSeconds : 0;
            const stride = enemyStridePose(enemy.archetype.id, enemy.progress, enemy.spawnOrder);
            // 身体运动与血条分层：步伐/命中只影响 Sprite，不让血条和减速圈跟着抖动。
            const body = node.getChildByName('Body');
            body?.setPosition(stride.x, stride.y, 0);
            body?.setScale(stride.scaleX * (1 + life * 0.11), stride.scaleY * (1 - life * 0.07), 1);
            if (body) body.angle = stride.angle;
            const sprite = body?.getComponent(Sprite);
            const gaitFrame = enemyGaitFrame(enemy.archetype.id, enemy.progress, enemy.spawnOrder) === 1
                ? this.gaitFrames.get(enemy.archetype.id) : null;
            if (sprite && sprite.spriteFrame !== (gaitFrame ?? frame)) sprite.spriteFrame = gaitFrame ?? frame;
            const slowStrength = enemySlowVisualStrength(enemy.slowRemainingSeconds, FROST_COIL.effect?.durationSeconds ?? 0);
            if (sprite) sprite.color = hit
                ? new Color(hit.towerId === 'frost-coil' ? '#C8F5FF' : '#FFE4B1')
                : slowStrength > 0
                    ? new Color(255 - Math.round(55 * slowStrength), 255 - Math.round(17 * slowStrength), 255)
                    : Color.WHITE;
            visible.add(enemy.id);
        }
        this.removeMissing(this.enemies, visible);
    }

    private renderDeaths(state: PhaseBSceneState): void {
        const cellSize = this.layout.boardMetrics(state.grid).cellSize;
        const visible = new Set<string>();
        for (const death of state.feedback.deaths) {
            const frame = this.frames.get(death.archetypeId);
            if (!frame) continue;
            const node = this.ensureNode(this.deaths, death.enemyId, this.deathLayer, frame,
                death.archetypeId === 'iron-canister-hauler' ? 92 : 78);
            const point = this.layout.gridPointCenter(death.point, state.grid);
            const offset = enemyVisualOffset(death.spawnOrder, cellSize);
            const progress = 1 - death.remainingSeconds / death.durationSeconds;
            node.setPosition(point.x + offset.x, point.y + offset.y + progress * 18, 0);
            node.setScale(1 + progress * 0.2, 1 - progress * 0.2, 1);
            const sprite = node.getComponent(Sprite);
            if (sprite) sprite.color = new Color('#FFD0A4');
            let opacity = node.getComponent(UIOpacity);
            if (!opacity) opacity = node.addComponent(UIOpacity);
            opacity.opacity = Math.round(255 * (1 - progress));
            visible.add(death.enemyId);
        }
        this.removeMissing(this.deaths, visible);
    }

    private renderEnemyIndicators(node: Node, enemy: PhaseBSceneState['enemies'][number], heavy: boolean): void {
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
            const strength = enemySlowVisualStrength(enemy.slowRemainingSeconds, FROST_COIL.effect?.durationSeconds ?? 0);
            EnemySlowIndicatorView.draw(indicators, 0, 0, heavy ? 45 : 37, strength);
        }
        const width = heavy ? 66 : 52;
        indicators.fillColor = new Color('#35262C');
        indicators.rect(-width / 2, heavy ? 55 : 48, width, 7);
        indicators.fill();
        indicators.fillColor = new Color('#69D391');
        indicators.rect(-width / 2, heavy ? 55 : 48, width * Math.max(0, enemy.health / enemy.archetype.maxHealth), 7);
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
        const current = nodes.get(key);
        if (current && (LayeredTowerRig.hasParts(current, RIVET_GUN_LAYER_SPEC) || LayeredTowerRig.hasParts(current, FROST_COIL_LAYER_SPEC))) {
            current.destroy();
            nodes.delete(key);
        }
        const existing = nodes.get(key);
        if (existing) {
            const transform = existing.getComponent(UITransform);
            if (transform && transform.contentSize.width !== size) transform.setContentSize(size, size);
            return existing;
        }
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

    private ensureLayerRig(key: string, size: number, base: SpriteFrame, active: SpriteFrame, spec: LayeredTowerSpec): Node {
        const existing = this.towers.get(key);
        if (existing && LayeredTowerRig.hasParts(existing, spec)) {
            LayeredTowerRig.resize(existing, size, spec);
            return existing;
        }
        if (existing) existing.destroy();
        const node = LayeredTowerRig.create(key, this.towerLayer, base, active, size, spec);
        this.towers.set(key, node);
        return node;
    }

    private specFor(towerId: LayeredTowerId): LayeredTowerSpec {
        return towerId === 'frost-coil' ? FROST_COIL_LAYER_SPEC : RIVET_GUN_LAYER_SPEC;
    }

    private ensureEnemyNode(key: string, frame: SpriteFrame, size: number): Node {
        const existing = this.enemies.get(key);
        if (existing) return existing;
        const node = new Node(key);
        node.layer = this.root.layer;
        node.addComponent(UITransform).setContentSize(size, size);
        const body = new Node('Body');
        body.layer = this.root.layer;
        body.addComponent(UITransform).setContentSize(size, size);
        const sprite = body.addComponent(Sprite);
        sprite.spriteFrame = frame;
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        // A/B 帧必须共用原始 128 方形画布；透明边缘不同也不能触发自动裁边导致脚底抖动。
        sprite.trim = false;
        node.addChild(body);
        this.enemyLayer.addChild(node);
        this.enemies.set(key, node);
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
