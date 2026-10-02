const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { readOriginalImage } = require('./design-image-store.cjs');
const root = path.resolve(__dirname, '..');
const level = Number(process.argv[2] ?? 1);
const sources = {1:'exec-f9a2a223-c099-4e16-80bb-054fe5103310',
    2:'exec-c4c95f6c-2a01-4ede-9018-01545ea501c7',3:'exec-d7404092-3966-45d6-b6f2-c9d5e39b36fb'};
if (!sources[level]) throw new Error('只允许安装已审查的1/2/3级家族');
const sourceId = sources[level];
const source = path.join(root, `docs/design/first-level-quality-v3/output/${sourceId}/resized`);
const names = ['north','north-east','east','south-east','south','south-west','west','north-west'];
const template = JSON.parse(fs.readFileSync(path.join(root, 'assets/resources/level-one/units/rivet-gun-head-v2.png.meta'), 'utf8'));
const out = path.join(root, `assets/resources/level-one/units/rivet-head-eight-${level === 1 ? 'v1' : `level-${level}-v1`}`);
fs.mkdirSync(out, { recursive: true });
async function install() {
for (const [index, name] of names.entries()) {
    const input = path.join(source, `${sourceId}_${String(index).padStart(2,'0')}.png`);
    // 源切图迁移CDN后仍读取并核对原始字节，不用压缩预览重建运行素材。
    const bytes = await readOriginalImage(input);
    if (bytes.readUInt32BE(16) !== 128 || bytes.readUInt32BE(20) !== 128) throw new Error('切图尺寸不符合128画布');
    const target = path.join(out, `${name}.png`);
    if (fs.existsSync(target) && !fs.readFileSync(target).equals(bytes)) throw new Error(`拒绝覆盖不同素材: ${target}`);
    if (!fs.existsSync(target)) fs.writeFileSync(target, bytes);
    if (fs.existsSync(`${target}.meta`)) continue;
    const meta = JSON.parse(JSON.stringify(template));
    const uuid = randomUUID();
    meta.uuid = uuid;
    meta.userData.redirect = `${uuid}@6c48a`;
    for (const [id, sub] of Object.entries(meta.subMetas)) {
        sub.uuid = `${uuid}@${id}`;
        sub.displayName = name;
    }
    const texture = meta.subMetas['6c48a'].userData;
    texture.imageUuidOrDatabaseUri = uuid;
    texture.wrapModeS = texture.wrapModeT = 'clamp-to-edge';
    const frame = meta.subMetas.f9941.userData;
    Object.assign(frame, { imageUuidOrDatabaseUri: `${uuid}@6c48a`, offsetX:0, offsetY:0,
        trimX:0,trimY:0,width:128,height:128,rawWidth:128,rawHeight:128,packable:false,trimType:'custom' });
    delete frame.vertices;
    fs.writeFileSync(`${target}.meta`, JSON.stringify(meta,null,2)+'\n');
}
console.log('八方向128透明切图安装完成；UUID复用，拒绝覆盖不同字节。');
}
install().catch(error => { console.error(error.message); process.exitCode = 1; });
