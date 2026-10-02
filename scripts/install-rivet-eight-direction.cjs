const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'docs/design/first-level-quality-v3/output/exec-f9a2a223-c099-4e16-80bb-054fe5103310/resized');
const names = ['north','north-east','east','south-east','south','south-west','west','north-west'];
const template = JSON.parse(fs.readFileSync(path.join(root, 'assets/resources/level-one/units/rivet-gun-head-v2.png.meta'), 'utf8'));
const out = path.join(root, 'assets/resources/level-one/units/rivet-head-eight-v1');
fs.mkdirSync(out, { recursive: true });
names.forEach((name, index) => {
    const input = path.join(source, `exec-f9a2a223-c099-4e16-80bb-054fe5103310_${String(index).padStart(2,'0')}.png`);
    const bytes = fs.readFileSync(input);
    if (bytes.readUInt32BE(16) !== 128 || bytes.readUInt32BE(20) !== 128) throw new Error('切图尺寸不符合128画布');
    const target = path.join(out, `${name}.png`);
    if (fs.existsSync(target) && !fs.readFileSync(target).equals(bytes)) throw new Error(`拒绝覆盖不同素材: ${target}`);
    fs.copyFileSync(input, target);
    if (fs.existsSync(`${target}.meta`)) return;
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
});
console.log('八方向128透明切图安装完成；UUID复用，拒绝覆盖不同字节。');
