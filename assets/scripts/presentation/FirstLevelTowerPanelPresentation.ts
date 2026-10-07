import { cellBuildDetailLayout, radialMenuLayout } from './CellBuildMenuPresentation';
import { towerDefinition, towerRole } from '../config/TowerCatalog';
import { type TowerId } from '../config/PhaseBCombatConfig';
import type { PlacementRejectReason } from '../core/GridTypes';
import { nextUpgradeCost, towerAtLevel } from '../systems/TowerLevelRules';
import { PhaseBLayout, type PhaseBPoint, type PhaseBRect } from './PhaseBLayout';

export interface TowerPanelInput {
    readonly anchor?: { readonly center: PhaseBPoint; readonly cellSize: number };
    readonly towerId: TowerId;
    readonly level: number;
    readonly hoverAction?: 'upgrade' | 'sell';
    readonly gold: number;
    readonly saleRefund: number | null;
    readonly opening: boolean;
    readonly hover?: boolean;
    readonly combat?: boolean;
    readonly placement?: { readonly accepted: boolean; readonly reason?: PlacementRejectReason; readonly clickConfirm: boolean };
}

const REJECTION: Record<PlacementRejectReason, string> = {
    'out-of-bounds': '战场外不能建造', entry: '入口必须保持畅通', exit: '出口必须保持畅通', occupied: '已有炮塔占据此格',
    'enemy-current-cell': '敌人正在此格', 'enemy-committed-cell': '敌人即将进入此格', 'would-block-path': '道路必须保持连通',
    'would-force-backtrack': '不能迫使敌人回头', 'insufficient-gold': '金币不足', 'stale-preview': '预览已过期，请重选位置',
};

/** 只适配真实配置与校验快照，不持有经济/寻路；禁用原因不能被UI自行推断为交易成功。 */
export function firstLevelTowerPanelPresentation(input: TowerPanelInput) {
    const base = towerDefinition(input.towerId);
    const current = towerAtLevel(base, input.level);
    const cost = nextUpgradeCost(base, input.level);
    const next = cost === null ? null : towerAtLevel(base, input.level + 1);
    const power = (tower: typeof current) => tower.effect ? `${Math.round((1 - tower.effect.speedMultiplier) * 100)}%` : `${tower.damage}`;
    const placement = input.placement;
    return {
        towerId: input.towerId, title: base.label, badge: placement ? '建造预览' : `Lv.${input.level}`,
        levelPips: [1,2,3].map(level=>({level,purchased:level<=input.level})),
        nextLevel: next ? input.level + 1 : null,
        role: input.towerId === 'frost-coil' ? '范围减速 · 优先控制疾行机' : input.towerId === 'rivet-gun' ? '稳定单体输出' : towerRole(input.towerId),
        stats: [
            { caption: current.effect ? '范围减速' : '单次伤害', value: power(current), nextValue: next ? power(next) : null },
            { caption: '射程', value: `${current.rangeCells} 格`, nextValue: next ? `${next.rangeCells} 格` : null },
            { caption: current.effect ? '持续时间' : '攻击间隔', value: `${current.effect?.durationSeconds ?? current.attackIntervalSeconds} 秒`, nextValue: next ? `${next.effect?.durationSeconds ?? next.attackIntervalSeconds} 秒` : null },
        ],
        preview: placement ? placement.accepted ? input.hover ? `已拿起${base.label} · 点击选择落点 · ${base.cost} 金币` : `可放置：${placement.clickConfirm ? '再次点落点' : '松手'}建造 · 消耗 ${base.cost} 金币`
            : `不可放置：${placement.reason ? REJECTION[placement.reason] : '请重选位置'}`
            : next ? `下一级：${current.effect ? '减速' : '伤害'} ${power(current)} → ${power(next)} · 射程 ${current.rangeCells} → ${next.rangeCells}`
                : '已达到最高等级 · 无需继续投入',
        sell: placement ? '取消建造' : input.saleRefund === null ? '当前不可移除' : `${input.opening ? '撤销' : input.combat ? '拆除' : '出售'} · +${input.saleRefund}`,
        upgrade: placement ? placement.accepted ? placement.clickConfirm ? `确认建造 · ${base.cost}` : input.hover ? '点击地图定位' : '松手建造' : '不可放置'
            : cost === null ? '已满级' : input.gold >= cost ? `升级 · ${cost}` : `还差 ${cost - input.gold} 金币`,
        saleEnabled: Boolean(placement) || input.saleRefund !== null,
        upgradeEnabled: placement ? placement.clickConfirm && placement.accepted : cost !== null && input.gold >= cost,
        invalid: Boolean(placement && !placement.accepted),
        help: placement ? placement.clickConfirm ? '点落点或确认建造 · 取消不扣金币' : input.hover ? '鼠标移动预览 · 点击定位后再次确认' : '拖动至空地 · 松手前不扣金币'
            : input.saleRefund === null ? '当前阶段不可移除' : input.opening ? '战前撤销返还全部投入' : input.combat ? '战斗拆除返还总投入50% · 移除后重算路线' : '波间出售返还总投入70%',
    };
}

