const test=require('node:test');
const assert=require('node:assert/strict');
const {FirstLevelExperience}=require('../.test-dist/presentation/FirstLevelExperience');
const {firstLevelCoachPresentation,firstLevelCoachSkipVisible}=require('../.test-dist/presentation/FirstLevelCoachPresentation');
const {FIRST_LEVEL_OPENING,FIRST_LEVEL_REINFORCEMENTS}=require('../.test-dist/config/FirstLevelOpening');
const key=c=>`${c.column},${c.row}`;
const context={preparing:false,towerCount:5,pathDelta:4,previewAccepted:null,inputMode:'idle',gold:0,phase:'paused',wave:1,
    occupiedCells:new Set([...FIRST_LEVEL_OPENING,FIRST_LEVEL_REINFORCEMENTS[0]].map(x=>key(x.cell))),
    towerLevelsByCell:new Map([['1,7',2]]),guidedIntermissionHeld:true};
test('引导明确开始，第一波操作完成后给出结束提示，继续后不再暂停或高亮',()=>{
    const flow=new FirstLevelExperience(false);assert.equal(flow.status,'idle');flow.begin();flow.begin();assert.equal(flow.status,'active');
    const snapshot=flow.snapshot(context);assert.equal(snapshot.readyToFinishTutorial,true);
    const ui=firstLevelCoachPresentation({experience:snapshot,phase:'paused',preparing:false,held:true,overlayVisible:false,panelVisible:false,guidanceText:'',countdownSeconds:8});
    assert.equal(ui.title,'新手引导完成');assert.match(ui.body,/第二波/);
    flow.finish();flow.finish('interrupted');assert.equal(flow.status,'completed');assert.equal(flow.entryMode,'free');
    for(let wave=1;wave<8;wave++)assert.equal(flow.shouldHoldIntermission(wave,8),false);
    assert.equal(flow.snapshot(context).step,null);assert.equal(firstLevelCoachSkipVisible(flow.entryMode,'countdown',false,false,false),false);
});
test('跳过、失败、回首页再次开始分别收口，不能把中断冒充完成',()=>{
    const flow=new FirstLevelExperience(false);flow.begin();flow.skip();assert.equal(flow.status,'skipped');assert.equal(flow.entryMode,'free');
    flow.returnHome();assert.equal(flow.status,'idle');flow.begin();flow.finish('interrupted');assert.equal(flow.status,'interrupted');
    flow.returnHome();flow.begin();assert.equal(flow.status,'active');assert.equal(flow.shouldHoldIntermission(1,8),true);
});
