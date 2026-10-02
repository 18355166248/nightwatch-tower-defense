const {readOriginalImage,hasImage}=require('./design-image-store.cjs');
const sharp = require('sharp');
const path = require('node:path');
const dir = path.resolve(__dirname, '../docs/design/first-level-quality-v3');
(async () => {
    // 只归一化显示密度；源稿和运行画面并排保留，差异不能通过拉伸或覆盖消除。
    const source = await sharp(await readOriginalImage(path.join(dir,'concepts/settings-quiet-enamel.png'))).resize(390,844,{fit:'contain',background:'#111827'}).png().toBuffer();
    const runtime = await sharp(await readOriginalImage(path.join(dir,'runtime-battle-settings-390-final.png'))).png().toBuffer();
    const metadata = await sharp(runtime).metadata();
    if (metadata.width !== 390 || metadata.height !== 844) throw new Error('必须使用实际390×844浏览器截图');
    await sharp({create:{width:790,height:844,channels:4,background:'#111827'}})
        .composite([{input:source,left:0,top:0},{input:runtime,left:400,top:0}]).png().toFile(path.join(dir,'settings-fidelity-comparison.png'));
})().catch(error => {console.error(error);process.exitCode=1;});