/** 同一获批面板相对常驻塔栏顶部锚定；不缩放/移动棋盘，也不因面板隐藏而留下空槽。 */
function rectangularTowerPanelLayout(visibleWidth: number, placement = false, anchor?: TowerPanelInput['anchor']) {
    const scale = Math.min(1080, visibleWidth) / 390;
    const height = (placement ? 84 : 268) * scale;
    const width = 366 * scale;
    const half = Math.min(1080,visibleWidth)/2-24;
    const above = anchor ? anchor.center.y + anchor.cellSize/2 + 10*scale : 0;
    // 详情贴近真实塔位，优先放上方；边缘空间不足则放下方并限制在HUD/塔栏之间。
    const bottom = anchor && !placement ? Math.max(-730,Math.min(730-height,
        above+height<=730 ? above : anchor.center.y-anchor.cellSize/2-10*scale-height)) : -764 + 12 * scale;
    const shiftX = anchor && !placement ? Math.max(-half,Math.min(anchor.center.x-width/2,half-width)) + 183*scale : 0;
    const top = bottom + (placement ? 84 : 268) * scale;
    const rect = (x: number, y: number, w: number, h: number): PhaseBRect => ({
        left: (x - 195) * scale + shiftX, right: (x + w - 195) * scale + shiftX, top: top - y * scale, bottom: top - (y + h) * scale,
    });
    const text = (x: number, y: number, w: number, h: number, size: number, bold = false) => ({rect: rect(x,y,w,h),size:size*scale,bold});
    const compact = placement ? {
        panel: rect(12,0,366,84), title: text(30,3,100,16,12,true), badge: text(140,3,140,16,10),
        close: text(300,1,60,20,10), closeHit: rect(300,0,54,32),
        preview: text(30,19,330,16,11), sell: rect(30,36,136.17,44), upgrade: rect(176.17,36,183.83,44),
    } : {};
    // 建造只占棋盘与常驻塔栏之间的空隙，不能用详情面板拦截下排落点；渲染与命中共用此布局。
    return {
        ring: null as ReturnType<typeof radialMenuLayout> | null, scale, panel: rect(12,0,366,268), portrait: rect(30,13,36,36),
        title: text(26,9,180,24,16,true), badge: text(208,12,72,18,11), role: text(26,33,260,16,10),
        close: text(300,13,60,38,11), closeHit: rect(300,5,54,54),
        currentArt: rect(42,55,116,80), nextArt: rect(232,55,116,80),
        currentBadge: text(32,130,140,18,11,true), nextBadge: text(222,130,140,18,11,true),
        arrow: text(174,76,42,40,25,true),
        captions: [26,142,258].map(x=>text(x,156,106,16,10)),
        values: [26,142,258].map(x=>text(x,173,106,22,12,true)),
        divider: rect(30,94,330,1), preview: text(30,100,330,17,11),
        sell: rect(26,202,132,54), upgrade: rect(170,202,194,54),
        actionSize: 12*scale, help:text(30,178,330,15,10), ...compact,
    };
}

