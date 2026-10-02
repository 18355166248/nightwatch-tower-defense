const {readOriginalImage,hasImage}=require('./design-image-store.cjs');
const fs=require('node:fs');
const path=require('node:path');
const sharp=require('sharp');
const root=path.resolve(__dirname,'../docs/design/first-level-quality-v3');
(async()=>{
    for(const kind of ['victory','defeat']) {
        const runtime=path.join(root,`runtime-${kind}-390-final.png`);
        if (!hasImage(runtime)) continue;
        const meta=await sharp(await readOriginalImage(runtime)).metadata();
        if(meta.width!==390 || meta.height!==844) throw new Error('Result comparison requires 390x844 runtime capture');
        const source=await sharp(await readOriginalImage(path.join(root,`concepts/${kind}-quiet-enamel.png`))).resize(390,844,{fit:'contain',background:'#101720'}).png().toBuffer();
        const actual=await sharp(await readOriginalImage(runtime)).png().toBuffer();
        await sharp({create:{width:790,height:844,channels:4,background:'#101720'}}).composite([{input:source,left:0,top:0},{input:actual,left:400,top:0}]).png().toFile(path.join(root,`${kind}-fidelity-comparison.png`));
    }
})().catch(error=>{console.error(error);process.exitCode=1;});
