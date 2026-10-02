const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { walkDirection, directionalWalkFrame, parseDirectionalWalkLayout, directionalWalkRegistrationY,
    infantryRigCandidateEnabled } = require('../.test-dist/presentation/DirectionalWalk.js');
const manifest = JSON.parse(readFileSync(resolve(__dirname,
    '../art-source/first-level-units/clockwork-infantry-rig-v2/bundle/manifest.json'), 'utf8'));

test('四方向使用路段行列而不是整张精灵旋转，异常/静止路段有明确回退', () => {
    const from = { column: 4, row: 4 };
    assert.equal(walkDirection(from, { column: 4, row: 5 }), 'down');
    assert.equal(walkDirection(from, { column: 3, row: 4 }), 'left');
    assert.equal(walkDirection(from, { column: 4, row: 3 }), 'up');
    assert.equal(walkDirection(from, { column: 5, row: 4 }), 'right');
    assert.equal(walkDirection(from, from), 'down');
    assert.equal(walkDirection(from, { column: 5, row: 5 }), 'down');
});

test('四帧两圈在每格边界相位闭合、暂停幂等；减弱动态只锁帧而不改朝向', () => {
    assert.deepEqual([0,.125,.25,.375,.5,.625,.75,.875].map(p => directionalWalkFrame(p,0,false)), [0,1,2,3,0,1,2,3]);
    for (let order=0;order<12;order++) {
        assert.equal(directionalWalkFrame(0,order,false), directionalWalkFrame(1,order,false));
        assert.equal(directionalWalkFrame(.37,order,false), directionalWalkFrame(.37,order,false));
        assert.equal(directionalWalkFrame(.37,order,true), 0);
    }
    assert.equal(directionalWalkFrame(NaN,0,false), 0);
    assert.equal(directionalWalkFrame(-1,0,false), 0);
});

test('实际16帧 manifest 保留四方向原始矩形和地面锚点，损坏/重叠/缺帧拒绝', () => {
    const layout = parseDirectionalWalkLayout(manifest);
    assert.ok(layout);
    assert.equal(layout.textureWidth, 512);
    assert.equal(layout.textureHeight, 512);
    assert.deepEqual(layout.anchor, [.5,.82830057]);
    assert.equal(layout.frames.left[0].y,128);
    assert.equal(layout.frames.up[3].x,384);
    const copy = () => structuredClone(manifest);
    const missing=copy(); missing.states[0].frames.pop(); assert.equal(parseDirectionalWalkLayout(missing),null);
    const repeated=copy(); repeated.states[1].name='walk-down'; assert.equal(parseDirectionalWalkLayout(repeated),null);
    const overlap=copy(); overlap.states[1].frames[0].y=0; assert.equal(parseDirectionalWalkLayout(overlap),null);
    const cell=copy(); cell.states[0].frames[0].w=64; assert.equal(parseDirectionalWalkLayout(cell),null);
    const anchor=copy(); anchor.anchor[1]=NaN; assert.equal(parseDirectionalWalkLayout(anchor),null);
    const order=copy(); order.states.reverse(); assert.deepEqual(parseDirectionalWalkLayout(order).frames,layout.frames);
});

test('地面注册对齐接触斑而非 bbox，候选只在显式参数启用', () => {
    const y=directionalWalkRegistrationY(.82830057,-90*.34,90);
    assert.ok(Math.abs(y+(.5-.82830057)*90-(-90*.34))<1e-9);
    assert.equal(infantryRigCandidateEnabled(''),false);
    assert.equal(infantryRigCandidateEnabled('?qa=1'),false);
    assert.equal(infantryRigCandidateEnabled('?unitArt=rig-candidate'),true);
    assert.equal(infantryRigCandidateEnabled('?unitArt=other'),false);
});
