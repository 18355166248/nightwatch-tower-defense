import {
    Color,
    HorizontalTextAlignment,
    Label,
    Node,
    UITransform,
    VerticalTextAlignment,
} from 'cc';
import type { BattleResultViewModel } from './BattleResultViewModel';
import { FROST_COIL, RIVET_GUN, type TowerId } from '../config/PhaseBCombatConfig';
import type { BattlePhase } from '../systems/BattleStateMachine';
import type { FirstLevelEntryMode } from './FirstLevelExperience';
import { firstLevelWaveBanner } from './FirstLevelWaveBanner';
import { hudEventText, resourceCardValueText, type WaveStartButtonViewModel } from './PhaseBHudText';
import { HudResourceIconView } from './HudResourceIconView';
import { FirstLevelResultView } from './FirstLevelResultView';
import { VisibleHudLabel } from './VisibleHudLabel';
import { FirstLevelUiSkinView } from './FirstLevelUiSkinView';
import { FirstLevelTowerPanelView } from './FirstLevelTowerPanelView';
import type { TowerPanelInput } from './FirstLevelTowerPanelPresentation';
import { FIRST_LEVEL_UI_FONT, firstLevelFontSize } from './FirstLevelUiStyle';
import type { UpcomingWaveBriefing } from './WaveBriefing';
import { PHASE_B_EARLY_WAVE_BUTTON, PHASE_B_SOUND_BUTTON, PHASE_B_SPEED_BUTTON,
    PHASE_B_SELL_BUTTON, PHASE_B_UPGRADE_BUTTON, PHASE_B_UPGRADE_FULL_BUTTON, PhaseBLayout, type PhaseBRect } from './PhaseBLayout';

export interface PhaseBHudState {
    readonly qaMode: boolean;
    readonly entryMode: FirstLevelEntryMode;
    readonly guidanceText: string;
    readonly statusText: string;
    readonly gold: number;
    readonly pathLength: number;
    readonly wave: number;
    readonly totalWaves: number;
    readonly coreHealth: number;
    readonly maxCoreHealth: number;
    readonly showPause: boolean;
    readonly phaseText: string;
    readonly phase: BattlePhase;
    readonly waveSpawned: number;
    readonly waveTotal: number;
    readonly activeEnemyCount: number;
    readonly speedMultiplier: number;
    readonly soundEnabled: boolean;
    readonly soundReady: boolean;
    readonly waveStartButton: WaveStartButtonViewModel;
    readonly activePlacementTowerId: TowerId | null;
    readonly inspectedUpgrade: { readonly towerId: TowerId; readonly level: number; readonly cost: number | null; readonly saleRefund: number | null } | null;
    readonly towerPanel?: TowerPanelInput | null;
    readonly upcomingWave: UpcomingWaveBriefing | null;
    readonly result: BattleResultViewModel | null;
    readonly resultRevealProgress: number;
}

/** 管理程序化 HUD 节点与结算文案，Bootstrap 只提供展示快照。 */
export class PhaseBHudView {
    private readonly skins: FirstLevelUiSkinView;
    private readonly towerPanel: FirstLevelTowerPanelView;
    private readonly resultView: FirstLevelResultView;
    private readonly legacyRoot: Node;
    private renderedSignature = '';
    private renderedSafeHalfWidth = Number.NaN;
    private renderedSaleVisible = false;
    private readonly titleLabel: Label;
    private readonly statusLabel: Label;
    private readonly goldLabel: Label;
    private readonly goldIcon: HudResourceIconView;
    private readonly pathLabel: Label;
    private readonly pathIcon: HudResourceIconView;
    private readonly waveLabel: Label;
    private readonly waveIcon: HudResourceIconView;
    private readonly coreLabel: Label;
    private readonly coreIcon: HudResourceIconView;
    private readonly levelLabel: VisibleHudLabel;
    private readonly upcomingLineupLabel: VisibleHudLabel;
    private readonly upcomingTacticLabel: VisibleHudLabel;
    private readonly guidanceLabel: VisibleHudLabel;
    private readonly helpLabel: VisibleHudLabel;
    private readonly speedLabel: Label;
    private readonly soundLabel: Label;
    private readonly earlyWaveLabel: Label;
    private readonly rivetLabel: Label;
    private readonly frostLabel: Label;
    private readonly upgradeLabel: VisibleHudLabel;
    private readonly sellLabel: VisibleHudLabel;

