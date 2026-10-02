const test = require('node:test');
const assert = require('node:assert/strict');
const { CombatVisualAnchors } = require('../.test-dist/presentation/CombatVisualAnchors.js');
const { layeredTowerEmissionPoint, RIVET_GUN_LAYER_SPEC } = require('../.test-dist/presentation/LayeredTowerGeometry.js');
const { CombatFeedbackRuntime } = require('../.test-dist/presentation/CombatFeedbackRuntime.js');

test('显示坐标按目标ID隔离，快照复制不回写规则点，每帧清除残留', () => {
    const anchors = new CombatVisualAnchors(), fallback = {x:10,y:20}, displayed = {x:13,y:25};
    anchors.target('enemy-a',displayed); displayed.x=999;
    assert.deepEqual(anchors.resolveTarget('enemy-a',fallback),{x:13,y:25});
    assert.deepEqual(anchors.resolveTarget('enemy-b',fallback),fallback);
    anchors.emitter('4,3',{x:40,y:80});
    assert.deepEqual(anchors.resolveEmitter('4,3',fallback),{x:40,y:80});
    anchors.begin();
    assert.equal(anchors.resolveTarget('enemy-a',fallback),fallback);
    assert.equal(anchors.resolveEmitter('4,3',fallback),fallback);
    assert.deepEqual(fallback,{x:10,y:20});
});

test('炮口位置与独立炮身的轴点、角度、缩放和后坐力共用几何', () => {
    const spec={...RIVET_GUN_LAYER_SPEC,canvasScale:1,activeScaleX:1,activeScaleY:1,
        activeX:0,activeY:0,activePivotX:.5,activePivotY:.5,emitterX:.5,emitterY:1};
    assert.deepEqual(layeredTowerEmissionPoint({x:10,y:20},100,null,spec),{x:10,y:73});
    const rotated=layeredTowerEmissionPoint({x:10,y:20},100,{x:2,y:-4,scaleX:1,scaleY:2},spec,90);
    assert.ok(Math.abs(rotated.x-(-88))<1e-10);
    assert.ok(Math.abs(rotated.y-19)<1e-10);
});

test('射击、命中、炮头共享同一事实目标ID，表现适配不改变伤害事件', () => {
    const feedback=new CombatFeedbackRuntime();
    const shot={towerCell:{column:4,row:3},towerId:'rivet-gun',targetId:'enemy-a',
        targetPoint:{column:3.9,row:2.4},damage:7,lethal:false,appliedSlow:false};
    feedback.consume({shots:[shot],killed:[],leaked:[],spawningCompleted:false});
    for(const channel of ['tracers','impacts','aims'])assert.equal(feedback.snapshot[channel][0].targetId,'enemy-a');
    assert.deepEqual(shot.targetPoint,{column:3.9,row:2.4}); assert.equal(shot.damage,7);
});
