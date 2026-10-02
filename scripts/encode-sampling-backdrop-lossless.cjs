const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname,'..');
async function main(sharpPath) {
    const sharp = require(sharpPath);
    const base = path.join(root,'assets/resources/level-one/backdrop-plaza-v2');
    const input = fs.readFileSync(base+'.png');
    const output = await sharp(input).webp({lossless:true,effort:6}).toBuffer();
    // 格式优化不能改变 B 的获批像素；WebP 仍是本地运行图片，不改网络加载策略。
    const pixels = await sharp(input).ensureAlpha().raw().toBuffer();
    if (!(await sharp(output).ensureAlpha().raw().toBuffer()).equals(pixels)) throw Error('WebP 像素不一致');
    if (output.length >= 1024*1024 || fs.existsSync(base+'.webp')) throw Error('单图预算失败或目标已存在');
    fs.copyFileSync(base+'.png','/private/tmp/nightwatch-sampling-b-originals-20261002/backdrop-approved-b.png');
    const meta = JSON.parse(fs.readFileSync(base+'.png.meta'));
    meta.imported = false; meta.files = ['.json','.webp'];
    for (const sub of Object.values(meta.subMetas)) sub.imported = false;
    fs.writeFileSync(base+'.webp',output);
    fs.writeFileSync(base+'.webp.meta',JSON.stringify(meta,null,2)+'\n');
    fs.unlinkSync(base+'.png'); fs.unlinkSync(base+'.png.meta');
    const recordPath = path.join(root,'docs/design/first-level-quality-v3/texture-sampling-installed.json');
    const record = JSON.parse(fs.readFileSync(recordPath));
    const asset = record.assets.find(item => item.id === 'backdrop');
    asset.resource = path.relative(root,base+'.webp'); asset.installedBytes = output.length;
    asset.installedSha256 = crypto.createHash('sha256').update(output).digest('hex');
    record.operation = 'lossless PNG/WebP re-encoding of approved B pixels';
    fs.writeFileSync(recordPath,JSON.stringify(record,null,2)+'\n');
    console.log(JSON.stringify({bytes:output.length,pixelIdentical:true}));
}
if(require.main === module) main(process.argv[2]).catch(error=>{console.error(error);process.exitCode=1;});