    public constructor(parent: Node, private readonly layout: PhaseBLayout) {
        // 饰面先入树，原生文字后入树；透明边缘不能遮住数值与升级文案。
        this.skins = new FirstLevelUiSkinView(parent);
        this.towerPanel = new FirstLevelTowerPanelView(parent);
        this.legacyRoot = new Node('LegacyQaHud');
        this.legacyRoot.layer = parent.layer;
        parent.addChild(this.legacyRoot);
        parent = this.legacyRoot;
        this.titleLabel = this.createLabel(parent, 46, new Color('#F4D58D'), 875);
        this.statusLabel = this.createLabel(parent, 34, new Color('#D7E6F5'), 805);
        // 事件行只占一行；超长文案截在自身槽内，不能挤进下方金币等关键资源卡。
        this.statusLabel.node.getComponent(UITransform)?.setContentSize(755, 52);
        this.statusLabel.horizontalAlign = HorizontalTextAlignment.LEFT;
        this.statusLabel.overflow = Label.Overflow.CLAMP;
        this.statusLabel.enableWrapText = false;
        this.goldLabel = this.createHudValueLabel(parent, -358, new Color('#F4D58D'));
        this.goldIcon = new HudResourceIconView(parent, 'level-one/ui/gold-coins/spriteFrame', 'GoldCoinsIcon', () => this.invalidateResourceLayout());
        this.pathLabel = this.createHudValueLabel(parent, -120, new Color('#D7E6F5'));
        this.pathIcon = new HudResourceIconView(parent, 'level-one/ui/path-route/spriteFrame', 'PathRouteIcon', () => this.invalidateResourceLayout());
        this.waveLabel = this.createHudValueLabel(parent, 120, new Color('#D7E6F5'));
        this.waveIcon = new HudResourceIconView(parent, 'level-one/ui/wave-beacon/spriteFrame', 'WaveBeaconIcon', () => this.invalidateResourceLayout());
        this.coreLabel = this.createHudValueLabel(parent, 358, new Color('#79E0AD'));
        this.coreIcon = new HudResourceIconView(parent, 'level-one/ui/core-heart/spriteFrame', 'CoreHeartIcon', () => this.invalidateResourceLayout());
        this.levelLabel = new VisibleHudLabel(() => this.createCenteredLabel(parent, 35, new Color('#F4D58D'), 655, 760, 80), 'WaveBanner');
        this.upcomingLineupLabel = new VisibleHudLabel(() => {
            const label = this.createCenteredLabel(parent, 38, new Color('#F4D58D'), 680, 760, 52);
            label.enableWrapText = false;
            return label;
        }, 'UpcomingLineup');
        this.upcomingTacticLabel = new VisibleHudLabel(() => {
            const label = this.createCenteredLabel(parent, 29, new Color('#9DE2CB'), 635, 760, 42);
            label.enableWrapText = false;
            return label;
        }, 'UpcomingTactic');
        // 把操作指引放在重置按钮右侧，不再额外占用一整条底栏；两行仍按手机字号保留。
        this.guidanceLabel = new VisibleHudLabel(() => {
            const label = this.createCenteredLabel(parent, 43, new Color('#D7E6F5'), -560, 700, 100);
            label.lineHeight = 50;
            label.enableWrapText = true;
            return label;
        }, 'BattleGuidance');
        this.helpLabel = new VisibleHudLabel(() => this.createLabel(parent, 28, new Color('#A9C4DB'), -920), 'BattleHelp');
        this.speedLabel = this.createControlLabel(parent, -340, -812);
        this.soundLabel = this.createCenteredLabel(parent, 27, new Color('#E9FFF4'), 845, 170, 105);
        this.soundLabel.node.setPosition(395, 845, 0);
        this.earlyWaveLabel = this.createControlLabel(parent, 340, -812);
        this.rivetLabel = this.createTowerLabel(parent, -89, -854);
        this.frostLabel = this.createTowerLabel(parent, 89, -854);
        this.upgradeLabel = new VisibleHudLabel(() => this.createCenteredLabel(parent, 29, new Color('#18283A'),
            (PHASE_B_UPGRADE_BUTTON.bottom + PHASE_B_UPGRADE_BUTTON.top) / 2, 680, 80), 'TowerUpgrade');
        this.sellLabel = new VisibleHudLabel(() => this.createCenteredLabel(parent, 29, new Color('#FFF0E6'),
            (PHASE_B_SELL_BUTTON.bottom + PHASE_B_SELL_BUTTON.top) / 2, 330, 80), 'TowerSell');
        this.resultView = new FirstLevelResultView(this.legacyRoot.parent!,layout);
    }

