import { FROST_COIL, RIVET_GUN, type TowerId } from '../config/PhaseBCombatConfig';
import type { PlacementRejectReason } from '../core/GridTypes';
import { nextUpgradeCost, towerAtLevel } from '../systems/TowerLevelRules';
import type { PhaseBPoint, PhaseBRect } from './PhaseBLayout';

export interface TowerPanelInput {
    readonly towerId: TowerId;
    readonly level: number;
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
    const base = input.towerId === 'frost-coil' ? FROST_COIL : RIVET_GUN;
    const current = towerAtLevel(base, input.level);
    const cost = nextUpgradeCost(base, input.level);
    const next = cost === null ? null : towerAtLevel(base, input.level + 1);
    const power = (tower: typeof current) => tower.effect ? `${Math.round((1 - tower.effect.speedMultiplier) * 100)}%` : `${tower.damage}`;
    const placement = input.placement;
    return {
        towerId: input.towerId, title: base.label, badge: placement ? '建造预览' : `Lv.${input.level}`,
        role: current.effect ? '范围减速 · 优先控制疾行机' : '稳定单体输出',
        stats: [
            { caption: current.effect ? '范围减速' : '单次伤害', value: power(current) },
            { caption: '射程', value: `${current.rangeCells} 格` },
            { caption: current.effect ? '持续时间' : '攻击间隔', value: `${current.effect?.durationSeconds ?? current.attackIntervalSeconds} 秒` },
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
export function firstLevelTowerPanelLayout(visibleWidth: number) {
    const scale = Math.min(1080, visibleWidth) / 390;
    const bottom = -764 + 12 * scale;
    const top = bottom + 205 * scale;
    const rect = (x: number, y: number, w: number, h: number): PhaseBRect => ({
        left: (x - 195) * scale, right: (x + w - 195) * scale, top: top - y * scale, bottom: top - (y + h) * scale,
    });
    const text = (x: number, y: number, w: number, h: number, size: number, bold = false) => ({rect: rect(x,y,w,h),size:size*scale,bold});
    return {
        scale, panel: rect(12,0,366,205), portrait: rect(30,13,36,36),
        title: text(76,14.5,49,20,14,true), badge: text(125,17.5,150,15,11), role: text(76,34.5,220,15,10),
        close: text(300,13,60,38,11), closeHit: rect(300,5,54,54),
        captions: [30,144,258].map(x=>text(x,55,102,15,10)),
        values: [30,144,258].map(x=>text(x,70,102,20,13)),
        divider: rect(30,94,330,1), preview: text(30,100,330,17,11),
        sell: rect(30,122,136.17,54), upgrade: rect(176.17,122,183.83,54),
        actionSize: 12*scale, help:text(30,178,330,15,10),
    };
}

export type TowerPanelAction = 'close' | 'sell' | 'upgrade' | 'surface' | null;
/** 禁用按钮及面板空白也消费触摸，防止点穿饰面把下面的塔/落点误选。 */
export function firstLevelTowerPanelAction(point: PhaseBPoint, layout: ReturnType<typeof firstLevelTowerPanelLayout>): TowerPanelAction {
    const inside=(rect:PhaseBRect)=>point.x>=rect.left&&point.x<=rect.right&&point.y>=rect.bottom&&point.y<=rect.top;
    return inside(layout.closeHit)?'close':inside(layout.sell)?'sell':inside(layout.upgrade)?'upgrade':inside(layout.panel)?'surface':null;
}
