const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const dir = path.join(root, 'docs/design/first-level-quality-v3');
test('第3稿独立素材规格与实际PNG一致，九宫格安全且不烘焙文字', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'slice-manifest.json'), 'utf8'));
    assert.equal(manifest.selectedConcept, 3);
    assert.equal(manifest.assets.length, 9);
    let decoded = 0;
    for (const asset of manifest.assets) {
        const buffer = fs.readFileSync(path.join(root, asset.runtime));
        assert.equal(buffer.subarray(1, 4).toString(), 'PNG');
        assert.equal(buffer.readUInt32BE(16), asset.width);
        assert.equal(buffer.readUInt32BE(20), asset.height);
        assert.equal(buffer[25], 6, '运行PNG必须为RGBA');
        assert.equal(asset.textBaked, false);
        assert.ok(asset.transparentPixels > 0);
        assert.ok(asset.nineSliceInset * 2 < Math.min(asset.width, asset.height));
        assert.ok(require('../../scripts/design-image-store.cjs').hasImage(path.join(root, asset.source)));
        const meta = JSON.parse(fs.readFileSync(path.join(root, asset.runtime + '.meta'), 'utf8'));
        assert.equal(meta.importer, 'image');
        assert.ok(meta.uuid);
        decoded += asset.width * asset.height * 4;
    }
    assert.equal(decoded, manifest.totalDecodedRgbaBytes);
});
test('第3稿历史构建与最终人工签收分别记录', () => {
    const states = JSON.parse(fs.readFileSync(path.join(dir, 'state-index.json'), 'utf8'));
    assert.equal(states.selectedConcept, 3);
    assert.equal(states.runtimeBuild.fullPageVisualAcceptance, 'pending');
    assert.equal(states.runtimeBuild.completeEightWaveAcceptance, 'not-run-this-build');
    assert.equal(states.finalAcceptance.finalHumanVisualAccepted, true);
    assert.equal(states.finalAcceptance.humanApprovalEvidence, '2026-10-02 用户：认可，可以阶段交付');
    assert.equal(states.finalAcceptance.completedOrdinaryEightWaveRuns, 3);
    assert.equal(states.finalAcceptance.stageComplete, true);
    assert.equal(states.finalAcceptance.automaticDevelopmentStopped, true);
    assert.equal(states.practicalClosure.original8MiBPassed, false);
    assert.equal(states.stage, 'first-level-stage-delivered-human-accepted');
    assert.equal(states.visualAcceptance, 'final-runtime-human-accepted');
    assert.ok(states.pageFamilies.includes('victory') && states.pageFamilies.includes('home-briefing'));
    assert.equal(states.displayOrder[2].file, 'concepts/pause-quiet-enamel.png');
});
