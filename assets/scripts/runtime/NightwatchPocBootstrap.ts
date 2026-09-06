import {
    _decorator,
    Color,
    Component,
    EventTouch,
    game,
    Game,
    Graphics,
    Label,
    Node,
    profiler,
    ResolutionPolicy,
    UITransform,
    Vec3,
    view,
} from 'cc';
import { PHASE_A_FIXTURES } from '../config/PhaseAFixtures';
import { DEFAULT_GRID_ID, PHASE_A_GRIDS, PHASE_A_INITIAL_GOLD, PHASE_A_TOWER_COST } from '../config/PhaseAGrids';
import { cellKey, sameCell, type EnemyRouteState, type GridCell, type GridId } from '../core/GridTypes';
import { PlacementModel, type PlacementPreview } from '../systems/PlacementModel';

const { ccclass } = _decorator;

const DESIGN_WIDTH = 1080;
const DESIGN_HEIGHT = 1920;
const BOARD_TOP = 610;
const BOARD_MAX_WIDTH = 860;
const BOARD_MAX_HEIGHT = 1110;
const TOWER_BUTTON = { left: -160, right: 160, bottom: -890, top: -735 };
const GRID_TABS: readonly { id: GridId; label: string; left: number; right: number }[] = [
    { id: 'grid-9x13', label: '9×13', left: -430, right: -155 },
    { id: 'grid-10x14', label: '10×14', left: -135, right: 135 },
    { id: 'grid-8x13', label: '8×13', left: 155, right: 430 },
];

type InputMode = 'idle' | 'tower-pressed' | 'armed' | 'dragging' | 'click-preview';

interface EnemyRuntime {
    fromCell: GridCell;
    toCell: GridCell;
    progress: number;
}

@ccclass('NightwatchPocBootstrap')
export class NightwatchPocBootstrap extends Component {
    private canvas: Node | null = null;
    private graphics: Graphics | null = null;
    private titleLabel: Label | null = null;
    private statusLabel: Label | null = null;
    private controlLegendLabel: Label | null = null;
    private helpLabel: Label | null = null;
    private phaseButtonLabel: Label | null = null;
    private model = new PlacementModel(PHASE_A_GRIDS[DEFAULT_GRID_ID], PHASE_A_INITIAL_GOLD, PHASE_A_TOWER_COST);
    private selectedGridId: GridId = DEFAULT_GRID_ID;
    private preview: PlacementPreview | null = null;
    private inputMode: InputMode = 'idle';
    private primaryTouchId: number | null = null;
    private pressStart = new Vec3();
    private preparing = true;
    private pausedByLifecycle = false;
    private statusText = '拖动底部炮塔，或点塔后双击格子提交';
    private enemy: EnemyRuntime | null = null;

