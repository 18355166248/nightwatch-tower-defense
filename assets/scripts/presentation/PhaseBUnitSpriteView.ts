import { Color, Graphics, HorizontalTextAlignment, isValid, Label, Node, resources, Sprite, SpriteFrame, UIOpacity, UITransform, VerticalTextAlignment } from 'cc';
import { towerPortraitPath } from '../config/TowerCatalog';
import { FROST_COIL, type EnemyId, type TowerId } from '../config/PhaseBCombatConfig';
import { towerVisualRank } from './TowerVisualRank';
import type { GridCell } from '../core/GridTypes';
import { PHASE_B_DESIGN_HEIGHT, PHASE_B_DESIGN_WIDTH, PhaseBLayout } from './PhaseBLayout';
import type { PhaseBSceneState } from './PhaseBSceneState';
import { FROST_COIL_LAYER_SPEC, LayeredTowerRig, RIVET_GUN_LAYER_SPEC, type LayeredTowerSpec } from './LayeredTowerRig';
import { EnemySlowIndicatorView } from './EnemySlowIndicatorView';
import { enemyHealthBarRatio } from './EnemyHealthIndicator';
import { healthBarOverlapCount, layoutEnemyHealthBars, type EnemyHealthBarCandidate } from './EnemyHealthBarLayout';
import { drawEnemyHealthBars } from './EnemyHealthBarView';
import { visibleSlowIndicatorIds } from './EnemySlowIndicatorSelection';
import { enemyCrowdGroups } from './EnemyCrowdGroups';
import { crowdNearCoincidentPairs, EnemyCrowdPresentation } from './EnemyCrowdLayout';
import { compareEnemyGroundDepth, enemyDeathArtFrame, enemyDeathPose, enemyGaitFrame, enemySlowVisualStrength, enemyStridePose, enemyVisualOffset, frostCorePulsePose, towerRecoilPose } from './UnitVisualMotion';
import { enemyDisplaySize, towerDisplaySize } from './UnitDisplaySize';
import { enemySpriteRegistrationY } from './UnitSpriteRegistration';
import { rivetAimAngleDegrees } from './TowerAimVisual';
import { EnemyArrivalPresentation, enemyGroundingStyle } from './EnemyArrivalPresentation';
import { EnemyGroundingView } from './EnemyGroundingView';
import { DirectionalSpriteAtlas } from './DirectionalSpriteAtlas';
import { directionalWalkFrame, directionalWalkRegistrationY, walkDirection, type WalkDirection } from './DirectionalWalk';
import { compatibleDirectionalCollapse, directionalCollapseFrame, directionalCollapseOpacity } from './DirectionalCollapse';
import { ORIGINAL_FIRST_LEVEL_ART, type FirstLevelArtProfile } from './FirstLevelArtProfile';
import { CombatVisualAnchors } from './CombatVisualAnchors';
import { layeredTowerEmissionPoint } from './LayeredTowerGeometry';
import { EightDirectionTowerFrames } from './EightDirectionTowerFrames';
import { towerHeadDirection, type TowerHeadDirection } from './EightDirectionTowerAim';
import { RIVET_HEAD_REGISTRATIONS } from './RivetHeadRegistrations';
import { poseDirectionalTowerHead } from './EightDirectionTowerView';
import { FrostUpgradeArtFrames } from './FrostUpgradeArtFrames';
import { frostUpgradePulse, selectFrostArt } from './FrostUpgradeArt';