/** 就地升级共用建造圆环；旧 QA 和拖放预览仍保留紧凑矩形条。 */
export function firstLevelTowerPanelLayout(visibleWidth: number, placement = false, anchor?: TowerPanelInput['anchor']) {
    const base=rectangularTowerPanelLayout(visibleWidth,placement,anchor);
    if (!anchor || placement) return base;
    const board=new PhaseBLayout();board.setVisibleWidth(visibleWidth);
    // 升级价牌伸出按钮下缘，预留少量空间避免盖住中央真实塔。
    const ring=radialMenuLayout(board,anchor.center,anchor.cellSize,2,12*base.scale);
    return {...base,ring,panel:ring.panel,upgrade:ring.options[0],sell:ring.options[1],closeHit:null};
}

/** 悬停说明独立于菜单展开；避让包含塔图超出按钮的部分及价格牌，而非只检查点击矩形。 */
export function firstLevelTowerPanelDetail(input:TowerPanelInput,width:number) {
    if(!input.anchor||input.placement||!input.hoverAction)return null;
    const model=firstLevelTowerPanelPresentation(input),g=firstLevelTowerPanelLayout(width,false,input.anchor),s=g.scale;
    const board=new PhaseBLayout();board.setVisibleWidth(width);
    const protectedRects=[{...g.upgrade,top:g.upgrade.top+24*s,bottom:g.upgrade.bottom-9*s},g.sell,
        {left:input.anchor.center.x-28*s,right:input.anchor.center.x+28*s,bottom:input.anchor.center.y-28*s,top:input.anchor.center.y+40*s}];
    const index=input.hoverAction==='upgrade'?0:1;
    const rect=cellBuildDetailLayout(board,{options:protectedRects,center:input.anchor.center,scale:s},index);
    return {rect,protectedRects,
        title:index===0?`${model.title} · Lv.${model.nextLevel??input.level}`:'回收炮塔',
        body:index===0?model.nextLevel?`${model.stats[0].caption} ${model.stats[0].nextValue}\n射程 ${model.stats[1].nextValue}`:model.role:
            input.saleRefund===null?'当前阶段不能回收':input.opening?'战前返还全部投入':input.combat?'战斗返还总投入50%':'波间返还总投入70%',
        footer:index===0?model.upgrade:input.saleRefund===null?'当前不可回收':`返还 ${input.saleRefund} 金币`,
        enabled:index===0?model.upgradeEnabled:model.saleEnabled};
}

/** 悬停范围包含实际塔图和价牌，不能让伸出圆钮的炮头没有说明。 */
export function firstLevelTowerPanelHoverAction(point:PhaseBPoint,g:ReturnType<typeof firstLevelTowerPanelLayout>):'upgrade'|'sell'|null {
    if(!g.ring)return null;
    const inside=(r:PhaseBRect)=>point.x>=r.left&&point.x<=r.right&&point.y>=r.bottom&&point.y<=r.top;
    if(inside({...g.upgrade,top:g.upgrade.top+24*g.scale,bottom:g.upgrade.bottom-9*g.scale}))return 'upgrade';
    return inside(g.sell)?'sell':null;
}

export type TowerPanelAction = 'close' | 'sell' | 'upgrade' | 'surface' | null;
/** 禁用按钮及面板空白也消费触摸，防止点穿饰面把下面的塔/落点误选。 */
export function firstLevelTowerPanelAction(point: PhaseBPoint, layout: ReturnType<typeof firstLevelTowerPanelLayout>): TowerPanelAction {
    // 就地菜单的价牌和炮头也属于操作区域，不能显示可点却被当作空白收起。
    if(layout.ring)return firstLevelTowerPanelHoverAction(point,layout);
    const inside=(rect:PhaseBRect|null)=>Boolean(rect&&point.x>=rect.left&&point.x<=rect.right&&point.y>=rect.bottom&&point.y<=rect.top);
    return inside(layout.closeHit)?'close':inside(layout.sell)?'sell':inside(layout.upgrade)?'upgrade':!layout.ring&&inside(layout.panel)?'surface':null;
}
