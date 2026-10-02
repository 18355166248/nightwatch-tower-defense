const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { originalSha256 } = require('../scripts/design-image-store.cjs');
const { firstLevelArtProfile } = require('../.test-dist/presentation/FirstLevelArtProfile.js');
const { parseDirectionalSpriteLayout } = require('../.test-dist/presentation/DirectionalSpriteLayout.js');
const { compatibleDirectionalCollapse } = require('../.test-dist/presentation/DirectionalCollapse.js');
const { imageDimensions } = require('../scripts/report-first-level-budget.cjs');
const root = path.resolve(__dirname,'..');
const json = file => JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));

test('尺寸档位显式启用，QA或方向候选参数不能改变默认档位；未知值保守回退', () => {
    for (const query of ['', '?qa=1','?unitArt=rig-candidate','?artBudget=unknown']) assert.equal(firstLevelArtProfile(query).id,'original');
    assert.equal(firstLevelArtProfile('?unitArt=rig-candidate&artBudget=compact').id,'compact-candidate');
    assert.ok(Object.isFrozen(firstLevelArtProfile('')));
    assert.ok(Object.isFrozen(firstLevelArtProfile('?artBudget=compact').backdrops));
});

test('真实低占用32帧保留锚点、朝向、时长、loop及死亡2倍注册，输出与安装一致', () => {
    const layouts = {};
    for (const [clip, old] of [['walk','walk-rig-v2'], ['collapse','collapse-rig-v1']]) {
        const base = `assets/resources/level-one/units/clockwork-infantry-${clip}-rig-budget-v1`;
        const manifest = json(base+'-layout.json');
        const previous = json(`assets/resources/level-one/units/clockwork-infantry-${old}-layout.json`);
        const layout = parseDirectionalSpriteLayout(manifest,clip);
        assert.ok(layout); layouts[clip]=layout;
        assert.deepEqual(imageDimensions(fs.readFileSync(path.join(root,base+'.png'))),{width:clip==='walk'?320:640,height:clip==='walk'?320:640});
        assert.deepEqual(manifest.anchor,previous.anchor);
        assert.deepEqual(manifest.states.map(s=>[s.name,s.loop,s.frames.map(f=>f.durationMs)]),
            previous.states.map(s=>[s.name,s.loop,s.frames.map(f=>f.durationMs)]));
        assert.equal(originalSha256(path.join(root,base+'.png')),
            originalSha256(path.join(root,`art-source/first-level-runtime-budget-v1/${clip}/atlas.png`)));
        const provenance = json(`art-source/first-level-runtime-budget-v1/${clip}/provenance.json`);
        for (const input of provenance.inputs) assert.equal(originalSha256(input.path), input.sha256);
    }
    assert.equal(compatibleDirectionalCollapse(layouts.walk,layouts.collapse,.3),true);
});

test('新底图与atlas不共享旧UUID，线性无mip/禁止动态合图，并记录源哈希', () => {
    const profile = firstLevelArtProfile('?artBudget=compact');
    const uuids = new Set();
    const original = firstLevelArtProfile('');
    const originalUuids = new Set([...original.backdrops.map(p=>p.replace('/spriteFrame','')),original.infantryWalk,original.infantryCollapse]
        .map(base=>json('assets/resources/'+base+(base === 'level-one/backdrop-plaza-v2' ? '.webp' : base.includes('/units/')?'.png':'.jpg')+'.meta').uuid));
    for (const base of [...profile.backdrops.map(p=>p.replace('/spriteFrame','')),profile.infantryWalk,profile.infantryCollapse]) {
        const ext = base.includes('/units/')?'.png':'.jpg';
        const meta = json('assets/resources/'+base+ext+'.meta');
        assert.ok(!originalUuids.has(meta.uuid));
        assert.ok(!uuids.has(meta.uuid)); uuids.add(meta.uuid);
        const texture = Object.values(meta.subMetas).find(s=>s.importer==='texture');
        assert.equal(texture.userData.mipfilter,'none'); assert.equal(texture.userData.minfilter,'linear');
        const sprite = Object.values(meta.subMetas).find(s=>s.importer==='sprite-frame');
        if (sprite) assert.equal(sprite.userData.packable,false);
    }
    const manifest = json('art-source/first-level-runtime-budget-v1/profile-manifest.json');
    for (const asset of manifest.assets.filter(a=>a.sourceSha256)) {
        // 旧低清候选保留生成时原图身份；正式背景 B 接入后，原 JPEG 从评审归档读取。
        const source = asset.source.endsWith('backdrop-plaza-v2.jpg')
            ? path.join(root,'docs/design/first-level-quality-v3/texture-review-generated/backdrop-original.jpg') : asset.source;
        assert.equal(originalSha256(source),asset.sourceSha256);
        assert.deepEqual(asset.size,[768,1365]);
    }
});
