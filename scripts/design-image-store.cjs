const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const manifestPath = path.join(root, 'art-source/cdn-image-manifest.json');
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function images() { return fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')).images : {}; }
function entry(file) { return images()[path.relative(root, path.resolve(file))]; }
function hasImage(file) { return fs.existsSync(file) || Boolean(entry(file)?.verifiedAt); }
// 离线门禁核对归档来源契约；在线字节验证由迁移和 readOriginalImage 负责，不能混称在线可用。
function originalSha256(file) {
    if (fs.existsSync(file)) return digest(fs.readFileSync(file));
    const record = entry(file);
    if (!record?.verifiedAt || !/^[a-f0-9]{64}$/.test(record.originalSha256)) throw new Error('图片未验证归档：' + file);
    return record.originalSha256;
}
const pending = new Map();
async function readOriginalImage(file) {
    if (fs.existsSync(file)) return fs.readFileSync(file);
    const record = entry(file);
    if (!record?.verifiedAt) throw new Error('图片未归档：' + file);
    return readArchivedRecord(record);
}
async function readArchivedRecord(record) {
    if (!record?.verifiedAt) throw new Error('图片归档未验证');
    const url = new URL(record.originalUrl);
    if (url.protocol !== 'https:' || url.hostname !== 'audiopaytest.cos.tx.xmcdn.com') throw new Error('归档地址不受信任');
    // 切图只读取原始字节，不读取压缩预览；失败时明确报错，不用低清图静默兜底。
    if (!pending.has(url.href)) pending.set(url.href, (async () => {
        const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
        if (!response.ok) throw new Error('源图下载失败：' + response.status);
        const bytes = Buffer.from(await response.arrayBuffer());
        if (bytes.length !== record.originalBytes || digest(bytes) !== record.originalSha256) throw new Error('源图哈希不匹配');
        return bytes;
    })().catch(error => { pending.delete(url.href); throw error; }));
    return pending.get(url.href);
}
module.exports = { root, images, entry, hasImage, digest, originalSha256, readOriginalImage, readArchivedRecord };
