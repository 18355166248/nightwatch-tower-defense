const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { parseDirectionalSpriteLayout } = require('../.test-dist/presentation/DirectionalSpriteLayout.js');
const { directionalCollapseFrame, directionalCollapseOpacity, compatibleDirectionalCollapse }
    = require('../.test-dist/presentation/DirectionalCollapse.js');
const read = name => JSON.parse(readFileSync(resolve(__dirname,
    `../assets/resources/level-one/units/clockwork-infantry-${name}-layout.json`), 'utf8'));
const walk = parseDirectionalSpriteLayout(read('walk-rig-v2'), 'walk');
const source = read('collapse-rig-v1');
const collapse = parseDirectionalSpriteLayout(source, 'collapse');

test('同模型死亡真实16帧，单次loop和两倍画布/地面锚点兼容，不猜尺寸或时间', () => {
    assert.ok(collapse);
    assert.equal(collapse.textureWidth, 1024);
    assert.equal(compatibleDirectionalCollapse(walk, collapse, .3), true);
    assert.equal(compatibleDirectionalCollapse(walk, collapse, .34), false);
    assert.equal(compatibleDirectionalCollapse(null, collapse, .3), false);
    assert.equal(compatibleDirectionalCollapse(walk, { ...collapse, anchor: [.5,.6] }, .3), false);
    const looping = structuredClone(source); looping.states[0].loop = true;
    assert.equal(parseDirectionalSpriteLayout(looping, 'collapse'), null);
    assert.equal(parseDirectionalSpriteLayout(source, 'walk'), null);
});

test('死亡按逐帧75ms推进、末帧停住、暂停幂等，减弱动态直接使用最终姿态', () => {
    const frames = collapse.frames.down;
    assert.deepEqual([0,.074,.075,.149,.150,.224,.225,.299,.3,.8]
        .map(elapsed => directionalCollapseFrame(.3-elapsed,.3,frames,false)), [0,0,1,1,2,2,3,3,3,3]);
    assert.equal(directionalCollapseFrame(.2,.3,frames,false), directionalCollapseFrame(.2,.3,frames,false));
    assert.equal(directionalCollapseFrame(.3,.3,frames,true),3);
    assert.equal(directionalCollapseFrame(NaN,.3,frames,false),3);
    const timed = frames.map((frame, index) => ({ ...frame, durationMs: [25,50,100,125][index] }));
    assert.equal(directionalCollapseFrame(.26,.3,timed,false),1);
    assert.equal(directionalCollapseFrame(.15,.3,timed,false),2);
});

test('死亡不延长反馈寿命，仅末段淡出；画布增大仍保持行走相同地面注册', () => {
    assert.equal(directionalCollapseOpacity(.3),255);
    assert.equal(directionalCollapseOpacity(.075),255);
    assert.equal(directionalCollapseOpacity(.0375),128);
    assert.equal(directionalCollapseOpacity(0),0);
    const baseSize = 90;
    assert.ok(Math.abs((collapse.anchor[1]-.5)*baseSize*2 - (walk.anchor[1]-.5)*baseSize) < 1e-5);
    const render = JSON.parse(readFileSync(resolve(__dirname,
        '../art-source/first-level-units/clockwork-infantry-rig-collapse-v1/render/render-manifest.json'), 'utf8'));
    assert.equal(render.frameCount,16);
    assert.equal(render.displayScaleFromWalk,2);
    assert.ok(render.frames.every(frame => Math.abs(frame.groundError) < .001));
    assert.deepEqual(render.frames.slice(0,4).map(frame=>frame.fallDegrees),[0,26,61,86]);
});
