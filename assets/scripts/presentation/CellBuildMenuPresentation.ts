import { PHASE_B_TOWERS, type TowerId } from '../config/PhaseBCombatConfig';
import type { GridCell, GridDefinition } from '../core/GridTypes';
import type { PhaseBLayout, PhaseBPoint, PhaseBRect } from './PhaseBLayout';

export interface CellBuildOption { readonly towerId: TowerId; readonly enabled: boolean; readonly reason: string; }
export interface CellBuildMenuInput { readonly cell: GridCell; readonly options: readonly CellBuildOption[]; readonly detailTowerId?: TowerId; }
/** 只有说明卡限制在屏幕内；菜单本体不再为HUD或边缘移动圆心。 */
export function battleFloatingBounds(layout:PhaseBLayout):PhaseBRect {
    const scale=Math.min(1080,layout.visibleDesignWidth)/390;
    return {left:-Math.min(1080,layout.visibleDesignWidth)/2+4*scale,right:Math.min(1080,layout.visibleDesignWidth)/2-4*scale,
        top:960-4*scale,bottom:-960+4*scale};
}

export function cellBuildMenuLayout(layout: PhaseBLayout, grid: GridDefinition, cell: GridCell, count = PHASE_B_TOWERS.length) {
    return radialMenuLayout(layout,layout.gridPointCenter(cell,grid),layout.boardMetrics(grid).cellSize,count);
}

/** 固定完整圆周模板，圆心始终为真实塔位；使用图标、价牌和等级点的矩形占位，不能只比较圆心距离。 */
export function radialMenuLayout(layout:PhaseBLayout,center:PhaseBPoint,cellSize:number,count:number,extraSpacing=0) {
    if(count<1||count>5)throw new RangeError('建造菜单只支持一至五种塔');
    const scale=Math.min(1080,layout.visibleDesignWidth)/390,size=60*scale,gap=8*scale;
    const upgrade=extraSpacing>0,head=(upgrade?24:2)*scale,foot=(upgrade?9:4)*scale;
    const startAngle=count===4?Math.PI/4:Math.PI/2,stepAngle=count===1?0:Math.PI*2/count;
    const units=Array.from({length:count},(_,i)=>({x:Math.cos(startAngle-i*stepAngle),y:Math.sin(startAngle-i*stepAngle)}));
    let radius=Math.max(cellSize*.48+size/2+gap+extraSpacing,upgrade?83*scale:0);
    // 任意两张完整卡片至少在一个轴上分离，防止圆形不相交但下方价牌互相挤压。
    for(let i=0;i<count;i++)for(let j=i+1;j<count;j++){
        const dx=Math.abs(units[i].x-units[j].x),dy=Math.abs(units[i].y-units[j].y);
        radius=Math.max(radius,Math.min(dx<1e-6?Infinity:(size+gap)/dx,dy<1e-6?Infinity:(size+head+foot+gap)/dy));
    }
    const local=units.map(u=>({left:u.x*radius-size/2,right:u.x*radius+size/2,bottom:u.y*radius-size/2,top:u.y*radius+size/2}));
    const occupied=local.map(r=>({...r,top:r.top+head,bottom:r.bottom-foot}));
    // 最新交互以真实塔位为唯一圆心；HUD、其他塔及棋盘边缘都不能把圆环推离选中塔。
    const menuCenter=center;
    const translate=(r:PhaseBRect):PhaseBRect=>({left:r.left+menuCenter.x,right:r.right+menuCenter.x,bottom:r.bottom+menuCenter.y,top:r.top+menuCenter.y});
    const options=local.map(translate),footprints=occupied.map(translate);
    const panel={left:Math.min(...footprints.map(r=>r.left)),right:Math.max(...footprints.map(r=>r.right)),
        bottom:Math.min(...footprints.map(r=>r.bottom)),top:Math.max(...footprints.map(r=>r.top))};
    return {panel,options,footprints,scale,center,menuCenter,radius,startAngle,stepAngle,span:Math.PI*2};
}

/** 说明跟随被查看的塔，优先左右贴近；窄屏或边缘整卡避让，不能盖住其他购买按钮。 */
export function cellBuildDetailLayout(layout:PhaseBLayout,geometry:Pick<ReturnType<typeof cellBuildMenuLayout>,'options'|'center'|'scale'> & {footprints?:readonly PhaseBRect[]},index:number):PhaseBRect {
    const anchor=geometry.options[index],s=geometry.scale,w=146*s,h=84*s,gap=8*s;
    const x=(anchor.left+anchor.right)/2,y=(anchor.bottom+anchor.top)/2,bounds=battleFloatingBounds(layout);
    const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
    const rect=(cx:number,cy:number):PhaseBRect=>{
        cx=clamp(cx,bounds.left+w/2,bounds.right-w/2);
        cy=clamp(cy,bounds.bottom+h/2,bounds.top-h/2);
        return {left:cx-w/2,right:cx+w/2,bottom:cy-h/2,top:cy+h/2};
    };
    const overlaps=(a:PhaseBRect,b:PhaseBRect)=>a.left<b.right+4*s&&a.right>b.left-4*s&&a.bottom<b.top+4*s&&a.top>b.bottom-4*s;
    const center={left:geometry.center.x-16*s,right:geometry.center.x+16*s,bottom:geometry.center.y-16*s,top:geometry.center.y+16*s};
    const safe=(r:PhaseBRect)=>!(geometry.footprints??geometry.options).some(option=>overlaps(r,option))&&!overlaps(r,center);
    const candidates=[rect(anchor.right+gap+w/2,y),rect(anchor.left-gap-w/2,y),
        rect(x,anchor.top+gap+h/2),rect(x,anchor.bottom-gap-h/2)];
    const nearby=candidates.find(safe);if(nearby)return nearby;
    // 角落菜单没有左右空位时找最近空白，保持说明与购买命中区完全分离。
    let best:PhaseBRect|null=null,distance=Infinity;
    for(let cy=bounds.bottom+h/2;cy<=bounds.top-h/2;cy+=16*s)for(let cx=bounds.left+w/2;cx<=bounds.right-w/2;cx+=16*s){
        const r=rect(cx,cy),d=Math.hypot(cx-x,cy-y);if(d<distance&&safe(r)){best=r;distance=d;}
    }
    if(!best)throw new RangeError('战场安全区不足以显示塔说明');
    return best;
}

export function cellBuildMenuAction(point: PhaseBPoint, geometry: ReturnType<typeof cellBuildMenuLayout>): number | null {
    const index=geometry.options.findIndex(r=>Math.hypot(point.x-(r.left+r.right)/2,point.y-(r.top+r.bottom)/2)<=(r.right-r.left)/2);
    return index>=0 ? index : null;
}
