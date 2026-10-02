const {readOriginalImage}=require('./design-image-store.cjs');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');
const root = path.resolve(__dirname,'..');
const review = path.join(root,'docs/design/first-level-quality-v3');
const source = path.join(review,'concepts/home-quiet-enamel.png');
const target = path.join(root,'assets/resources/level-one/ui/quality-v3/home-hero.png');
(async () => {
    // 只裁稿中无字插画，不切标题、状态、按钮，也不修改插画内容。
    const crop = {left:89,top:295,width:764,height:450};
    await sharp(await readOriginalImage(source)).extract(crop).resize(764,450).png().toFile(target);
    if (!fs.existsSync(target+'.meta')) fs.writeFileSync(target+'.meta',JSON.stringify({ver:'1.0.27',importer:'image',imported:false,
        uuid:crypto.randomUUID(),files:[],subMetas:{},userData:{type:'sprite-frame',hasAlpha:false}},null,2));
    fs.copyFileSync(target,path.join(review,'home-hero.png'));
    fs.writeFileSync(path.join(review,'home-slice-manifest.json'),JSON.stringify({source:'concepts/home-quiet-enamel.png',
        sourceSha256:crypto.createHash('sha256').update(await readOriginalImage(source)).digest('hex'),
        assets:[{id:'home-hero',runtime:path.relative(root,target),crop,width:764,height:450,decodedRgbaBytes:764*450*4,textBaked:false}],
        sharedChrome:'slice-manifest.json',unitThumbnails:'existing rivet-gun and frost-coil spriteFrames',
        rights:'Original built-in imagegen concept; provider terms review before commercial distribution.'},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
