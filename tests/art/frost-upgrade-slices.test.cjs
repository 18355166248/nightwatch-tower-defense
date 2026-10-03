const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '../..');
test('冷凝升级四张透明128切图保持完整画布、固定UUID和配准元数据', () => {
    const report = JSON.parse(fs.readFileSync(path.join(root, 'docs/design/frost-upgrade-v1/runtime-export-report.json')));
    assert.equal(report.baseline, 116); assert.equal(report.plinthBandWidth, 78);
    const uuids = new Set(); let decoded = 0;
    for (const asset of report.assets) {
        assert.equal(asset.registeredBounds[3], report.baseline); assert.ok(asset.energyPixels > 80);
        for (const name of asset.runtimeNames) {
            const file = path.join(root, 'assets/resources/level-one/units', name), png = fs.readFileSync(file);
            assert.equal(png.readUInt32BE(16), 128); assert.equal(png.readUInt32BE(20), 128); assert.equal(png[25], 6);
            const meta = JSON.parse(fs.readFileSync(file + '.meta'));
            assert.ok(!uuids.has(meta.uuid)); uuids.add(meta.uuid);
            assert.equal(meta.subMetas.f9941.userData.trimType, 'none');
            assert.deepEqual(meta.subMetas.f9941.userData.vertices.minPos, [-64, -64, 0]);
            assert.equal(meta.subMetas['6c48a'].userData.mipfilter, 'none');
            decoded += 128 * 128 * 4;
        }
    }
    assert.equal(decoded, 262144); assert.equal(uuids.size, 4);
});