    public render(state: PhaseBHudState): void {
        this.skins.render(state);
        this.towerPanel.render(!state.qaMode && !state.result ? state.towerPanel ?? null : null, this.layout.visibleDesignWidth);
        this.resultView.render(state.result,state.resultRevealProgress);
        // 结算由独立视图持有，QA 旧 HUD 也不能与它叠加。
        this.legacyRoot.active = state.qaMode && !state.result;
        if (!this.legacyRoot.active) return;
        this.syncResponsiveLayout(state.inspectedUpgrade?.saleRefund !== null && Boolean(state.inspectedUpgrade));
        const signature = [
            state.qaMode, state.entryMode, state.guidanceText, state.statusText, state.gold, state.pathLength, state.wave, state.totalWaves,
            state.coreHealth, state.phaseText, state.phase, state.waveSpawned, state.waveTotal, state.activeEnemyCount,
            state.speedMultiplier, state.soundEnabled, state.soundReady, state.waveStartButton.label,
            state.waveStartButton.active, state.activePlacementTowerId, state.inspectedUpgrade?.level ?? 0,
            state.upcomingWave?.wave ?? 0, state.upcomingWave?.lineup ?? '', state.upcomingWave?.tactic ?? '',
            state.inspectedUpgrade?.cost ?? -1, state.inspectedUpgrade?.saleRefund ?? -1,
            state.result?.kind ?? '', state.result?.summary ?? '', state.result?.subtitle ?? '',
            state.result?.footnote ?? '', state.result?.runDetails.map(({ value }) => value).join(',') ?? '',
        ].join('|');
        // Bootstrap 仍可提交每帧快照，但 Label 只在展示字段变化时写入，避免 UI 跟随战斗帧率刷新。
        if (signature === this.renderedSignature) return;
        this.renderedSignature = signature;
        const result = state.result;
        this.titleLabel.node.active = !result;
        this.statusLabel.node.active = !result && Boolean(state.statusText);
        this.goldLabel.node.active = !result;
        this.goldIcon.setVisible(!result);
        this.pathLabel.node.active = !result;
        this.pathIcon.setVisible(!result);
        this.waveLabel.node.active = !result;
        this.waveIcon.setVisible(!result);
        this.coreLabel.node.active = !result;
        this.coreIcon.setVisible(!result);
        this.levelLabel.setVisible(!result && !state.qaMode && !state.upcomingWave);
        this.upcomingLineupLabel.setVisible(!result && !state.qaMode && Boolean(state.upcomingWave));
        this.upcomingTacticLabel.setVisible(!result && !state.qaMode && Boolean(state.upcomingWave));
        // 点选炮塔后，升级按钮接管引导区；塔属性缩成上方单行事件，不遮挡资源。
        // 战斗时右侧切成暂停热区；布防提示只在无暂停按钮的阶段出现，避免字压在可点按钮上。
        const guidanceVisible = !result && !state.qaMode && !state.inspectedUpgrade
            && (state.phase === 'preparing' || state.phase === 'paused');
        this.guidanceLabel.setVisible(guidanceVisible);
        // 教学主提示已承担下一步指令；底部小字仅在自由模式或主提示让位时保留，避免首屏三处重复说教。
        this.helpLabel.setVisible(!result && !(state.entryMode === 'guided' && guidanceVisible));
        this.speedLabel.node.active = !result;
        this.soundLabel.node.active = !result;
        this.earlyWaveLabel.node.active = !result;
        this.rivetLabel.node.active = !result;
        this.frostLabel.node.active = !result;
        this.upgradeLabel.setVisible(!result && Boolean(state.inspectedUpgrade));
        this.sellLabel.setVisible(!result && state.inspectedUpgrade?.saleRefund !== null && Boolean(state.inspectedUpgrade));

        if (!result) {
            this.titleLabel.string = state.qaMode ? '夜城防线 · Phase B 八波灰盒' : '夜城防线';
            this.statusLabel.string = hudEventText(state.statusText);
            this.goldLabel.string = resourceCardValueText('金币', state.gold, this.goldIcon.ready);
            this.pathLabel.string = resourceCardValueText('路径', state.pathLength, this.pathIcon.ready, '格');
            this.waveLabel.string = resourceCardValueText('波', `${state.wave}/${state.totalWaves}`, this.waveIcon.ready);
            this.coreLabel.string = resourceCardValueText('核心', state.coreHealth, this.coreIcon.ready);
            this.coreLabel.color = new Color(state.coreHealth <= 3 ? '#FF8580' : '#79E0AD');
            this.levelLabel.setText(firstLevelWaveBanner({
                wave: state.wave,
                spawned: state.waveSpawned,
                total: state.waveTotal,
                activeEnemies: state.activeEnemyCount,
                phase: state.phase,
            }));
            if (state.upcomingWave) {
                this.upcomingLineupLabel.setText(`第 ${state.upcomingWave.wave} 波 · ${state.upcomingWave.lineup}`);
                this.upcomingTacticLabel.setText(state.upcomingWave.tactic);
            }
            this.guidanceLabel.setText(state.guidanceText);
            this.speedLabel.string = `${state.speedMultiplier}×`;
            this.soundLabel.string = state.soundEnabled ? `声音\n${state.soundReady ? '开' : '待启用'}` : '声音\n关';
            this.earlyWaveLabel.string = state.waveStartButton.label;
            this.earlyWaveLabel.color = new Color(state.waveStartButton.active ? '#E9FFF4' : '#718197');
            this.rivetLabel.string = `机枪\n${RIVET_GUN.cost}`;
            this.frostLabel.string = `冷凝\n${FROST_COIL.cost}`;
            this.rivetLabel.color = new Color(state.activePlacementTowerId === 'rivet-gun' ? '#101827' : '#F2E4BF');
            this.frostLabel.color = new Color(state.activePlacementTowerId === 'frost-coil' ? '#101827' : '#DDFBFF');
            // 没有点选塔就不生成升级/出售文案，避免隐藏标签持有无效的 undefined 文本纹理。
            const inspected = state.inspectedUpgrade;
            if (inspected) {
                this.upgradeLabel.setText(inspected.cost === null
                    ? '已满级'
                    : `${state.gold >= inspected.cost ? '升级' : '需'} ${inspected.cost}`,
                    new Color(inspected.cost !== null && state.gold >= inspected.cost ? '#F4E9CD' : '#AEBBC2'));
                if (inspected.saleRefund !== null) this.sellLabel.setText(
                    `${state.phase === 'preparing' ? '撤销' : '出售'} ${inspected.saleRefund}`);
            }
            this.helpLabel.setText(state.qaMode
                ? 'A开局 B补塔 Q/W选塔 X切速 R重置'
                : state.phaseText === '准备态'
                    ? '拖塔落位；点塔查看，再点按钮撤销'
                    : '波间可出售，战斗中仅可升级');
            return;
        }
    }

