const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { root, images, originalSha256, hasImage, readArchivedRecord, digest } = require('../../scripts/design-image-store.cjs');
test('非运行图片归档契约完整，运行资产不依赖 CDN；离线校验不是远程可用性证明', () => {
    const records = images();
    assert.ok(Object.keys(records).length >= 421);
    for (const [key, record] of Object.entries(records)) {
        assert.ok(/^(art-source\/|docs\/|embedded:)/.test(key));
        assert.ok(!key.startsWith('assets/'));
        for (const field of ['originalUrl', 'previewUrl']) {
            const url = new URL(record[field]);
            assert.equal(url.protocol, 'https:');
            assert.equal(url.hostname, 'audiopaytest.cos.tx.xmcdn.com');
        }
        assert.match(record.originalSha256, /^[a-f0-9]{64}$/);
        assert.match(record.previewSha256, /^[a-f0-9]{64}$/);
        assert.ok(record.originalBytes > 0 && record.previewBytes > 0);
        assert.ok(Number.isFinite(Date.parse(record.verifiedAt)));
        if (!key.startsWith('embedded:')) {
            assert.ok(hasImage(path.join(root, key)));
            assert.equal(originalSha256(path.join(root, key)), record.originalSha256);
        }
    }
    const runtime = fs.readFileSync(path.join(root, 'assets/resources/level-one/ui/quality-v3/panel.png'));
    assert.equal(runtime.subarray(1, 4).toString(), 'PNG');
});
test('源图恢复拒绝错误域名及损坏字节，失败不缓存，成功复用已校验原图', async () => {
    const fetchBefore = global.fetch;
    const bytes = Buffer.from('verified original bytes');
    const record = { originalUrl: 'https://audiopaytest.cos.tx.xmcdn.com/archive-helper-test',
        originalSha256: digest(bytes), originalBytes: bytes.length, verifiedAt: new Date().toISOString() };
    let calls = 0;
    try {
        global.fetch = async () => { calls++; return { ok: true, arrayBuffer: async () => Buffer.from('wrong') }; };
        await assert.rejects(readArchivedRecord({ ...record, originalUrl: 'https://example.com/image.png' }), /不受信任/);
        assert.equal(calls, 0);
        await assert.rejects(readArchivedRecord(record), /哈希不匹配/);
        global.fetch = async () => { calls++; return { ok: true, arrayBuffer: async () => bytes }; };
        assert.deepEqual(await readArchivedRecord(record), bytes);
        assert.deepEqual(await readArchivedRecord(record), bytes);
        assert.equal(calls, 2, '失败不锁死缓存，成功不重复下载');
    } finally { global.fetch = fetchBefore; }
});
