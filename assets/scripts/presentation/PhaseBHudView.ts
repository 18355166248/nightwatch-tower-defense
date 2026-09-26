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
import { firstLevelWaveBanner } from './FirstLevelWaveBanner';
import { hudEventText } from './PhaseBHudText';
import { PHASE_B_UPGRADE_BUTTON } from './PhaseBLayout';

export interface PhaseBHudState {
    readonly qaMode: boolean;
    readonly guidanceText: string;
    readonly statusText: string;
    readonly gold: number;
    readonly pathLength: number;
    readonly wave: number;
    readonly totalWaves: number;
    readonly coreHealth: number;
    readonly phaseText: string;
    readonly phase: BattlePhase;
    readonly waveSpawned: number;
    readonly waveTotal: number;
    readonly activeEnemyCount: number;
    readonly speedMultiplier: number;
    readonly soundEnabled: boolean;
    readonly soundReady: boolean;
    readonly canStartNextWaveEarly: boolean;
    readonly countdownSeconds: number;
    readonly selectedTowerId: TowerId;
    readonly inspectedUpgrade: { readonly level: number; readonly cost: number | null } | null;
    readonly result: BattleResultViewModel | null;
}

/** 管理程序化 HUD 节点与结算文案，Bootstrap 只提供展示快照。 */
export class PhaseBHudView {
    private renderedSignature = '';
    private readonly titleLabel: Label;
    private readonly statusLabel: Label;
    private readonly goldLabel: Label;
    private readonly pathLabel: Label;
    private readonly waveLabel: Label;
    private readonly coreLabel: Label;
    private readonly levelLabel: Label;
    private readonly guidanceLabel: Label;
    private readonly helpLabel: Label;
    private readonly speedLabel: Label;
    private readonly soundLabel: Label;
    private readonly earlyWaveLabel: Label;
    private readonly rivetLabel: Label;
    private readonly frostLabel: Label;
    private readonly upgradeLabel: Label;
    private readonly resultTitleLabel: Label;
    private readonly resultSummaryLabel: Label;
    private readonly resultActionLabel: Label;

    public constructor(parent: Node) {
        this.titleLabel = this.createLabel(parent, 46, new Color('#F4D58D'), 875);
        this.statusLabel = this.createLabel(parent, 34, new Color('#D7E6F5'), 805);
        // 事件行只占一行；超长文案截在自身槽内，不能挤进下方金币等关键资源卡。
        this.statusLabel.node.getComponent(UITransform)?.setContentSize(755, 52);
        this.statusLabel.horizontalAlign = HorizontalTextAlignment.LEFT;
        this.statusLabel.overflow = Label.Overflow.CLAMP;
        this.statusLabel.enableWrapText = false;
        this.goldLabel = this.createHudValueLabel(parent, -358, new Color('#F4D58D'));
        this.pathLabel = this.createHudValueLabel(parent, -120, new Color('#D7E6F5'));
        this.waveLabel = this.createHudValueLabel(parent, 120, new Color('#D7E6F5'));
        this.coreLabel = this.createHudValueLabel(parent, 358, new Color('#79E0AD'));
        this.levelLabel = this.createCenteredLabel(parent, 35, new Color('#F4D58D'), 655, 760, 80);
        this.guidanceLabel = this.createCenteredLabel(parent, 34, new Color('#D7E6F5'), -655, 920, 125);
        this.helpLabel = this.createLabel(parent, 30, new Color('#A9C4DB'), -930);
        this.speedLabel = this.createControlLabel(parent, -340, -812);
        this.soundLabel = this.createCenteredLabel(parent, 27, new Color('#E9FFF4'), 845, 170, 105);
        this.soundLabel.node.setPosition(395, 845, 0);
        this.earlyWaveLabel = this.createControlLabel(parent, 340, -812);
        this.rivetLabel = this.createTowerLabel(parent, -89, -854);
        this.frostLabel = this.createTowerLabel(parent, 89, -854);
        this.upgradeLabel = this.createCenteredLabel(parent, 32, new Color('#18283A'),
            (PHASE_B_UPGRADE_BUTTON.bottom + PHASE_B_UPGRADE_BUTTON.top) / 2, 680, 80);
        this.resultTitleLabel = this.createCenteredLabel(parent, 64, new Color('#F4D58D'), 230, 760, 100);
        this.resultSummaryLabel = this.createCenteredLabel(parent, 34, new Color('#D7E6F5'), 25, 760, 190);
        this.resultActionLabel = this.createCenteredLabel(parent, 38, new Color('#101827'), -218, 600, 120);
    }

