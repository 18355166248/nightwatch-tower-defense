const {readOriginalImage,hasImage}=require('./design-image-store.cjs');
const sharp = require('sharp');
const path = require('node:path');
const dir = path.resolve(__dirname, '../docs/design/first-level-quality-v3');
(async () => {
    // 仅做对照的等比密度归一化；不改画面内容，也不将参考稿截图接入游戏。
    const source = await sharp(await readOriginalImage(path.join(dir, 'concepts/pause-quiet-enamel.png'))).resize(390, 844, { fit: 'contain', background: '#111827' }).png().toBuffer();
    const runtime = await sharp(await readOriginalImage(path.join(dir, 'runtime-pause-390-final.png'))).png().toBuffer();
    const meta = await sharp(runtime).metadata();
    if (meta.width !== 390 || meta.height !== 844) throw new Error('运行截图必须是390×844实际浏览器像素');
    await sharp({ create: { width: 790, height: 844, channels: 4, background: '#111827' } }).composite([{ input: source, left: 0, top: 0 }, { input: runtime, left: 400, top: 0 }]).png().toFile(path.join(dir, 'pause-fidelity-comparison.png'));
    const targetPanel = await sharp(source).extract({ left: 35, top: 250, width: 320, height: 325 }).png().toBuffer();
    const actualPanel = await sharp(runtime).extract({ left: 35, top: 250, width: 320, height: 325 }).png().toBuffer();
    await sharp({ create: { width: 650, height: 325, channels: 4, background: '#111827' } }).composite([{ input: targetPanel, left: 0, top: 0 }, { input: actualPanel, left: 330, top: 0 }]).png().toFile(path.join(dir, 'pause-panel-fidelity-comparison.png'));
    console.log('390×844 全景和面板局部对照已导出；背景状态差异必须在审查中单独注明。');
})().catch(error => { console.error(error); process.exitCode = 1; });
