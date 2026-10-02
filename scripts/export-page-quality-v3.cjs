const {readOriginalImage}=require('./design-image-store.cjs');
// 生图只负责材质；裁切、透明检测、尺寸和UUID由可重复的入库流程负责。
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'art-source/design/first-level-quality-v3');
const out = path.join(root, 'assets/resources/level-one/ui/quality-v3');
const review = path.join(root, 'docs/design/first-level-quality-v3');

async function pixels(file) {
    return sharp(await readOriginalImage(file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}
function bounds(data, info, left = 0, right = info.width) {
    let x0 = right, y0 = info.height, x1 = -1, y1 = -1;
    for (let y = 0; y < info.height; y++) for (let x = left; x < right; x++) {
        if (data[(y * info.width + x) * 4 + 3] <= 8) continue;
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    if (x1 < x0) throw new Error('素材没有可见像素');
    return { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}
async function exportAsset(name, file, crop, width, height, inset) {
    const target = path.join(out, name + '.png');
    let pipeline = sharp(await readOriginalImage(file)).extract(crop);
    pipeline = height ? pipeline.resize(width, height, { fit: 'contain', background: '#00000000' }) : pipeline.resize({ width });
    await pipeline.png().toFile(target);
    const meta = target + '.meta';
    if (!fs.existsSync(meta)) fs.writeFileSync(meta, JSON.stringify({ ver: '1.0.27', importer: 'image', imported: false,
        uuid: crypto.randomUUID(), files: [], subMetas: {}, userData: { type: 'sprite-frame', hasAlpha: true, fixAlphaTransparencyArtifacts: false } }, null, 2));
    const m = await sharp(target).metadata();
    const { data, info } = await pixels(target);
    let transparent = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] === 0) transparent++;
    if (!transparent) throw new Error(name + ' 缺少真实透明像素');
    fs.copyFileSync(target, path.join(review, name + '.png'));
    return { id: name, runtime: path.relative(root, target), source: path.relative(root, file), crop,
        width: m.width, height: m.height, transparentPixels: transparent, decodedRgbaBytes: info.width * info.height * 4,
        nineSliceInset: inset, textBaked: false, generatedWith: 'built-in imagegen', visualStatus: 'awaiting-runtime-comparison' };
}
(async () => {
    fs.mkdirSync(out, { recursive: true });
    const assets = [];
    for (const [name, src, inset] of [['panel', 'panel', 42], ['primary', 'primary', 24], ['secondary', 'secondary', 24], ['danger', 'danger', 24]]) {
        const file = path.join(source, src + '-source.png');
        const { data, info } = await pixels(file);
        assets.push(await exportAsset(name, file, bounds(data, info), 512, null, inset));
    }
    // 不假设模型严格按五等分网格排列：按实际透明列分隔，再检查恰好有五个独立图标。
    const file = path.join(source, 'icons-source.png');
    const { data, info } = await pixels(file);
    const ranges = [];
    let start = -1, last = -1;
    for (let x = 0; x < info.width; x++) {
        let occupied = false;
        for (let y = 0; y < info.height; y++) if (data[(y * info.width + x) * 4 + 3] > 8) { occupied = true; break; }
        if (occupied) { if (start < 0) start = x; last = x; }
        if (start >= 0 && (x - last > 10 || x === info.width - 1)) { ranges.push([start, last + 1]); start = -1; }
    }
    if (ranges.length !== 5) throw new Error('图标分隔不满足五个：' + JSON.stringify(ranges));
    for (const [index, name] of ['pause-icon', 'play-icon', 'restart-icon', 'settings-icon', 'home-icon'].entries()) {
        const crop = bounds(data, info, ranges[index][0], ranges[index][1]);
        // 统一透明安全垫，图标不把碰撞框绑定到生图边界。
        const target = path.join(out, name + '.png');
        const entry = await exportAsset(name, file, crop, 120, 120, 0);
        await sharp(target).extend({ top: 4, bottom: 4, left: 4, right: 4, background: '#00000000' }).png().toFile(target + '.tmp.png');
        fs.renameSync(target + '.tmp.png', target);
        fs.copyFileSync(target, path.join(review, name + '.png'));
        const finalPixels = await pixels(target);
        let transparentPixels = 0;
        for (let i = 3; i < finalPixels.data.length; i += 4) if (finalPixels.data[i] === 0) transparentPixels++;
        assets.push({ ...entry, width: 128, height: 128, transparentPixels, decodedRgbaBytes: 65536 });
    }
    const manifest = { selectedConcept: 3, date: '2026-10-01', sourceMock: 'concepts/pause-quiet-enamel.png',
        scope: 'shared page material family, no whole-screen rasterization', rights: 'Original generated assets; review provider terms before commercial distribution.',
        assets, totalDecodedRgbaBytes: assets.reduce((sum, a) => sum + a.decodedRgbaBytes, 0) };
    fs.writeFileSync(path.join(review, 'slice-manifest.json'), JSON.stringify(manifest, null, 2));
    console.log(JSON.stringify(manifest));
})().catch(error => { console.error(error); process.exitCode = 1; });