    private syncResponsiveLayout(saleVisible: boolean): void {
        const safeHalf = this.layout.safeHalfWidth;
        if (safeHalf === this.renderedSafeHalfWidth && saleVisible === this.renderedSaleVisible) return;
        this.renderedSafeHalfWidth = safeHalf;
        this.renderedSaleVisible = saleVisible;
        // 标签、底板与触控热区使用 PhaseBLayout 同一窄屏边界；缩放时不靠裁切藏文字。
        for (const label of [this.titleLabel, this.statusLabel]) {
            label.node.setPosition(-safeHalf, label.node.position.y, 0);
            label.node.getComponent(UITransform)?.setContentSize(safeHalf * 2, 80);
        }
        this.helpLabel.setLayout(label => {
            label.node.setPosition(-safeHalf, label.node.position.y, 0);
            label.node.getComponent(UITransform)?.setContentSize(safeHalf * 2, 50);
        });
        const soundRect = this.layout.fitRect(PHASE_B_SOUND_BUTTON);
        this.statusLabel.node.getComponent(UITransform)?.setContentSize(Math.min(755, soundRect.left + safeHalf - 16), 52);
        const guidance = this.layout.guidanceRect();
        this.guidanceLabel.setLayout(label => {
            label.node.setPosition((guidance.left + guidance.right) / 2,
                (guidance.bottom + guidance.top) / 2, 0);
            label.node.getComponent(UITransform)?.setContentSize(guidance.right - guidance.left,
                guidance.top - guidance.bottom);
        });
        const upgradeRect = this.layout.safeRect(saleVisible ? PHASE_B_UPGRADE_BUTTON : PHASE_B_UPGRADE_FULL_BUTTON);
        this.upgradeLabel.setLayout(label => {
            label.node.setPosition((upgradeRect.left + upgradeRect.right) / 2, label.node.position.y, 0);
            label.node.getComponent(UITransform)?.setContentSize(upgradeRect.right - upgradeRect.left, 80);
        });
        const sellRect = this.layout.safeRect(PHASE_B_SELL_BUTTON);
        this.sellLabel.setLayout(label => {
            label.node.setPosition((sellRect.left + sellRect.right) / 2, label.node.position.y, 0);
            label.node.getComponent(UITransform)?.setContentSize(sellRect.right - sellRect.left, 80);
        });
        this.upcomingLineupLabel.setLayout(label => label.node.getComponent(UITransform)?.setContentSize(Math.min(760, safeHalf * 2), 52));
        this.upcomingTacticLabel.setLayout(label => label.node.getComponent(UITransform)?.setContentSize(Math.min(760, safeHalf * 2), 42));
        this.levelLabel.setLayout(label => label.node.getComponent(UITransform)?.setContentSize(Math.min(760, safeHalf * 2), 80));
        const cards = this.layout.hudCardRects();
        [this.goldLabel, this.pathLabel, this.waveLabel, this.coreLabel].forEach((label, index) => {
            const rect = cards[index];
            label.node.setPosition((rect.left + rect.right) / 2, label.node.position.y, 0);
            label.node.getComponent(UITransform)?.setContentSize(rect.right - rect.left, 64);
        });
        this.layoutResourceCard(this.goldIcon, this.goldLabel, cards[0]);
        this.layoutResourceCard(this.pathIcon, this.pathLabel, cards[1]);
        this.layoutResourceCard(this.waveIcon, this.waveLabel, cards[2]);
        this.layoutResourceCard(this.coreIcon, this.coreLabel, cards[3]);
        for (const [label, button] of [
            [this.speedLabel, PHASE_B_SPEED_BUTTON],
            [this.earlyWaveLabel, PHASE_B_EARLY_WAVE_BUTTON],
            [this.soundLabel, PHASE_B_SOUND_BUTTON],
        ] as const) {
            const rect = button === PHASE_B_SOUND_BUTTON ? soundRect : this.layout.safeRect(button);
            label.node.setPosition((rect.left + rect.right) / 2, label.node.position.y, 0);
            label.node.getComponent(UITransform)?.setContentSize(rect.right - rect.left, rect.top - rect.bottom);
        }
    }

