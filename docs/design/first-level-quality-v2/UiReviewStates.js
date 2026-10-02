/** 只供设计评审的展示快照，不是经济规则；确认后由Cocos真实状态构造同类视图模型。 */
export const UI_REVIEW_STATES = Object.freeze({
    battle: { name:'战斗中', gold:'54', level:'Lv.2', stats:'伤害 11 · 射程 2.8', upgrade:'升级 42', upgradeDisabled:false, sell:'战斗中不可出售', sellDisabled:true, next:'来袭中', nextDisabled:true },
    ready: { name:'波间可升级', gold:'90', level:'Lv.2', stats:'伤害 11 · 射程 2.8', upgrade:'升级 42', upgradeDisabled:false, sell:'出售 37', sellDisabled:false, next:'下一波', nextDisabled:false },
    poor: { name:'金币不足', gold:'24', level:'Lv.2', stats:'伤害 11 · 射程 2.8', upgrade:'需 42 金币', upgradeDisabled:true, sell:'出售 37', sellDisabled:false, next:'下一波', nextDisabled:false },
    max: { name:'满级', gold:'54', level:'Lv.3', stats:'伤害 18 · 射程 3.2', upgrade:'已满级', upgradeDisabled:true, sell:'出售 67', sellDisabled:false, next:'下一波', nextDisabled:false },
});
