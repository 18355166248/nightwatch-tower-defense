const fs = require('node:fs');
const path = require('node:path');
const {root, images, digest} = require('./design-image-store.cjs');
const relative = 'docs/design/first-level-quality-v3/texture-review-generated';
const dir = path.join(root,relative), records = images();
const manifestPath = path.join(dir,'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath));
const targets = [];
function verified(file) {
    if (path.basename(file) !== file) throw Error('附件文件名越界');
    const record = records[relative+'/'+file];
    if (!record?.verifiedAt || new URL(record.originalUrl).hostname !== 'audiopaytest.cos.tx.xmcdn.com') throw Error('附件未验证归档：'+file);
    const local = path.join(dir,file);
    if (fs.existsSync(local)) {
        if (fs.lstatSync(local).isSymbolicLink() || digest(fs.readFileSync(local)) !== record.originalSha256) throw Error('本地附件已变更');
        targets.push(local);
    }
    return record.originalUrl;
}
// 保存原字节 URL 而非量化预览；先完整检查18图，再写索引、删已验证且可恢复的非运行附件。
for (const asset of manifest.assets) {
    asset.originalUrl = verified(asset.original);
    for (const candidate of asset.candidates) candidate.url = verified(candidate.file);
}
manifest.status = 'B-approved-installed-original-review-archived';
fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
let bytes = 0;
for (const file of targets) {bytes += fs.statSync(file).size; fs.unlinkSync(file);}
console.log(JSON.stringify({removedFiles:targets.length,removedBytes:bytes,recovery:'CDN original URLs and SHA256 in archive manifest'}));