    private invalidateResourceLayout(): void {
        // 资源异步加载成功时只重排对应数值卡，展示签名失效后仍由下一帧统一刷新。
        this.renderedSafeHalfWidth = Number.NaN;
        this.renderedSignature = '';
    }

    private layoutResourceCard(icon: HudResourceIconView, label: Label, rect: PhaseBRect): void {
        icon.setCardRect(rect);
        if (!icon.ready) return;
        // 图标只占左侧，动态数值保留三位宽度；纯文字回退由上方统一居中。
        label.node.setPosition((rect.left + rect.right) / 2 + 28, label.node.position.y, 0);
        label.node.getComponent(UITransform)?.setContentSize(rect.right - rect.left - 58, 64);
    }

    private createTowerLabel(parent: Node, x: number, y: number): Label {
        const label = this.createCenteredLabel(parent, 30, new Color('#F2E4BF'), y, 145, 76);
        label.node.setPosition(x, y, 0);
        label.node.active = true;
        return label;
    }

    private createHudValueLabel(parent: Node, x: number, color: Color): Label {
        const label = this.createCenteredLabel(parent, 38, color, 741, 222, 64);
        label.node.setPosition(x, 741, 0);
        label.node.active = true;
        return label;
    }

    private createControlLabel(parent: Node, x: number, y: number): Label {
        const label = this.createCenteredLabel(parent, 34, new Color('#F2E4BF'), y, 250, 120);
        label.node.setPosition(x, y, 0);
        label.node.active = true;
        return label;
    }

