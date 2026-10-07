import { LEVELS, type LevelId } from '../config/LevelCatalog';
import type { PhaseBPoint, PhaseBRect } from './PhaseBLayout';

export interface CampaignStage {
    readonly id: LevelId;
    readonly label: string;
    readonly district: string;
    readonly briefing: string;
    readonly difficulty: string;
    readonly guided: boolean;
    readonly waveCount: number;
    readonly bestSeconds: number | null;
    readonly bestHealth: number | null;
}

/** 地图节点按关卡目录顺序生成；新增关卡只扩配置，分页和点击不依赖第一/第二关编号。 */
export function campaignStages(records: (id: LevelId) => { bestSeconds: number | null; bestHealth: number | null }): CampaignStage[] {
    return (Object.keys(LEVELS) as LevelId[]).map(id => {
        const level = LEVELS[id];
        return { id, label: level.label, ...level.campaign, waveCount: level.waves.length, ...records(id) };
    });
}

export type CampaignScreen = 'welcome' | 'map';
export interface CampaignSnapshot {
    readonly screen: CampaignScreen;
    readonly selectedIndex: number;
    readonly page: number;
}
export class CampaignMenu {
    private state: CampaignSnapshot = { screen: 'welcome', selectedIndex: 0, page: 0 };
    public get snapshot(): CampaignSnapshot { return this.state; }
    public openMap(): void { this.state = { ...this.state, screen: 'map' }; }
    public welcome(): void { this.state = { ...this.state, screen: 'welcome' }; }
    public select(index: number, count: number): void {
        if (!Number.isInteger(index) || index < 0 || index >= count) return;
        this.state = { screen: 'map', selectedIndex: index, page: Math.floor(index / 3) };
    }
    public turnPage(delta: number, count: number): void {
        const page = Math.max(0, Math.min(Math.ceil(count / 3) - 1, this.state.page + delta));
        this.state = { screen: 'map', page, selectedIndex: page * 3 };
    }
}

export function campaignLayout(visibleWidth: number, state: CampaignSnapshot, count: number) {
    const half = Math.min(490, Math.max(230, visibleWidth / 2 - 48));
    const rect = (x: number, y: number, w: number, h: number): PhaseBRect => ({ left:x-w/2, right:x+w/2, bottom:y-h/2, top:y+h/2 });
    return {
        half,
        settings: rect(half - 58, 815, 116, 116),
        back: rect(-half + 58, 815, 116, 116),
        start: rect(0, -645, Math.min(800, half * 2 - 60), 150),
        hero: rect(0, 165, half * 2, 640),
        deploy: rect(0, -730, half * 2 - 60, 140),
        previous: rect(-half+65, -340, 130, 100),
        next: rect(half-65, -340, 130, 100),
        stages: Array.from({ length: Math.max(0, Math.min(3, count - state.page * 3)) }, (_, slot) => {
            const index = state.page * 3 + slot;
            const x = (slot % 2 === 0 ? -1 : 1) * Math.min(155, half * 0.35);
            const y = 450 - slot * 310;
            return { index, x, y, hit: rect(x,y,200,200) };
        }),
    };
}

export type CampaignAction = 'settings' | 'back' | 'start' | 'deploy' | 'previous' | 'next' | { select: number };
export function campaignAction(point: PhaseBPoint, width: number, state: CampaignSnapshot, count: number): CampaignAction | null {
    const layout = campaignLayout(width, state, count);
    const inside = (r: PhaseBRect) => point.x >= r.left && point.x <= r.right && point.y >= r.bottom && point.y <= r.top;
    if (inside(layout.settings)) return 'settings';
    if (state.screen === 'welcome') return inside(layout.start) ? 'start' : null;
    if (inside(layout.back)) return 'back';
    if (inside(layout.deploy) && count > 0) return 'deploy';
    if (state.page > 0 && inside(layout.previous)) return 'previous';
    if ((state.page + 1) * 3 < count && inside(layout.next)) return 'next';
    const stage = layout.stages.find(stage => inside(stage.hit));
    return stage ? { select: stage.index } : null;
}
