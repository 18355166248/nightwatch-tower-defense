const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {originalSha256}=require('../../scripts/design-image-store.cjs');
const root=path.resolve(__dirname,'../..');
test('结算九张透明无字切图保留源哈希，徽章与图标独立于统计数据',()=>{
    const manifest=JSON.parse(fs.readFileSync(path.join(root,'docs/design/first-level-quality-v3/result-slice-manifest.json')));
    assert.equal(manifest.assets.length,9);
    assert.equal(manifest.sourceSha256,originalSha256(path.join(root,manifest.source)));
    for(const asset of manifest.assets) {
        const file=fs.readFileSync(path.join(root,asset.runtime));
        assert.equal(file.readUInt32BE(16),asset.width); assert.equal(file.readUInt32BE(20),asset.height);
        assert.equal(file[25],6,'RGBA透明资源'); assert.equal(asset.textBaked,false);
        assert.equal(asset.decodedRgbaBytes,asset.width*asset.height*4);
    }
    const view=fs.readFileSync(path.join(root,'assets/scripts/presentation/FirstLevelResultView.ts'),'utf8');
    assert.ok(view.includes('result.stats')); assert.ok(view.includes('result.runDetails')); assert.ok(view.includes('result.footnote'));
});