    public render(state: PhaseBHudState): void {
        const signature = [
            state.qaMode, state.guidanceText, state.statusText, state.gold, state.pathLength, state.wave, state.totalWaves,
            state.coreHealth, state.phaseText, state.phase, state.waveSpawned, state.waveTotal, state.activeEnemyCount,
            state.speedMultiplier, state.soundEnabled, state.soundReady, state.canStartNextWaveEarly,
            Math.ceil(state.countdownSeconds), state.selectedTowerId, state.inspectedUpgrade?.level ?? 0,
            state.inspectedUpgrade?.cost ?? -1, state.result?.kind ?? '', state.result?.summary ?? '',
        ].join('|');
        // Bootstrap 仍可提交每帧快照，但 Label 只在展示字段变化时写入，避免 UI 跟随战斗帧率刷新。
        if (signature === this.renderedSignature) return;
        this.renderedSignature = signature;
        const result = state.result;
        this.titleLabel.node.active = !result;
        this.statusLabel.node.active = !result;
        this.goldLabel.node.active = !result;
        this.pathLabel.node.active = !result;
        this.waveLabel.node.active = !result;
        this.coreLabel.node.active = !result;
        this.levelLabel.node.active = !result && !state.qaMode;
        // 点选炮塔后，升级按钮接管引导区；塔属性缩成上方单行事件，不遮挡资源。
        this.guidanceLabel.node.active = !result && !state.qaMode && !state.inspectedUpgrade;
        this.helpLabel.node.active = !result;
        this.speedLabel.node.active = !result;
        this.soundLabel.node.active = !result;
        this.earlyWaveLabel.node.active = !result;
        this.rivetLabel.node.active = !result;
        this.frostLabel.node.active = !result;
        this.upgradeLabel.node.active = !result && Boolean(state.inspectedUpgrade);
        this.resultTitleLabel.node.active = Boolean(result);
        this.resultSummaryLabel.node.active = Boolean(result);
        this.resultActionLabel.node.active = Boolean(result);

        if (!result) {
            this.titleLabel.string = state.qaMode ? '夜城防线 · Phase B 八波灰盒' : '夜城防线';
            this.statusLabel.string = hudEventText(state.statusText);
            this.goldLabel.string = `金币 ${state.gold}`;
            this.pathLabel.string = `路径 ${state.pathLength}`;
            this.waveLabel.string = `波 ${state.wave}/${state.totalWaves}`;
            this.coreLabel.string = `核心 ${state.coreHealth}`;
            this.coreLabel.color = new Color(state.coreHealth <= 3 ? '#FF8580' : '#79E0AD');
            this.levelLabel.string = firstLevelWaveBanner({
                wave: state.wave,
                spawned: state.waveSpawned,
                total: state.waveTotal,
                activeEnemies: state.activeEnemyCount,
                phase: state.phase,
            });
            this.guidanceLabel.string = state.guidanceText;
            this.speedLabel.string = `速度\n${state.speedMultiplier}×`;
            this.soundLabel.string = state.soundEnabled ? `音效\n${state.soundReady ? '开' : '待启用'}` : '音效\n关';
            this.earlyWaveLabel.string = state.canStartNextWaveEarly
                ? `提前开波\n${Math.ceil(state.countdownSeconds)} 秒`
                : '提前开波\n等待中';
            this.earlyWaveLabel.color = new Color(state.canStartNextWaveEarly ? '#E9FFF4' : '#718197');
            this.rivetLabel.string = `机枪\n${RIVET_GUN.cost}`;
            this.frostLabel.string = `冷凝\n${FROST_COIL.cost}`;
            this.rivetLabel.color = new Color(state.selectedTowerId === 'rivet-gun' ? '#101827' : '#F2E4BF');
            this.frostLabel.color = new Color(state.selectedTowerId === 'frost-coil' ? '#101827' : '#DDFBFF');
            this.upgradeLabel.string = state.inspectedUpgrade?.cost === null
                ? '已满级 · 当前 Lv2'
                : `升级至 Lv2 · ${state.inspectedUpgrade?.cost} 金币`;
            this.upgradeLabel.color = new Color(state.inspectedUpgrade?.cost !== null && state.gold >= (state.inspectedUpgrade?.cost ?? Infinity) ? '#18283A' : '#D9E3E9');
            this.helpLabel.string = state.qaMode
                ? '先建 2 塔且路径 +2｜Q/W选塔 J混合样例｜X切速 N提前开波｜F/G/H样例 R重置'
                : state.phaseText === '准备态'
                    ? '点已建塔看射程/升级，再点撤销 · 拖塔或选塔后双击格子'
                    : '点已建塔看射程与升级 · 战斗中不可撤销';
            return;
        }
        this.resultTitleLabel.string = result.title;
        this.resultTitleLabel.color = new Color(result.kind === 'victory' ? '#79E0AD' : '#FF8580');
        this.resultSummaryLabel.string = result.summary;
        this.resultActionLabel.string = result.actionLabel;
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
        label.fontSize = fontSize;
        label.lineHeight = Math.round(fontSize * 1.25);
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
        label.fontSize = fontSize;
        label.lineHeight = Math.round(fontSize * 1.35);
        label.color = color;
        label.horizontalAlign = HorizontalTextAlignment.CENTER;
        label.verticalAlign = VerticalTextAlignment.CENTER;
        label.overflow = Label.Overflow.CLAMP;
        node.active = false;
        parent.addChild(node);
        return label;
    }
}