    protected override onLoad(): void {
        view.setDesignResolutionSize(DESIGN_WIDTH, DESIGN_HEIGHT, ResolutionPolicy.FIXED_HEIGHT);
        this.canvas = this.findCanvas();
        if (!this.canvas) throw new Error('Phase A 场景缺少 Canvas');

        const layer = new Node('PhaseAProgrammaticLayer');
        layer.layer = this.canvas.layer;
        const transform = layer.addComponent(UITransform);
        transform.setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
        this.canvas.addChild(layer);
        // Graphics 独立放在第一个子节点，保证网格和按钮底板不会覆盖后续 Label。
        const graphicsNode = new Node('PhaseAGraphics');
        graphicsNode.layer = layer.layer;
        const graphicsTransform = graphicsNode.addComponent(UITransform);
        graphicsTransform.setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
        layer.addChild(graphicsNode);
        this.graphics = graphicsNode.addComponent(Graphics);
        this.titleLabel = this.createLabel(layer, 46, new Color('#F4D58D'), 850);
        this.statusLabel = this.createLabel(layer, 27, new Color('#D7E6F5'), 755);
        this.statusLabel.node.getComponent(UITransform)?.setContentSize(920, 125);
        this.controlLegendLabel = this.createLabel(layer, 22, new Color('#AFC6DA'), 705);
        this.helpLabel = this.createLabel(layer, 25, new Color('#8FA9C4'), -945);
        for (const tab of GRID_TABS) this.createCenteredLabel(layer, tab.label, 28, (tab.left + tab.right) / 2, 655, tab.right - tab.left);
        this.createCenteredLabel(layer, '重置网格', 28, -270, -557, 320);
        this.phaseButtonLabel = this.createCenteredLabel(layer, '开始运行', 28, 270, -557, 320);
        this.createCenteredLabel(layer, '短折线 +4', 26, -300, -655, 260);
        this.createCenteredLabel(layer, '长蛇 ≥80%', 26, 300, -655, 260);
        this.createCenteredLabel(layer, `铆钉塔  ${PHASE_A_TOWER_COST}`, 30, 0, -865, 300);

        this.canvas.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.canvas.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.canvas.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.canvas.on(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
        game.on(Game.EVENT_HIDE, this.onLifecycleHide, this);
        profiler.hideStats();
        this.resetEnemy();
        this.redraw();
    }

    protected override start(): void {
        // 调试构建可能在 onLoad 后自动开启统计层，延迟一帧关闭，避免遮挡 POC 控件。
        this.scheduleOnce(() => profiler.hideStats(), 0);
    }

    protected override onDestroy(): void {
        this.cancelInput('场景销毁');
        this.canvas?.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.canvas?.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.canvas?.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.canvas?.off(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
        game.off(Game.EVENT_HIDE, this.onLifecycleHide, this);
    }

    protected override update(deltaTime: number): void {
        profiler.hideStats();
        if (!this.preparing && !this.pausedByLifecycle) this.advanceEnemy(Math.min(deltaTime, 0.05));
        this.redraw();
    }

    private findCanvas(): Node | null {
        const scene = this.node.scene;
        if (!scene) return null;
        return scene.getChildByName('Canvas');
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

    private createCenteredLabel(parent: Node, text: string, fontSize: number, x: number, y: number, width: number): Label {
        const node = new Node(`Label-${text}`);
        node.layer = parent.layer;
        node.setPosition(x - width / 2, y, 0);
        const transform = node.addComponent(UITransform);
        const label = node.addComponent(Label);
        transform.setContentSize(width, 100);
        transform.setAnchorPoint(0, 0.5);
        label.fontSize = fontSize;
        label.lineHeight = Math.round(fontSize * 1.5);
        label.color = new Color('#F2E4BF');
        label.overflow = Label.Overflow.NONE;
        parent.addChild(node);
        label.string = text;
        return label;
    }

    private onTouchStart(event: EventTouch): void {
        const id = event.getID();
        if (this.primaryTouchId !== null && this.primaryTouchId !== id) return;
        this.primaryTouchId = id;
        const point = this.localPoint(event);
        this.pressStart.set(point);

        if (this.handleTopControls(point)) {
            this.primaryTouchId = null;
            return;
        }
        if (this.insideRect(point, TOWER_BUTTON)) {
            this.inputMode = 'tower-pressed';
            this.preview = null;
            this.statusText = '拖到网格落塔；轻点则进入点击建塔';
            return;
        }
        this.handleGridTap(point);
    }

    private onTouchMove(event: EventTouch): void {
        if (event.getID() !== this.primaryTouchId || this.inputMode !== 'tower-pressed' && this.inputMode !== 'dragging') return;
        const point = this.localPoint(event);
        if (this.inputMode === 'tower-pressed' && Vec3.distance(point, this.pressStart) > 18) this.inputMode = 'dragging';
        if (this.inputMode === 'dragging') this.updatePreviewAt(point);
    }

    private onTouchEnd(event: EventTouch): void {
        if (event.getID() !== this.primaryTouchId) return;
        if (this.inputMode === 'dragging') {
            this.commitCurrentPreview();
        } else if (this.inputMode === 'tower-pressed') {
            this.inputMode = 'armed';
            this.statusText = '已选炮塔：点格子预览，再点同一格提交';
        }
        this.primaryTouchId = null;
    }

    private onTouchCancel(event: EventTouch): void {
        if (event.getID() === this.primaryTouchId) this.cancelInput('触摸已取消，未扣费');
    }

    private onLifecycleHide(): void {
        // 首次生命周期阻塞统一取消活动手势，恢复后保持暂停，避免后台补跑敌人。
        this.cancelInput('页面进入后台：操作取消，战斗保持暂停');
        if (!this.preparing) this.pausedByLifecycle = true;
    }

    private handleTopControls(point: Vec3): boolean {
        if (point.y >= 610 && point.y <= 700) {
            for (const tab of GRID_TABS) {
                if (point.x >= tab.left && point.x <= tab.right) {
                    this.switchGrid(tab.id);
                    return true;
                }
            }
        }
        if (point.y >= -700 && point.y <= -610 && point.x >= -440 && point.x <= -160) {
            this.applyFixture('shortFold');
            return true;
        }
        if (point.y >= -700 && point.y <= -610 && point.x >= 160 && point.x <= 440) {
            this.applyFixture('longSnake');
            return true;
        }
        if (point.y >= -600 && point.y <= -515 && point.x >= -440 && point.x <= -100) {
            this.resetGrid();
            return true;
        }
        if (point.y >= -600 && point.y <= -515 && point.x >= 100 && point.x <= 440) {
            if (this.pausedByLifecycle) {
                this.pausedByLifecycle = false;
                this.preparing = false;
                this.statusText = '已主动继续运行';
            } else {
                this.preparing = !this.preparing;
                this.statusText = this.preparing ? '准备态：点击已有塔可全额撤销' : '运行态：敌人开始移动，可战斗中改路';
            }
            return true;
        }
        return false;
    }

    private handleGridTap(point: Vec3): void {
        const cell = this.pointToCell(point);
        if (!cell) return;
        if (this.inputMode === 'armed') {
            this.preview = this.model.preview(cell, this.enemyStates());
            this.inputMode = 'click-preview';
            this.statusText = this.preview.accepted ? '预览合法：再点同一格提交' : this.rejectText(this.preview.reason);
            return;
        }
        if (this.inputMode === 'click-preview') {
            if (this.preview && sameCell(this.preview.cell, cell)) this.commitCurrentPreview();
            else {
                this.preview = this.model.preview(cell, this.enemyStates());
                this.statusText = this.preview.accepted ? '已更换预览格：再点同一格提交' : this.rejectText(this.preview.reason);
            }
            return;
        }
        if (this.inputMode === 'idle' && this.model.towers.has(cellKey(cell))) {
            const sold = this.model.sell(cell, this.preparing && !this.pausedByLifecycle);
            this.statusText = sold ? '准备态全额撤销成功' : '运行中不可出售；切回准备态再撤销';
        }
    }

    private updatePreviewAt(point: Vec3): void {
        const cell = this.pointToCell(point);
        if (!cell) {
            this.preview = null;
            this.statusText = '画布或战场外：松手将取消';
            return;
        }
        if (this.preview && sameCell(this.preview.cell, cell)) return;
        this.preview = this.model.preview(cell, this.enemyStates());
        this.statusText = this.preview.accepted ? `合法落点 (${cell.column},${cell.row})` : this.rejectText(this.preview.reason);
    }

    private commitCurrentPreview(): void {
        if (!this.preview) {
            this.cancelInput('没有有效落点，未扣费');
            return;
        }
        const result = this.model.commit(this.preview, this.enemyStates());
        this.statusText = result.accepted
            ? `建造成功 · 金币 ${result.gold} · 地图版本 ${result.mapVersion}`
            : this.rejectText(result.reason);
        this.preview = null;
        this.inputMode = 'idle';
    }

    private cancelInput(message: string): void {
        this.primaryTouchId = null;
        this.preview = null;
        this.inputMode = 'idle';
        this.statusText = message;
    }

    private switchGrid(id: GridId): void {
        this.selectedGridId = id;
        this.resetGrid();
        this.statusText = `已切换 ${PHASE_A_GRIDS[id].columns}×${PHASE_A_GRIDS[id].rows}，证据需独立记录`;
    }

    private resetGrid(initialGold = PHASE_A_INITIAL_GOLD): void {
        this.model = new PlacementModel(PHASE_A_GRIDS[this.selectedGridId], initialGold, PHASE_A_TOWER_COST);
        this.preparing = true;
        this.pausedByLifecycle = false;
        this.cancelInput('已重置为空网格');
        this.resetEnemy();
    }

    private applyFixture(kind: 'shortFold' | 'longSnake'): void {
        const cells = PHASE_A_FIXTURES[this.selectedGridId][kind];
        this.resetGrid(kind === 'longSnake' ? 450 : 120);
        for (const cell of cells) {
            const preview = this.model.preview(cell, []);
            const result = this.model.commit(preview, []);
            if (!result.accepted) throw new Error(`${kind} fixture 无法提交：${result.reason}`);
        }
        this.statusText = `${kind === 'shortFold' ? '短折线' : '长蛇形'} fixture · 路径 ${this.model.flowField.distanceAt(this.model.grid.entry)} 格`;
    }

    private resetEnemy(): void {
        const next = this.model.flowField.nextCell(this.model.grid.entry);
        this.enemy = next ? { fromCell: this.model.grid.entry, toCell: next, progress: 0 } : null;
    }

    private advanceEnemy(deltaTime: number): void {
        if (!this.enemy) return;
        this.enemy.progress += deltaTime;
        if (this.enemy.progress < 1) return;
        if (sameCell(this.enemy.toCell, this.model.grid.exit)) {
            this.resetEnemy();
            return;
        }
        const next = this.model.flowField.nextCell(this.enemy.toCell, this.enemy.fromCell);
        if (!next) {
            this.preparing = true;
            this.statusText = '诊断失败：敌人在格心没有非回头路线';
            return;
        }
        this.enemy = { fromCell: this.enemy.toCell, toCell: next, progress: this.enemy.progress - 1 };
    }

    private enemyStates(): readonly EnemyRouteState[] {
        // 生命周期暂停只冻结时间，不抹掉敌人的已承诺路段；恢复前仍不可在 from/to 格落塔。
        if (!this.enemy || this.preparing) return [];
        return [{ id: 'phase-a-enemy', ...this.enemy }];
    }

    private boardMetrics(): { cellSize: number; left: number; bottom: number; width: number; height: number } {
        const grid = this.model.grid;
        const cellSize = Math.floor(Math.min(BOARD_MAX_WIDTH / grid.columns, BOARD_MAX_HEIGHT / grid.rows));
        const width = cellSize * grid.columns;
        const height = cellSize * grid.rows;
        return { cellSize, width, height, left: -width / 2, bottom: BOARD_TOP - height };
    }

    private pointToCell(point: Vec3): GridCell | null {
        const metrics = this.boardMetrics();
        if (point.x < metrics.left || point.x >= metrics.left + metrics.width) return null;
        if (point.y < metrics.bottom || point.y >= metrics.bottom + metrics.height) return null;
        return {
            column: Math.floor((point.x - metrics.left) / metrics.cellSize),
            row: Math.floor((metrics.bottom + metrics.height - point.y) / metrics.cellSize),
        };
    }

    private cellCenter(cell: GridCell): Vec3 {
        const metrics = this.boardMetrics();
        return new Vec3(
            metrics.left + (cell.column + 0.5) * metrics.cellSize,
            metrics.bottom + metrics.height - (cell.row + 0.5) * metrics.cellSize,
            0,
        );
    }

    private localPoint(event: EventTouch): Vec3 {
        const location = event.getUILocation();
        const transform = this.canvas?.getComponent(UITransform);
        return transform?.convertToNodeSpaceAR(new Vec3(location.x, location.y, 0)) ?? new Vec3();
    }

    private redraw(): void {
        const graphics = this.graphics;
        if (!graphics) return;
        graphics.clear();
        graphics.fillColor = new Color('#101827');
        graphics.rect(-540, -960, 1080, 1920);
        graphics.fill();

        this.drawTabs(graphics);
        this.drawBoard(graphics);
        this.drawControls(graphics);
        if (this.titleLabel) this.titleLabel.string = '夜城防线 · Phase A 风险 POC';
        if (this.statusLabel) {
            const path = this.preview?.path?.length ? this.preview.path.length - 1 : this.model.flowField.distanceAt(this.model.grid.entry);
            this.statusLabel.string = `${this.statusText}\n金币 ${this.model.gold}  ·  路径 ${path} 格  ·  ${this.preparing ? '准备态' : this.pausedByLifecycle ? '后台暂停' : '运行态'}\n上排：9×13｜10×14｜8×13　下排：重置｜运行　样例：短折｜长蛇`;
        }
        if (this.helpLabel) this.helpLabel.string = '程序色块仅验证玩法风险｜拖拽松手提交｜点击建塔需同格二次确认｜准备态点塔撤销';
        if (this.controlLegendLabel) this.controlLegendLabel.string = '上排网格：9×13｜10×14｜8×13　下排：重置｜运行　样例：短折｜长蛇';
        if (this.phaseButtonLabel) this.phaseButtonLabel.string = this.pausedByLifecycle ? '主动继续' : this.preparing ? '开始运行' : '回准备态';
    }

    private drawTabs(graphics: Graphics): void {
        for (const tab of GRID_TABS) {
            graphics.fillColor = tab.id === this.selectedGridId ? new Color('#C68A35') : new Color('#263A55');
            graphics.rect(tab.left, 610, tab.right - tab.left, 90);
            graphics.fill();
        }
    }

    private drawBoard(graphics: Graphics): void {
        const metrics = this.boardMetrics();
        const activePath = this.preview?.accepted && this.preview.path
            ? this.preview.path
            : this.model.flowField.pathFrom(this.model.grid.entry);

        if (activePath && activePath.length > 1) {
            graphics.strokeColor = this.preview?.accepted ? new Color('#5FE1A2') : new Color('#5E8FC6');
            graphics.lineWidth = Math.max(10, metrics.cellSize * 0.18);
            const first = this.cellCenter(activePath[0]);
            graphics.moveTo(first.x, first.y);
            for (let index = 1; index < activePath.length; index += 1) {
                const point = this.cellCenter(activePath[index]);
                graphics.lineTo(point.x, point.y);
            }
            graphics.stroke();
        }

        for (let row = 0; row < this.model.grid.rows; row += 1) {
            for (let column = 0; column < this.model.grid.columns; column += 1) {
                const cell = { column, row };
                const center = this.cellCenter(cell);
                const half = metrics.cellSize / 2;
                let fill = new Color(31, 47, 67, 160);
                if (sameCell(cell, this.model.grid.entry)) fill = new Color('#5678D4');
                else if (sameCell(cell, this.model.grid.exit)) fill = new Color('#D65F5F');
                else if (this.model.towers.has(cellKey(cell))) fill = new Color('#D5A84B');
                if (this.preview && sameCell(cell, this.preview.cell)) {
                    fill = this.preview.accepted ? new Color('#45C486') : new Color('#E05252');
                }
                graphics.fillColor = fill;
                graphics.rect(center.x - half + 3, center.y - half + 3, metrics.cellSize - 6, metrics.cellSize - 6);
                graphics.fill();
                graphics.strokeColor = new Color(111, 143, 169, 130);
                graphics.lineWidth = 2;
                graphics.rect(center.x - half, center.y - half, metrics.cellSize, metrics.cellSize);
                graphics.stroke();
                if (this.model.towers.has(cellKey(cell))) {
                    graphics.fillColor = new Color('#172235');
                    graphics.circle(center.x, center.y, metrics.cellSize * 0.22);
                    graphics.fill();
                }
            }
        }

        if (this.enemy && !this.preparing) {
            const from = this.cellCenter(this.enemy.fromCell);
            const to = this.cellCenter(this.enemy.toCell);
            const x = from.x + (to.x - from.x) * this.enemy.progress;
            const y = from.y + (to.y - from.y) * this.enemy.progress;
            graphics.fillColor = new Color('#F06A63');
            graphics.circle(x, y, metrics.cellSize * 0.25);
            graphics.fill();
            graphics.strokeColor = new Color('#FFF1CF');
            graphics.lineWidth = 4;
            graphics.circle(x, y, metrics.cellSize * 0.25);
            graphics.stroke();
        }
    }

    private drawControls(graphics: Graphics): void {
        this.drawButton(graphics, -440, -600, 340, 85);
        this.drawButton(graphics, 100, -600, 340, 85);
        this.drawButton(graphics, -440, -700, 280, 90);
        this.drawButton(graphics, 160, -700, 280, 90);
        graphics.fillColor = this.model.gold >= PHASE_A_TOWER_COST ? new Color('#D5A84B') : new Color('#596273');
        graphics.rect(TOWER_BUTTON.left, TOWER_BUTTON.bottom, TOWER_BUTTON.right - TOWER_BUTTON.left, TOWER_BUTTON.top - TOWER_BUTTON.bottom);
        graphics.fill();
        graphics.fillColor = new Color('#263043');
        graphics.circle(0, -800, 44);
        graphics.fill();
    }

    private drawButton(graphics: Graphics, x: number, y: number, width: number, height: number): void {
        graphics.fillColor = new Color('#29405C');
        graphics.rect(x, y, width, height);
        graphics.fill();
    }

    private insideRect(point: Vec3, rect: { left: number; right: number; bottom: number; top: number }): boolean {
        return point.x >= rect.left && point.x <= rect.right && point.y >= rect.bottom && point.y <= rect.top;
    }

    private rejectText(reason: PlacementPreview['reason']): string {
        const messages: Record<string, string> = {
            'out-of-bounds': '不能建造：战场外',
            entry: '不能建造：入口格',
            exit: '不能建造：出口格',
            occupied: '不能建造：已有炮塔',
            'enemy-current-cell': '不能建造：敌人当前格',
            'enemy-committed-cell': '不能建造：敌人下一步',
            'would-block-path': '不能建造：会彻底封路',
            'would-force-backtrack': '不能建造：会迫使敌人回头',
            'insufficient-gold': '不能建造：金币不足',
            'stale-preview': '预览已过期，请重新选择',
        };
        return messages[reason ?? ''] ?? '不能建造';
    }
}
