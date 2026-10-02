// 只安装已人工确认的 B；校验旧图身份、候选像素和尺寸后才覆盖，禁止对当前图重复采样。
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {readOriginalImage} = require('./design-image-store.cjs');
const root = path.resolve(__dirname, '..');
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

async function main(sharpPath, backupDir) {
    if (!sharpPath || !backupDir || !path.isAbsolute(backupDir)) throw Error('需要 sharp 路径和绝对备份目录');
    const sharp = require(sharpPath);
    const review = path.join(root, 'docs/design/first-level-quality-v3/texture-review-generated');
    const manifest = JSON.parse(fs.readFileSync(path.join(review, 'manifest.json')));
    const expected = { backdrop:[640,1137], hud:[864,139], tray:[640,147], button:[160,133], disabled:[160,144], panel:[384,372] };
    if (manifest.assets.length !== 6 || new Set(manifest.assets.map(item => item.id)).size !== 6) throw Error('候选集合不完整');
    const prepared = [];
    for (const asset of manifest.assets) {
        const size = expected[asset.id], candidate = asset.candidates.find(item => item.name === 'B');
        if (!size || !candidate || candidate.width !== size[0] || candidate.height !== size[1]) throw Error('B 规格不一致');
        const source = path.join(root, 'assets/resources', asset.source);
        const original = fs.readFileSync(source);
        if (digest(original) !== asset.sourceSha256) throw Error('原图发生变更：' + asset.id);
        const approved = await readOriginalImage(path.join(review, candidate.file));
        const raw = await sharp(approved).ensureAlpha().raw().toBuffer({resolveWithObject:true});
        if (raw.info.width !== size[0] || raw.info.height !== size[1]) throw Error('候选尺寸不一致');
        // 仅调整 PNG 编码压缩，不量化、不重采样；逐像素核对避免无损声明失真。
        const encoded = await sharp(approved).png({compressionLevel:9, effort:10, adaptiveFiltering:true, palette:false}).toBuffer();
        const check = await sharp(encoded).ensureAlpha().raw().toBuffer();
        if (!check.equals(raw.data)) throw Error('无损编码像素不一致');
        const target = source.replace(/\.jpg$/, '.png');
        if (target !== source && fs.existsSync(target)) throw Error('目标资源已存在');
        const meta = JSON.parse(fs.readFileSync(source + '.meta'));
        meta.imported = false;
        meta.files = ['.json','.png'];
        for (const sub of Object.values(meta.subMetas)) {
            sub.imported = false;
            if (sub.importer === 'sprite-frame') {
                Object.assign(sub.userData, {width:size[0], height:size[1], rawWidth:size[0], rawHeight:size[1],
                    trimX:0, trimY:0, offsetX:0, offsetY:0});
                delete sub.userData.vertices;
            }
        }
        prepared.push({asset, source, target, original, approved, encoded, meta});
    }
    fs.mkdirSync(backupDir, {recursive:false});
    // 先完整备份六图和元数据；目标、UUID 和逻辑资源路径均已解析，旧 JPEG 不留重复资源。
    for (const item of prepared) {
        fs.writeFileSync(path.join(backupDir, path.basename(item.source)), item.original);
        fs.copyFileSync(item.source + '.meta', path.join(backupDir, path.basename(item.source) + '.meta'));
    }
    const installed = [];
    for (const item of prepared) {
        fs.writeFileSync(item.target, item.encoded);
        fs.writeFileSync(item.target + '.meta', JSON.stringify(item.meta,null,2) + '\n');
        if (item.target !== item.source) {
            fs.unlinkSync(item.source); fs.unlinkSync(item.source + '.meta');
        }
        installed.push({id:item.asset.id, resource: path.relative(root,item.target),
            originalSha256:digest(item.original), approvedSha256:digest(item.approved), installedSha256:digest(item.encoded),
            originalBytes:item.original.length, installedBytes:item.encoded.length,
            size:expected[item.asset.id], pixelIdenticalToApprovedB:true});
    }
    fs.writeFileSync(path.join(root,'docs/design/first-level-quality-v3/texture-sampling-installed.json'),
        JSON.stringify({choice:'B', approval:'用户：那就用B', operation:'lossless PNG re-encoding of approved B pixels', assets:installed},null,2) + '\n');
    console.log(JSON.stringify({backupDir, installed},null,2));
}
if (require.main === module) main(...process.argv.slice(2)).catch(error => {console.error(error);process.exitCode=1;});
