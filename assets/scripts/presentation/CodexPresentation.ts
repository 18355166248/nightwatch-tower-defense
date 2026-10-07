import { ALL_TOWERS } from '../config/ThirdLevelCombatConfig';
import { LEVELS } from '../config/LevelCatalog';
import type { EnemyId } from '../config/PhaseBCombatConfig';
import { towerAtLevel, towerInvestment } from '../systems/TowerLevelRules';
import { towerRole } from '../config/TowerCatalog';
import type { PhaseBRect } from './PhaseBLayout';

export interface CodexState { readonly category: 'towers' | 'enemies'; readonly index: number; readonly level: 1 | 2 | 3; }
const enemyAdvice: Record<EnemyId, readonly [string,string]> = {
    'clockwork-infantry': ['普通集群 · 持续推进','机枪塔持续输出，冷凝塔延长火力覆盖。'],
    'clockwork-runner': ['高速突进 · 容易漏防','冷凝塔优先减速，配合机枪塔补足伤害。'],
    'iron-canister-hauler': ['高生命 · 缓慢推进','冷凝塔拖住推进，升级火力集中击杀。'],
    'siege-tank': ['重型装甲 · 抵挡伤害','穿甲炮优先锁定坦克，绕过大部分护甲。'],
    'shield-guard': ['能量护盾 · 先盾后血','电弧塔优先破盾，破盾后配合其他火力。'],
};
// 从实际波次生成敌人目录及数值范围，后续关卡扩展不会继续显示过期的基础血量。
export function codexEnemies() {
    const entries = new Map<EnemyId, {id:EnemyId; label:string; health:number[]; speed:number[]; reward:number[]; armor:number[]; shield:number[]; levels:string[]}>();
    for (const level of Object.values(LEVELS)) for (const wave of level.waves) for (const {enemy} of wave.groups) {
        let item=entries.get(enemy.id);
        if(!item){item={id:enemy.id,label:enemy.label,health:[],speed:[],reward:[],armor:[],shield:[],levels:[]};entries.set(enemy.id,item);}
        item.health.push(enemy.maxHealth);item.speed.push(enemy.speedCellsPerSecond);item.reward.push(enemy.killReward);
        item.armor.push((enemy.armorReduction??0)*100);item.shield.push(enemy.maxShield??0);
        if(!item.levels.includes(level.label))item.levels.push(level.label);
    }
    // Creator发布转译对迭代器展开存在差异，显式转数组保证浏览器拿到完整目录。
    return Array.from(entries.values());
}
export function codexCount(category: CodexState['category']): number {return category==='towers'?ALL_TOWERS.length:codexEnemies().length;}
function range(values:readonly number[],digits=0):string {
    const format=(n:number)=>Number(n.toFixed(digits)).toString(),min=Math.min(...values),max=Math.max(...values);
    return min===max?format(min):`${format(min)}–${format(max)}`;
}
export function codexEntry(state:CodexState) {
    if(state.category==='towers') {
        const tower=ALL_TOWERS[state.index],stats=towerAtLevel(tower,state.level);
        const advice=tower.id==='rivet-gun'?'擅长持续输出；面对护甲和护盾需搭配专用塔。':tower.id==='frost-coil'?
            `速度降至 ${Math.round((stats.effect?.speedMultiplier??1)*100)}% · 持续 ${stats.effect?.durationSeconds} 秒`:
            tower.id==='piercing-cannon'?`忽略 ${Math.round((tower.armorIgnore??0)*100)}% 护甲 · 对护盾伤害较低`:`护盾伤害 ×${tower.shieldDamageMultiplier} · 护甲仍会减伤`;
        return {id:tower.id,label:tower.label,role:towerRole(tower.id),level:state.level,
            stats:[['单次伤害',`${stats.damage}`],['射程',`${stats.rangeCells} 格`],['攻击间隔',`${stats.attackIntervalSeconds} 秒`],
                [state.level===1?'建造费用':'本次升级',`${stats.cost} 金币`]],
            advice,footnote:`累计投入 ${towerInvestment(tower,state.level)} 金币 · 图鉴浏览不购买炮塔`};
    }
    const enemy=codexEnemies()[state.index],advice=enemyAdvice[enemy.id];
    return {id:enemy.id,label:enemy.label,role:advice[0],level:1,
        stats:[['生命',range(enemy.health)],['移速',`${range(enemy.speed,2)} 格/秒`],['护甲减伤',`${range(enemy.armor)}%`],['初始护盾',range(enemy.shield)]],
        advice:advice[1],footnote:`出没：${enemy.levels.join('、')}\n属性范围包含各关卡、各波次的实际数值`};
}
export function codexLayout(width:number) {
    const half=Math.min(490,Math.max(230,width/2-48));
    const rect=(x:number,y:number,w:number,h:number):PhaseBRect=>({left:x-w/2,right:x+w/2,bottom:y-h/2,top:y+h/2});
    return {tabs:[rect(-half/2,650,half-16,150),rect(half/2,650,half-16,150)],
        previous:rect(-half+72,270,144,160),next:rect(half-72,270,144,160),
        tiers:[1,2,3].map((_,i)=>rect((i-1)*half*.6,-30,half*.56,144))};
}