    private createLabel(parent: Node, fontSize: number, color: Color, y: number): Label {
        const node = new Node('Label');
        node.layer = parent.layer;
        node.setPosition(-460, y, 0);
        const transform = node.addComponent(UITransform);
        const label = node.addComponent(Label);
        // Label 挂载时会初始化 UITransform，尺寸必须在挂载后设置，否则 SHRINK 会把按钮字压成细线。
        transform.setContentSize(920, 80);
        transform.setAnchorPoint(0, 0.5);
        label.fontFamily = FIRST_LEVEL_UI_FONT;
        label.fontSize = firstLevelFontSize(fontSize);
        label.lineHeight = Math.round(label.fontSize * 1.25);
        label.color = color;
        label.overflow = Label.Overflow.NONE;
        parent.addChild(node);
        return label;
    }

    private createCenteredLabel(parent: Node, fontSize: number, color: Color, y: number, width: number, height: number): Label {
        const node = new Node('ResultLabel');
        node.layer = parent.layer;
        node.setPosition(0, y, 0);
        const label = node.addComponent(Label);
        const transform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
        transform.setContentSize(width, height);
        transform.setAnchorPoint(0.5, 0.5);
        label.fontFamily = FIRST_LEVEL_UI_FONT;
        label.fontSize = firstLevelFontSize(fontSize);
        label.lineHeight = Math.round(label.fontSize * 1.35);
        label.color = color;
        label.horizontalAlign = HorizontalTextAlignment.CENTER;
        label.verticalAlign = VerticalTextAlignment.CENTER;
        label.overflow = Label.Overflow.CLAMP;
        node.active = false;
        parent.addChild(node);
        return label;
    }
}
