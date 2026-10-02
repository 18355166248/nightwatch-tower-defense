const {readOriginalImage,hasImage}=require('./design-image-store.cjs');
const sharp=require('sharp');
const path=require('node:path');
const dir=path.resolve(__dirname,'../docs/design/first-level-quality-v3');
(async()=>{
    const source=await sharp(await readOriginalImage(path.join(dir,'concepts/home-quiet-enamel.png'))).resize(390,844,{fit:'contain',background:'#111827'}).png().toBuffer();
    const runtime=await sharp(await readOriginalImage(path.join(dir,'runtime-home-390-final.png'))).png().toBuffer();
    const meta=await sharp(runtime).metadata();
    if(meta.width!==390||meta.height!==844) throw new Error('运行截图必须为390×844');
    await sharp({create:{width:790,height:844,channels:4,background:'#111827'}})
        .composite([{input:source,left:0,top:0},{input:runtime,left:400,top:0}]).png().toFile(path.join(dir,'home-fidelity-comparison.png'));
    // 拆出入口区域方便读小字，保持源稿/实际图原像素，不通过放大其中一侧掩盖差距。
    const panels=await Promise.all([source,runtime].map(input=>sharp(input).extract({left:25,top:450,width:340,height:290}).png().toBuffer()));
    await sharp({create:{width:690,height:290,channels:4,background:'#111827'}})
        .composite([{input:panels[0],left:0,top:0},{input:panels[1],left:350,top:0}]).png().toFile(path.join(dir,'home-controls-comparison.png'));
})().catch(error=>{console.error(error);process.exitCode=1;});
