const test=require('node:test');
const assert=require('node:assert/strict');
const {towerVisualRank}=require('../.test-dist/presentation/TowerVisualRank.js');
const {firstLevelTowerPanelPresentation:present}=require('../.test-dist/presentation/FirstLevelTowerPanelPresentation.js');
const {PlacementModel}=require('../.test-dist/systems/PlacementModel.js');
const {PHASE_A_GRIDS,DEFAULT_GRID_ID}=require('../.test-dist/config/PhaseAGrids.js');
const {PHASE_B_TOWERS}=require('../.test-dist/config/PhaseBCombatConfig.js');
test('冷凝三级静止形态用核心尺寸、散热翼和级标数量区分',()=>{
    const ranks=[1,2,3].map(towerVisualRank);
    assert.deepEqual(ranks.map(x=>x.rank),[1,2,3]);
    assert.deepEqual(ranks.map(x=>x.fins),[0,1,2]);
    assert.ok(ranks[0].coreScale<ranks[1].coreScale&&ranks[1].coreScale<ranks[2].coreScale);
});
test('鼠标悬停说明要求先定位，不误显示松手建造或启用确认',()=>{
    const panel=present({towerId:'frost-coil',level:1,gold:140,saleRefund:null,opening:true,hover:true,placement:{accepted:true,clickConfirm:false}});
    assert.match(panel.preview,/已拿起冷凝塔/);assert.match(panel.help,/点击定位/);
    assert.equal(panel.upgradeEnabled,false);assert.doesNotMatch(panel.preview,/松手/);
});
test('满级拆除五折退累计投入，重复拆除不返金且流场立即更新',()=>{
    for(const tower of PHASE_B_TOWERS){
        const model=new PlacementModel(PHASE_A_GRIDS[DEFAULT_GRID_ID],400,PHASE_B_TOWERS);
        const cell={column:4,row:3};
        assert.ok(model.commit(model.preview(cell,[],tower.id),[]).accepted);
        assert.ok(model.upgrade(cell).accepted);assert.ok(model.upgrade(cell).accepted);
        const invested=tower.cost+tower.upgrade.cost+tower.finalUpgrade.cost;
        assert.equal(model.saleQuote(cell,'combat'),Math.floor(invested*.5));
        const gold=model.gold,version=model.mapVersion;
        assert.equal(model.sell(cell,'combat'),true);
        assert.equal(model.gold,gold+Math.floor(invested*.5));assert.equal(model.mapVersion,version+1);
        assert.equal(model.flowField.distanceAt(model.grid.entry),12);
        assert.equal(model.sell(cell,'combat'),false);assert.equal(model.gold,gold+Math.floor(invested*.5));
    }
});
