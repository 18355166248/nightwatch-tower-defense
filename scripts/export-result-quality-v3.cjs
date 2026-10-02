const {readOriginalImage}=require('./design-image-store.cjs');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'art-source/design/first-level-quality-v3/result-icons-source.png');
const review = path.join(root, 'docs/design/first-level-quality-v3');
const names = ['victory-badge','defeat-badge','kill-icon','leak-icon','heart-icon','coins-icon','time-icon','tower-icon','upgrade-icon'];
(async () => {
    const metadata = await sharp(await readOriginalImage(source)).metadata();
    if (metadata.width !== 1254 || metadata.height !== 1254 || !metadata.hasAlpha) throw new Error('Unexpected result atlas dimensions/alpha');
    // 徽章桂叶略越过等分线，按实际空隙切分，不切掉外轮廓，也不做内容重绘。
    const xs = [0,425,823,1254], ys = [0,447,790,1254];
    const assets = [];
    for (const [index,id] of names.entries()) {
        const col = index % 3, row = Math.floor(index / 3), size = index < 2 ? 256 : 128;
        const crop = {left:xs[col],top:ys[row],width:xs[col+1]-xs[col],height:ys[row+1]-ys[row]};
        const target = path.join(root, `assets/resources/level-one/ui/quality-v3/${id}.png`);
        const cropped = await sharp(await readOriginalImage(source)).extract(crop).png().toBuffer();
        const trimmed = await sharp(cropped).trim().png().toBuffer();
        await sharp(trimmed).resize(size,size,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toFile(target);
        if (!fs.existsSync(target+'.meta')) fs.writeFileSync(target+'.meta',JSON.stringify({ver:'1.0.27',importer:'image',imported:false,uuid:crypto.randomUUID(),files:[],subMetas:{},userData:{type:'sprite-frame',hasAlpha:true}},null,2));
        fs.copyFileSync(target,path.join(review,`${id}.png`));
        assets.push({id,runtime:path.relative(root,target),crop,width:size,height:size,decodedRgbaBytes:size*size*4,textBaked:false});
    }
    fs.writeFileSync(path.join(review,'result-slice-manifest.json'),JSON.stringify({source:path.relative(root,source),sourceSha256:crypto.createHash('sha256').update(await readOriginalImage(source)).digest('hex'),assets,rights:'Original built-in imagegen. Review provider commercial terms before release.',sharedChrome:'slice-manifest.json'},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