const UNIT_ASSETS = {
    'piercing-cannon': 'level-three/units/piercing-cannon-level-1/spriteFrame',
    'arc-tower': 'level-three/units/arc-tower-level-1/spriteFrame',
    'siege-tank': 'level-three/units/siege-tank/spriteFrame',
    'shield-guard': 'level-three/units/shield-guard/spriteFrame',
    'rivet-gun': 'level-one/units/rivet-gun/spriteFrame',
    'frost-coil': 'level-one/units/frost-coil/spriteFrame',
    'clockwork-infantry': 'level-one/units/clockwork-infantry/spriteFrame',
    'clockwork-runner': 'level-one/units/clockwork-runner/spriteFrame',
    'iron-canister-hauler': 'level-one/units/iron-canister-hauler/spriteFrame',
} as const;
type UnitArtId = keyof typeof UNIT_ASSETS;
const ENEMY_GAIT_ASSETS = {
    'siege-tank': 'level-three/units/siege-tank-step-b/spriteFrame',
    'shield-guard': 'level-three/units/shield-guard-step-b/spriteFrame',
    'clockwork-infantry': 'level-one/units/clockwork-infantry-step-b-v2/spriteFrame',
    'clockwork-runner': 'level-one/units/clockwork-runner-step-b-v2/spriteFrame',
    'iron-canister-hauler': 'level-one/units/iron-canister-hauler-step-b-v1/spriteFrame',
} as const;
type EnemyGaitArtId = keyof typeof ENEMY_GAIT_ASSETS;
const ENEMY_DEATH_ASSETS = {
    'clockwork-infantry': 'level-one/units/clockwork-infantry-collapse-v1/spriteFrame',
} as const;
type EnemyDeathArtId = keyof typeof ENEMY_DEATH_ASSETS;
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
    public readonly visualAnchors = new CombatVisualAnchors();
    private readonly rivetHeadFrames: EightDirectionTowerFrames;
    private readonly frostUpgradeFrames: FrostUpgradeArtFrames;
    public frostArtSamples: { towerKey: string; requestedLevel: number; resolvedLevel: number; emitter: { x: number; y: number } }[] = [];
    public get frostUpgradeArtStatus(): string { return this.frostUpgradeFrames.status; }
    public frostStructureFrame(level: number): SpriteFrame | null { return this.frostUpgradeFrames.pair(level)?.base ?? null; }
    private readonly towerDirections = new Map<string, TowerHeadDirection>();
    public towerDirectionSamples: { towerKey: string; direction: TowerHeadDirection; level: number }[] = [];
    public get eightDirectionHeadStatus(): string { return this.rivetHeadFrames.status; }
    private readonly root = new Node('FirstLevelUnitSprites');
    private readonly towerLayer = new Node('TowerSprites');
    private readonly enemyLayer = new Node('EnemySprites');
    private readonly crowdLayer = new Node('EnemyCrowdBadges');
    private readonly deathLayer = new Node('DeathSprites');
    private readonly healthLayer = new Node('EnemyHealthBars');
    private readonly healthGraphics: Graphics;
    public renderedHealthBarCount = 0;
    public displacedHealthBarCount = 0;
    public overlappingHealthBarPairs = 0;
    public nearCoincidentEnemyAnchorPairs = 0;
    private readonly shopLayer = new Node('ShopSprites');
    private readonly newTowerFrames = new Map<string, SpriteFrame>();
    private readonly frames = new Map<EnemyId | TowerId, SpriteFrame>();
    private readonly gaitFrames = new Map<EnemyId, SpriteFrame>();
    private readonly deathFrames = new Map<EnemyDeathArtId, SpriteFrame>();
    private readonly towerLayers = new Map<string, SpriteFrame>();
    private readonly towers = new Map<string, Node>();
    private readonly enemies = new Map<string, Node>();
    private readonly crowdBadges = new Map<string, Node>();
    private readonly deaths = new Map<string, Node>();
    private readonly infantryAtlas: DirectionalSpriteAtlas | null;
    private readonly infantryCollapseAtlas: DirectionalSpriteAtlas | null;
    private readonly directionalCorpseFrames = new Map<string, { readonly frame: SpriteFrame; readonly direction: WalkDirection }>();
    private readonly directionalDeathBindings = new Map<string, WalkDirection | null>();
    private readonly sampledDirectionalFrames = new Set<string>();
    private readonly sampledDirectionalDeaths = new Set<string>();
    private renderedDirectionalCollapseCount = 0;
    private renderedInfantryCollapseCount = 0;
    private readonly arrival = new EnemyArrivalPresentation();
    private readonly crowd = new EnemyCrowdPresentation();
    private readonly layout: PhaseBLayout;
    private readonly preview: Node;

    public constructor(parent: Node, layout: PhaseBLayout, infantryRigCandidate = false, profile: FirstLevelArtProfile = ORIGINAL_FIRST_LEVEL_ART) {
        this.layout = layout;
        this.rivetHeadFrames = new EightDirectionTowerFrames(this.root);
        this.frostUpgradeFrames = new FrostUpgradeArtFrames(this.root);
        this.root.layer = parent.layer;
        this.root.addComponent(UITransform).setContentSize(PHASE_B_DESIGN_WIDTH, PHASE_B_DESIGN_HEIGHT);
        parent.addChild(this.root);
        this.infantryAtlas = infantryRigCandidate
            ? new DirectionalSpriteAtlas(this.root, profile.infantryWalk) : null;
        this.infantryCollapseAtlas = infantryRigCandidate
            ? new DirectionalSpriteAtlas(this.root, profile.infantryCollapse, 'collapse') : null;
        for (const layer of [this.towerLayer, this.enemyLayer, this.deathLayer, this.crowdLayer, this.healthLayer, this.shopLayer]) {
            layer.layer = parent.layer;
            this.root.addChild(layer);
        }
        this.healthGraphics = this.healthLayer.addComponent(Graphics);
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
        for (const [id, resourcePath] of Object.entries(ENEMY_DEATH_ASSETS) as [EnemyDeathArtId, string][]) {
            resources.load(resourcePath, SpriteFrame, (error, frame) => {
                // 倒地帧是可选视觉增强；缺图时沿用原站立图与短死亡反馈。
                if (error || !frame || !isValid(this.root)) return;
                this.deathFrames.set(id, frame);
            });
        }
        for (const id of ['piercing-cannon', 'arc-tower'] as const) for (const level of [2, 3]) {
            resources.load(towerPortraitPath(id, level), SpriteFrame, (error, frame) => {
                if (!error && frame && isValid(this.root)) this.newTowerFrames.set(`${id}:${level}`, frame);
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
        return ['rivet-gun','frost-coil','clockwork-infantry','clockwork-runner','iron-canister-hauler'].every(id => this.frames.has(id as UnitArtId));
    }
    public get missingArtIds(): ReadonlySet<UnitArtId> {
        return new Set((Object.keys(UNIT_ASSETS) as UnitArtId[]).filter(id=>!this.frames.has(id)));
    }

    public hasGaitFrame(id: EnemyGaitArtId): boolean {
        return this.gaitFrames.has(id);
    }

    public hasDeathFrame(id: EnemyDeathArtId): boolean {
        return this.deathFrames.has(id);
    }

    public get activeInfantryCollapseCount(): number {
        return this.renderedInfantryCollapseCount;
    }

    public get directionalWalkStatus(): string { return this.infantryAtlas?.status ?? 'disabled'; }
    public get directionalWalkSamples(): readonly string[] { return Array.from(this.sampledDirectionalFrames).sort(); }
    public get directionalCollapseStatus(): string { return this.infantryCollapseAtlas?.status ?? 'disabled'; }
    public get directionalCollapseSamples(): readonly string[] { return Array.from(this.sampledDirectionalDeaths).sort(); }
    public get activeDirectionalCollapseCount(): number { return this.renderedDirectionalCollapseCount; }

    public dispose(): void {
        for (const node of this.towers.values()) {
            this.detachDirectionalHead(node);
            for (const name of ['FrostBase', 'FrostCore']) {
                const sprite = node.getChildByName(name)?.getComponent(Sprite);
                if (sprite) sprite.spriteFrame = null;
            }
        }
        this.rivetHeadFrames.dispose();
        this.frostUpgradeFrames.dispose();
        this.towerDirections.clear();
        this.crowd.reset();
        this.infantryAtlas?.dispose();
        this.infantryCollapseAtlas?.dispose();
        this.directionalCorpseFrames.clear();
        this.directionalDeathBindings.clear();
        this.sampledDirectionalFrames.clear();
        this.sampledDirectionalDeaths.clear();
    }

    public render(state: PhaseBSceneState, runElapsedSeconds: number, battlefieldVisible: boolean = true): void {
        this.visualAnchors.begin();
        this.towerDirectionSamples = [];
        this.frostArtSamples = [];
        this.healthGraphics.clear();
        this.renderedHealthBarCount = 0;
        this.displacedHealthBarCount = 0;
        this.overlappingHealthBarPairs = 0;
        this.nearCoincidentEnemyAnchorPairs = 0;
        this.renderedInfantryCollapseCount = 0;
        this.renderedDirectionalCollapseCount = 0;
        if (runElapsedSeconds === 0) {
            this.sampledDirectionalFrames.clear();
            this.sampledDirectionalDeaths.clear();
        }
        // 首页不绘制战场，也不应保留不可见八向炮头租约；新开局按实际等级重建。
        this.root.active = this.ready && !state.result && battlefieldVisible;
        if (!this.root.active) {
            this.removeMissing(this.towers, new Set());
            this.rivetHeadFrames.retainLevels(new Set());
            this.crowd.reset();
            this.directionalCorpseFrames.clear();
            this.directionalDeathBindings.clear();
            return;
        }
        this.renderEnemies(state, runElapsedSeconds);
        this.renderCrowdBadges(state);
        this.renderDeaths(state);
        // 先发布活体/尸影的显示点，再摆炮头和发射点；前景特效随后读取同一帧，不用上一帧位置。
        this.renderTowers(state);
        this.drawTowerInteractionMarkers(state);
        this.crowd.retain(new Set([...state.enemies.map((enemy) => enemy.id), ...state.feedback.deaths.map((death) => death.enemyId)]));
        // 最后显示帧只保留给活动敌人/短尸影；离场、结算和重开不能累积历史单位引用。
        for (const id of Array.from(this.directionalCorpseFrames.keys())) {
            if (!this.enemies.has(id) && !this.deaths.has(id)) this.directionalCorpseFrames.delete(id);
        }
        for (const id of Array.from(this.directionalDeathBindings.keys())) {
            if (!this.deaths.has(id)) this.directionalDeathBindings.delete(id);
        }
        this.renderPreview(state);
        // 普通模式塔栏由设计版 HUD 复用同一透明素材；隐藏旧货架，避免出现第二排悬空塔图。
        this.shopLayer.active = state.qaMode;
        if (state.qaMode) this.renderShop();
    }

    private renderTowers(state: PhaseBSceneState): void {
        this.towerDirectionSamples = [];
        const visible = new Set<string>();
        const headLevels = new Set<number>();
        const towerSize = towerDisplaySize(this.layout.boardMetrics(state.grid).cellSize);
        const recentShots = new Map<string, typeof state.feedback.tracers[number]>();
        for (const tracer of state.feedback.tracers) {
            const key = `${tracer.origin.column},${tracer.origin.row}`;
            // 反馈按产生时间追加；同塔短时间连发时保留最新一发的后坐力方向。
            recentShots.set(key, tracer);
        }
        const recentAims = new Map(state.feedback.aims.map((aim) => [`${aim.origin.column},${aim.origin.row}`, aim]));
        // Creator 的发布转译对 iterable 展开存在差异，Map 在表现层显式转数组后迭代。
        for (const [key, towerId] of Array.from(state.towerIdsByCell.entries())) {
            const cell = this.cellFromKey(key);
            const frame = this.newTowerFrames.get(`${towerId}:${state.towerLevelsByCell.get(key) ?? 1}`) ?? this.frames.get(towerId);
            if (!frame) continue;
            // 战场单位不得大于格子，否则相邻布塔会互相遮挡，也会盖住敌人与路径。
            const point = this.layout.gridPointCenter(cell, state.grid);
            const shot = state.reducedMotion ? undefined : recentShots.get(key);
            const recoil = shot ? towerRecoilPose(towerId, shot.remainingSeconds, shot.durationSeconds, {
                x: shot.point.column - shot.origin.column,
                y: shot.origin.row - shot.point.row,
            }) : null;
            let base = this.towerLayers.get(`${towerId}:base`);
            let active = this.towerLayers.get(`${towerId}:active`);
            // 新塔没有旧双塔的分层契约，正式素材接入前保留 Graphics 降级，不能套用冷凝机架。
            if (base && active && (towerId === 'rivet-gun' || towerId === 'frost-coil')) {
                const level = state.towerLevelsByCell.get(key) ?? 1;
                const frostArt = towerId === 'frost-coil' ? selectFrostArt(level, this.frostUpgradeFrames.pair(level), { base, active }) : null;
                if (frostArt) { base = frostArt.pair.base; active = frostArt.pair.active; }
                const spec = frostArt?.spec ?? this.specFor(towerId);
                const node = this.ensureLayerRig(key, towerSize, base, active, spec, towerId === 'frost-coil');
                const upgradedFrost = frostArt !== null && frostArt.resolvedLevel > 1;
                const frostPulse = frostUpgradePulse(shot?.remainingSeconds ?? 0, shot?.durationSeconds ?? 0);
                let motion = towerId === 'frost-coil'
                    ? upgradedFrost ? frostPulse.pose : frostCorePulsePose(shot?.remainingSeconds ?? 0, shot?.durationSeconds ?? 0)
                    : recoil;
                const aim = towerId === 'rivet-gun' ? recentAims.get(key) : undefined;
                const fallbackTarget = aim ? this.layout.routePointCenter(aim.point,state.grid) : point;
                const visualTarget = aim ? this.visualAnchors.resolveTarget(aim.targetId,fallbackTarget) : point;
                const cellSize = this.layout.boardMetrics(state.grid).cellSize;
                const aimPoint = aim ? {column:aim.point.column+(visualTarget.x-fallbackTarget.x)/cellSize,
                    row:aim.point.row-(visualTarget.y-fallbackTarget.y)/cellSize} : cell;
                const aimAngle = aim ? rivetAimAngleDegrees(aim.origin, aimPoint, aim.remainingSeconds, aim.durationSeconds) : 0;
                if (towerId === 'frost-coil' && !upgradedFrost) {
                    const rank = towerVisualRank(state.towerLevelsByCell.get(key) ?? 1);
                    // 升级形态和弹道共用姿态配准，不能只放大图片留下旧发射点。
                    motion = { x: motion?.x ?? 0, y: motion?.y ?? 0, angle: motion?.angle ?? 0,
                        scaleX: (motion?.scaleX ?? 1) * rank.coreScale, scaleY: (motion?.scaleY ?? 1) * rank.coreScale };
                }
                LayeredTowerRig.pose(node, point, towerSize, motion, spec, aimAngle);
                if (towerId === 'frost-coil') {
                    const core = node.getChildByName(spec.activeName)!;
                    const opacity = core.getComponent(UIOpacity) ?? core.addComponent(UIOpacity);
                    opacity.opacity = upgradedFrost ? frostPulse.opacity : 255;
                }
                let emitter = layeredTowerEmissionPoint(point,towerSize,motion,spec,aimAngle);
                if (frostArt) this.frostArtSamples.push({ towerKey: key, requestedLevel: level, resolvedLevel: frostArt.resolvedLevel, emitter });
                if (towerId === 'rivet-gun') {
                    const level = state.towerLevelsByCell.get(key) ?? 1;
                    headLevels.add(level);
                    this.rivetHeadFrames.request(level);
                    const previous = this.towerDirections.get(key) ?? 'north';
                    const direction = aim ? towerHeadDirection(point, visualTarget, previous) : previous;
                    const directionFrame = this.rivetHeadFrames.frame(direction, level);
                    if (directionFrame) {
                        this.towerDirections.set(key, direction);
                        const muzzles = poseDirectionalTowerHead(node, directionFrame, RIVET_HEAD_REGISTRATIONS[direction], point, towerSize, motion);
                        emitter = muzzles[0];
                        this.visualAnchors.emitter(key, muzzles[1], 1);
                        this.towerDirectionSamples.push({ towerKey: key, direction, level });
                    } else LayeredTowerRig.restoreActiveFrame(node, active, towerSize, spec);
                }
                this.visualAnchors.emitter(key, emitter);
            } else {
                const node = this.ensureNode(this.towers, key, this.towerLayer, frame, towerSize);
                node.setPosition(point.x + (recoil?.x ?? 0), point.y + 3 + (recoil?.y ?? 0), 0);
                node.setScale(recoil?.scaleX ?? 1, recoil?.scaleY ?? 1, 1);
            }
            visible.add(key);
        }
        this.removeMissing(this.towers, visible);
        // 所有塔已换到本级帧或明确恢复旧图后，才释放过时等级，避免渲染器引用已销毁纹理。
        this.rivetHeadFrames.retainLevels(headLevels);
        for (const key of this.towerDirections.keys()) if (!visible.has(key)) this.towerDirections.delete(key);
    }

    private renderEnemies(state: PhaseBSceneState, runElapsedSeconds: number): void {
        const visible = new Set<string>();
        const depths: { node: Node; y: number; spawnOrder: number }[] = [];
        const healthBars: EnemyHealthBarCandidate[] = [];
        const cellSize = this.layout.boardMetrics(state.grid).cellSize;
        const slowRingIds = visibleSlowIndicatorIds(state.enemies);
        const crowdOffsets = this.crowd.sample(state.enemies, runElapsedSeconds);
        this.nearCoincidentEnemyAnchorPairs = crowdNearCoincidentPairs(state.enemies, crowdOffsets);
        for (const enemy of state.enemies) {
            const frame = this.frames.get(enemy.archetype.id);
            if (!frame) continue;
            const heavy = enemy.archetype.id === 'iron-canister-hauler' || enemy.archetype.id === 'siege-tank';
            const displaySize = enemyDisplaySize(cellSize, heavy, this.layout.safeHalfWidth < 360);
            const node = this.ensureEnemyNode(enemy.id, frame, displaySize);
            const arrival = this.arrival.pose(enemy.id, runElapsedSeconds, state.reducedMotion);
            EnemyGroundingView.render(node, enemy.archetype.id, displaySize, arrival);
            this.renderEnemyIndicators(node, enemy, heavy, slowRingIds.has(enemy.id));
            const point = this.layout.routePointCenter({
                column: enemy.fromCell.column + (enemy.toCell.column - enemy.fromCell.column) * enemy.progress,
                row: enemy.fromCell.row + (enemy.toCell.row - enemy.fromCell.row) * enemy.progress,
            }, state.grid);
            const x = point.x, y = point.y;
            const crowdOffset = crowdOffsets.get(enemy.id)!;
            const offset = { x: crowdOffset.column * cellSize, y: -crowdOffset.row * cellSize };
            node.setPosition(x + offset.x, y + offset.y, 0);
            depths.push({ node, y: y + offset.y, spawnOrder: enemy.spawnOrder });
            const ratio = enemyHealthBarRatio(enemy.health, enemy.archetype.maxHealth) ?? (enemy.archetype.maxShield ? 1 : null);
            if (ratio !== null) healthBars.push({ id: enemy.id, spawnOrder: enemy.spawnOrder,
                x: x + offset.x, y: y + offset.y + (heavy ? 55 : 48), width: heavy ? 66 : 52, ratio });
            const hit = state.feedback.tracers.find((tracer) => tracer.targetId === enemy.id);
            const life = hit ? hit.remainingSeconds / hit.durationSeconds : 0;
            const nextProgress = Math.min(1, enemy.progress + 0.001);
            const ahead = this.layout.routePointCenter({column:enemy.fromCell.column+(enemy.toCell.column-enemy.fromCell.column)*nextProgress,
                row:enemy.fromCell.row+(enemy.toCell.row-enemy.fromCell.row)*nextProgress},state.grid);
            const dx = ahead.x-x, dy = ahead.y-y;
            const direction = Math.abs(dx)+Math.abs(dy)<0.00001 ? walkDirection(enemy.fromCell,enemy.toCell)
                : walkDirection({column:0,row:0},{column:Math.abs(dx)>Math.abs(dy)?Math.sign(dx):0,row:Math.abs(dx)>Math.abs(dy)?0:-Math.sign(dy)});
            const directionalIndex = directionalWalkFrame(enemy.progress, enemy.spawnOrder, state.reducedMotion);
            const directionalFrame = enemy.archetype.id === 'clockwork-infantry'
                ? this.infantryAtlas?.frame(direction, directionalIndex) : null;
            if (directionalFrame) {
                this.directionalCorpseFrames.set(enemy.id, { frame: directionalFrame, direction });
                this.sampledDirectionalFrames.add(`${direction}:${directionalIndex}`);
            }
            // 模型已包含步态，不再叠加整身弹跳/拉伸；命中和入场仍仅影响身体，不带动血条。
            const stride = state.reducedMotion || directionalFrame ? { x: 0, y: 0, scaleX: 1, scaleY: 1, angle: 0 }
                : enemyStridePose(enemy.archetype.id, enemy.progress, enemy.spawnOrder);
            const gaitFrame = !state.reducedMotion && enemyGaitFrame(enemy.archetype.id, enemy.progress, enemy.spawnOrder) === 1
                ? this.gaitFrames.get(enemy.archetype.id) : null;
            // 仅补偿实际加载的 B 帧；缺图时仍显示原 A 帧，不得平白移动身体。
            const displayedFrame = gaitFrame ? 1 : 0;
            const visualFrame = directionalFrame ?? gaitFrame ?? frame;
            const registrationY = directionalFrame && this.infantryAtlas?.layout
                ? directionalWalkRegistrationY(this.infantryAtlas.layout.anchor[1],
                    enemyGroundingStyle(enemy.archetype.id, displaySize).y, displaySize)
                : stride.y + enemySpriteRegistrationY(enemy.archetype.id, displayedFrame, displaySize);
            // 身体运动与血条分层：步伐/命中只影响 Sprite，不让血条和减速圈跟着抖动。
            const body = node.getChildByName('Body');
            body?.setPosition(stride.x, registrationY, 0);
            this.visualAnchors.target(enemy.id,{x:x+offset.x+stride.x,y:y+offset.y+registrationY});
            body?.setScale(stride.scaleX * (1 + (state.reducedMotion ? 0 : life * 0.11)) * arrival.scale,
                stride.scaleY * (1 - (state.reducedMotion ? 0 : life * 0.07)) * arrival.scale, 1);
            const bodyOpacity = body?.getComponent(UIOpacity);
            if (bodyOpacity) bodyOpacity.opacity = arrival.opacity;
            if (body) body.angle = stride.angle;
            const sprite = body?.getComponent(Sprite);
            if (sprite && sprite.spriteFrame !== visualFrame) sprite.spriteFrame = visualFrame;
            const slowStrength = enemySlowVisualStrength(enemy.slowRemainingSeconds, FROST_COIL.effect?.durationSeconds ?? 0);
            if (sprite) sprite.color = hit
                ? new Color(hit.towerId === 'frost-coil' ? '#C8F5FF' : '#FFE4B1')
                : slowStrength > 0
                    ? new Color(255 - Math.round(55 * slowStrength), 255 - Math.round(17 * slowStrength), 255)
                    : Color.WHITE;
            visible.add(enemy.id);
        }
        this.removeMissing(this.enemies, visible);
        // 俯视遮挡按脚下地面排序，不按出生顺序；血条另在所有身体上方绘制，不被后到单位盖掉。
        depths.sort(compareEnemyGroundDepth)
            .forEach(({ node }, index) => { if (node.getSiblingIndex() !== index) node.setSiblingIndex(index); });
        const metrics = this.layout.boardMetrics(state.grid);
        const bars = layoutEnemyHealthBars(healthBars, { left: metrics.left + 4, right: metrics.left + metrics.width - 4,
            bottom: metrics.bottom + 4, top: metrics.bottom + metrics.height - 4 });
        drawEnemyHealthBars(this.healthGraphics, bars);
        for(const enemy of state.enemies){
            if(!enemy.shield)continue;
            const point=this.visualAnchors.resolveTarget(enemy.id,this.layout.routePointCenter(enemy.fromCell,state.grid));
            this.healthGraphics.strokeColor=new Color(97,222,249,150);this.healthGraphics.lineWidth=2;
            this.healthGraphics.ellipse(point.x,point.y,cellSize*.36,cellSize*.42);this.healthGraphics.stroke();
        }
        for (const bar of bars) {
            const enemy = state.enemies.find(item => item.id === bar.id);
            if (!enemy?.archetype.maxShield || !enemy.shield) continue;
            // 护盾独立于生命绘制；破盾后立即清掉蓝条，不能以生命比例冒充剩余盾量。
            this.healthGraphics.fillColor = new Color('#183B56');
            this.healthGraphics.rect(bar.x-bar.width/2,bar.y+10,bar.width,5); this.healthGraphics.fill();
            this.healthGraphics.fillColor = new Color('#59DDEC');
            this.healthGraphics.rect(bar.x-bar.width/2,bar.y+10,bar.width*Math.min(1,enemy.shield/enemy.archetype.maxShield),5); this.healthGraphics.fill();
        }
        this.renderedHealthBarCount = bars.length;
        this.displacedHealthBarCount = bars.filter((bar) => bar.x !== bar.anchorX || bar.y !== bar.anchorY).length;
        this.overlappingHealthBarPairs = healthBarOverlapCount(bars);
        this.arrival.retain(visible);
    }

    private renderCrowdBadges(state: PhaseBSceneState): void {
        const metrics = this.layout.boardMetrics(state.grid);
        const visible = new Set<string>();
        // 双列中的同格不再等于视觉叠成一团；旧人数徽标会反而挡住已分开的身体。
        const groups = state.enemies.some((enemy) => enemy.trafficLane !== undefined) ? [] : enemyCrowdGroups(state.enemies);
        for (const group of groups) {
            const node = this.ensureCrowdBadge(group.key);
            const center = this.layout.gridPointCenter(group, state.grid);
            // 角落里的徽标保持在棋盘内，不能钻进顶栏或底部控制区。
            const x = Math.max(metrics.left + 37, Math.min(metrics.left + metrics.width - 37, center.x + metrics.cellSize * 0.31));
            const y = Math.max(metrics.bottom + 26, Math.min(metrics.bottom + metrics.height - 26, center.y - metrics.cellSize * 0.28));
            node.setPosition(x, y, 0);
            const label = node.getChildByName('Count')?.getComponent(Label);
            if (label) label.string = `×${group.count}`;
            visible.add(group.key);
        }
        this.removeMissing(this.crowdBadges, visible);
    }

    private ensureCrowdBadge(key: string): Node {
        const existing = this.crowdBadges.get(key);
        if (existing) return existing;
        const badge = new Node(key);
        badge.layer = this.root.layer;
        badge.addComponent(UITransform).setContentSize(74, 52);
        const graphics = badge.addComponent(Graphics);
        graphics.fillColor = new Color(18, 39, 56, 235);
        graphics.roundRect(-36, -24, 72, 48, 18);
        graphics.fill();
        graphics.strokeColor = new Color('#FFE2A0');
        graphics.lineWidth = 3;
        graphics.roundRect(-36, -24, 72, 48, 18);
        graphics.stroke();
        const count = new Node('Count');
        count.layer = this.root.layer;
        count.addComponent(UITransform).setContentSize(70, 48);
        const label = count.addComponent(Label);
        label.fontSize = 36;
        label.lineHeight = 42;
        label.color = new Color('#FFF3D8');
        label.horizontalAlign = HorizontalTextAlignment.CENTER;
        label.verticalAlign = VerticalTextAlignment.CENTER;
        label.overflow = Label.Overflow.CLAMP;
        badge.addChild(count);
        this.crowdLayer.addChild(badge);
        this.crowdBadges.set(key, badge);
        return badge;
    }

    private renderDeaths(state: PhaseBSceneState): void {
        const cellSize = this.layout.boardMetrics(state.grid).cellSize;
        const visible = new Set<string>();
        for (const death of state.feedback.deaths) {
            const frame = this.frames.get(death.archetypeId);
            if (!frame) continue;
            const directionalCorpse = this.directionalCorpseFrames.get(death.enemyId);
            const baseSize = enemyDisplaySize(cellSize, death.archetypeId === 'iron-canister-hauler', this.layout.safeHalfWidth < 360);
            // 死亡开始时锁定是否有完整动作；资源晚到不能把淡出中的尸影突然换成站立首帧。
            if (!this.directionalDeathBindings.has(death.enemyId)) {
                this.directionalDeathBindings.set(death.enemyId,
                    directionalCorpse && compatibleDirectionalCollapse(this.infantryAtlas?.layout ?? null,
                        this.infantryCollapseAtlas?.layout ?? null, death.durationSeconds) ? directionalCorpse.direction : null);
            }
            const collapseDirection = this.directionalDeathBindings.get(death.enemyId);
            const collapseLayout = collapseDirection ? this.infantryCollapseAtlas?.layout : null;
            const directionalIndex = collapseDirection && collapseLayout
                ? directionalCollapseFrame(death.remainingSeconds, death.durationSeconds,
                    collapseLayout.frames[collapseDirection], state.reducedMotion) : 0;
            const rigCollapseFrame = collapseDirection
                ? this.infantryCollapseAtlas?.frame(collapseDirection, directionalIndex) : null;
            if (rigCollapseFrame) {
                this.renderedDirectionalCollapseCount += 1;
                this.sampledDirectionalDeaths.add(`${collapseDirection}:${directionalIndex}`);
            }
            const authoredCollapse = !directionalCorpse && death.archetypeId === 'clockwork-infantry'
                && this.deathFrames.has('clockwork-infantry');
            const collapseFrame = authoredCollapse && enemyDeathArtFrame(death.archetypeId, death.remainingSeconds, death.durationSeconds) === 1
                ? this.deathFrames.get('clockwork-infantry') : undefined;
            if (collapseFrame) this.renderedInfantryCollapseCount += 1;
            // 缺死亡图时仍沿用同模型最后朝向，不能切回旧画风；默认入口原两帧死亡不受影响。
            const displayedFrame = rigCollapseFrame ?? directionalCorpse?.frame ?? collapseFrame ?? frame;
            const displaySize = rigCollapseFrame && collapseLayout && this.infantryAtlas?.layout
                ? baseSize * collapseLayout.frames.down[0].w / this.infantryAtlas.layout.frames.down[0].w : baseSize;
            const node = this.ensureNode(this.deaths, death.enemyId, this.deathLayer, displayedFrame,
                displaySize);
            const point = this.layout.routePointCenter(death.point, state.grid);
            // 死亡继续沿用最后脚点，不能在倒地瞬间跳回原始四槽错位。
            const crowdOffset = this.crowd.get(death.enemyId);
            const offset = crowdOffset ? { x: crowdOffset.column * cellSize, y: -crowdOffset.row * cellSize }
                : enemyVisualOffset(death.spawnOrder, cellSize);
            const pose = enemyDeathPose(death.archetypeId, death.remainingSeconds, death.durationSeconds, death.spawnOrder, authoredCollapse);
            // 切图和爆圈共用同一纯函数时间曲线；重装下沉、普通敌人快速收拢，避免每只都像金币一样飘走。
            const rigRegistration = rigCollapseFrame && collapseLayout
                ? directionalWalkRegistrationY(collapseLayout.anchor[1], enemyGroundingStyle(death.archetypeId, baseSize).y, displaySize) : 0;
            // 模型帧已包含倾倒/接地，不能再叠加程序下沉、压扁和随机旋转；大画布不等于放大角色。
            node.setPosition(point.x + offset.x, point.y + offset.y + (rigCollapseFrame ? rigRegistration : state.reducedMotion ? 0 : pose.y), 0);
            this.visualAnchors.target(death.enemyId,{x:node.position.x,y:node.position.y});
            node.setScale(rigCollapseFrame || state.reducedMotion ? 1 : pose.scaleX,
                rigCollapseFrame || state.reducedMotion ? 1 : pose.scaleY, 1);
            node.angle = rigCollapseFrame || state.reducedMotion ? 0 : pose.angle;
            const sprite = node.getComponent(Sprite);
            if (sprite) {
                // 两帧必须保持原始 128 方画布，不能让自动裁边改变脚点。
                sprite.trim = false;
                if (sprite.spriteFrame !== displayedFrame) sprite.spriteFrame = displayedFrame;
                sprite.color = rigCollapseFrame ? Color.WHITE : new Color(death.archetypeId === 'iron-canister-hauler' ? '#FFE3A9'
                    : death.archetypeId === 'clockwork-runner' ? '#C8F5FF' : '#FFD0A4');
            }
            let opacity = node.getComponent(UIOpacity);
            if (!opacity) opacity = node.addComponent(UIOpacity);
            opacity.opacity = rigCollapseFrame ? directionalCollapseOpacity(death.remainingSeconds) : pose.opacity;
            visible.add(death.enemyId);
        }
        this.removeMissing(this.deaths, visible);
    }

    private renderEnemyIndicators(node: Node, enemy: PhaseBSceneState['enemies'][number], heavy: boolean, showSlowRing: boolean): void {
        let indicators = node.getChildByName('CombatIndicators')?.getComponent(Graphics);
        if (!indicators) {
            const child = new Node('CombatIndicators');
            child.layer = this.root.layer;
            child.addComponent(UITransform).setContentSize(100, 100);
            indicators = child.addComponent(Graphics);
            node.addChild(child);
        }
        indicators.clear();
        // 减速环跟随地面节点；血条已独立到最上层，不能继续在这里重复画。
        if (showSlowRing) {
            const strength = enemySlowVisualStrength(enemy.slowRemainingSeconds, FROST_COIL.effect?.durationSeconds ?? 0);
            EnemySlowIndicatorView.draw(indicators, 0, 0, heavy ? 45 : 37, strength);
        }
    }

    private renderPreview(state: PhaseBSceneState): void {
        const selected = state.preview;
        this.preview.active = Boolean(selected);
        if (!selected) return;
        const sprite = this.preview.getComponent(Sprite);
        if (sprite) sprite.spriteFrame = this.frames.get(selected.towerId) ?? null;
        const point = this.layout.gridPointCenter(selected.cell, state.grid);
        this.preview.setPosition(point.x, point.y + 3, 0);
        const size = towerDisplaySize(this.layout.boardMetrics(state.grid).cellSize);
        this.preview.getComponent(UITransform)!.setContentSize(size, size);
        if (sprite) sprite.color = new Color(selected.accepted ? '#ABFFE5' : '#FF9898');
    }

    private drawTowerInteractionMarkers(state: PhaseBSceneState): void {
        const g = this.healthGraphics, size = this.layout.boardMetrics(state.grid).cellSize;
        for (const [key, towerId] of Array.from(state.towerIdsByCell.entries())) {
            if (towerId !== 'frost-coil') continue;
            const p = this.layout.gridPointCenter(this.cellFromKey(key), state.grid);
            const rank = towerVisualRank(state.towerLevelsByCell.get(key) ?? 1);
            // 级标仅作辅助；新结构就绪后不再叠加程序散热翼，避免遮住双罐/球冠轮廓。
            for (let i = 0; i < rank.rank; i += 1) {
                const x = p.x + (i - (rank.rank - 1) / 2) * size * .18;
                g.fillColor = new Color('#102531');
                g.roundRect(x-size*.07,p.y-size*.43,size*.14,size*.13,3); g.fill();
                g.strokeColor = new Color('#D7B56E'); g.lineWidth=2;
                g.roundRect(x-size*.07,p.y-size*.43,size*.14,size*.13,3); g.stroke();
                g.fillColor = new Color(rank.color); g.circle(x,p.y-size*.365,size*.035); g.fill();
            }
            const fins = this.frostUpgradeFrames.pair(rank.rank) ? 0 : rank.fins;
            for (let i = 0; i < fins; i += 1) for (const side of [-1, 1]) {
                const x=p.x+side*size*.25;
                g.strokeColor=new Color(rank.color); g.lineWidth=4;
                g.moveTo(x,p.y+size*(.1+i*.12)); g.lineTo(x+side*size*.13,p.y+size*(.18+i*.12)); g.stroke();
            }
        }
        const selected=state.inspectedTower;
        if (!selected) return;
        const p=this.layout.gridPointCenter(selected.cell,state.grid);
        g.strokeColor=new Color('#FFE9A5'); g.lineWidth=6;
        // 上层明亮四角包围整格，选中框不再被塔底图盖住。
        for (const x of [-1,1]) for (const y of [-1,1]) {
            const px=p.x+x*size*.46,py=p.y+y*size*.46;
            g.moveTo(px-x*size*.16,py); g.lineTo(px,py); g.lineTo(px,py-y*size*.16); g.stroke();
        }
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
            const sprite = existing.getComponent(Sprite);
            if (sprite && sprite.spriteFrame !== frame) sprite.spriteFrame = frame;
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

    private ensureLayerRig(key: string, size: number, base: SpriteFrame, active: SpriteFrame, spec: LayeredTowerSpec, syncFrames = false): Node {
        const existing = this.towers.get(key);
        if (existing && LayeredTowerRig.hasParts(existing, spec)) {
            // 冷凝升级整组换帧；机枪方向帧另有适配器，不能每帧先覆回旧图再重复绑定八向帧。
            if (syncFrames) LayeredTowerRig.bindFrames(existing, base, active, size, spec);
            else LayeredTowerRig.resize(existing, size, spec);
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
        if (existing) {
            const body = existing.getChildByName('Body');
            // QA 切换网格后继续复用节点，但显示画布必须跟随新格宽；切帧不改变注册中心。
            for (const transform of [existing.getComponent(UITransform), body?.getComponent(UITransform)]) {
                if (transform && transform.contentSize.width !== size) transform.setContentSize(size, size);
            }
            return existing;
        }
        const node = new Node(key);
        node.layer = this.root.layer;
        node.addComponent(UITransform).setContentSize(size, size);
        const body = new Node('Body');
        body.layer = this.root.layer;
        body.addComponent(UITransform).setContentSize(size, size);
        EnemyGroundingView.attach(node);
        body.addComponent(UIOpacity);
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
            if (nodes === this.towers) this.detachDirectionalHead(node);
            node.destroy();
            nodes.delete(key);
        }
    }

    private detachDirectionalHead(node: Node): void {
        const sprite = node.getChildByName('RivetHead')?.getComponent(Sprite);
        if (sprite) sprite.spriteFrame = null;
    }

    private cellFromKey(key: string): GridCell {
        const [column, row] = key.split(',').map(Number);
        return { column, row };
    }
}
