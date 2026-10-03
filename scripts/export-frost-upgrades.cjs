// 已认可结构的确定性切图：不重绘主体，也不分别裁边移动底座和能量层。
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { readOriginalImage } = require('./design-image-store.cjs');
const project = path.resolve(__dirname, '..');

async function main(sharpModule) {
    const sharp = require(sharpModule);
    const task = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-frost-export-'));
    const input = path.join(task, 'input');
    fs.mkdirSync(input);
    const report = { version: 1, source: 'approved concept camera refinements', canvas: [128, 128],
        plinthBandWidth: 78, baseline: 116, energyMode: 'registered luminous overlay; structural layer retains idle energy', assets: [] };
    for (const level of [2, 3]) {
        const alias = `art-source/design/frost-upgrade-v1/level-${level}-production.png`;
        const bytes = await readOriginalImage(path.join(project, alias));
        const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1;
        const widths = [];
        for (let y = 0; y < info.height; y += 1) {
            let left = info.width, right = -1;
            for (let x = 0; x < info.width; x += 1) if (data[(y * info.width + x) * 4 + 3] > 16) {
                left = Math.min(left, x); right = Math.max(right, x);
                x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
            }
            widths.push(right - left + 1);
        }
        if (x1 < x0) throw new Error('全透明源图：' + alias);
        const plinthWidth = Math.max(...widths.slice(Math.floor(y0 + (y1-y0)*.72), Math.floor(y0 + (y1-y0)*.88)));
        const scale = report.plinthBandWidth / plinthWidth;
        const width = Math.round((x1-x0+1)*scale), height = Math.round((y1-y0+1)*scale);
        // 尺寸超出画布就停止，不静默裁掉侧罐/球冠来伪造体积或占地达标。
        if (width > 122 || height > 110) throw new Error('源图配准超出安全区：' + alias);
        const body = await sharp(bytes).extract({ left:x0, top:y0, width:x1-x0+1, height:y1-y0+1 })
            .resize(width,height,{kernel:'lanczos3'}).raw().toBuffer();
        const structural = Buffer.alloc(128*128*4);
        const left = Math.round((128-width)/2), top = report.baseline-height;
        for (let y=0;y<height;y+=1) for (let x=0;x<width;x+=1) {
            body.copy(structural,((y+top)*128+x+left)*4,(y*width+x)*4,(y*width+x)*4+4);
        }
        const energy = Buffer.alloc(structural.length);
        let energyPixels=0, sumX=0, sumY=0, sumAlpha=0;
        for(let y=0;y<128;y+=1) for(let x=0;x<128;x+=1) {
            const p=(y*128+x)*4, r=structural[p],g=structural[p+1],b=structural[p+2],a=structural[p+3];
            // 只提取上部青蓝发光像素；铜边与深蓝底座保持静止，原图像素及半透明alpha不二次相乘。
            if(y<90&&a>0&&g>150&&b>150&&Math.min(g,b)-r>12&&Math.abs(g-b)<90) {
                structural.copy(energy,p,p,p+4);energyPixels+=1;sumX+=x*a;sumY+=y*a;sumAlpha+=a;
            }
        }
        if(energyPixels<80) throw new Error('能量层提取为空或过少：'+alias);
        const names=[];
        for(const [part,pixels] of [['structure',structural],['energy',energy]]) {
            const name=`frost-coil-level-${level}-${part}-v1.png`;names.push(name);
            await sharp(pixels,{raw:{width:128,height:128,channels:4}}).png().toFile(path.join(input,name));
        }
        report.assets.push({level,sourceAlias:alias,sourceSha256:crypto.createHash('sha256').update(bytes).digest('hex'),
            sourceBounds:[x0,y0,x1+1,y1+1],sourcePlinthBandWidth:plinthWidth,scale,registeredBounds:[left,top,left+width,top+height],
            energyPixels,energyCentroid:[sumX/sumAlpha,sumY/sumAlpha],runtimeNames:names});
    }
    const pipeline = path.resolve(project,'../ai-asset-pipeline');
    const bundle = path.join(task,'bundle');
    execFileSync(path.join(pipeline,'.venv-cutout/bin/python'),[path.join(pipeline,'src/asset_bundle.py'),
        '--recipe',path.join(project,'docs/design/frost-upgrade-v1/runtime-recipe.json'),'--input',input,'--out',bundle],{stdio:'inherit'});
    const manifest=JSON.parse(fs.readFileSync(path.join(bundle,'manifest.json'),'utf8'));
    const target=path.join(project,'assets/resources/level-one/units');
    const template=JSON.parse(fs.readFileSync(path.join(target,'frost-coil-core-v2.png.meta'),'utf8'));
    for(const entry of manifest.images) {
        const out=path.join(target,entry.name);
        fs.copyFileSync(path.join(bundle,entry.path),out);
        // 新资源共用完整画布并显式关闭mipmap/自动裁边；重复导出保留已有UUID，避免场景引用漂移。
        {
            const existing=fs.existsSync(out+'.meta');
            const meta=existing?JSON.parse(fs.readFileSync(out+'.meta','utf8')):JSON.parse(JSON.stringify(template));
            const uuid=existing?meta.uuid:crypto.randomUUID(), old=meta.uuid;
            meta.uuid=uuid;meta.userData.redirect=uuid+'@6c48a';
            for(const sub of Object.values(meta.subMetas)) {
                sub.uuid=sub.uuid.replace(old,uuid);sub.displayName=path.basename(entry.name,'.png');
                sub.userData.imageUuidOrDatabaseUri=sub.userData.imageUuidOrDatabaseUri.replace(old,uuid);
                if(sub.importer==='texture'){sub.userData.wrapModeS='clamp-to-edge';sub.userData.wrapModeT='clamp-to-edge';}
                if(sub.importer==='sprite-frame')Object.assign(sub.userData,{trimType:'none',trimX:0,trimY:0,offsetX:0,offsetY:0,width:128,height:128,rawWidth:128,rawHeight:128,
                    vertices:{rawPosition:[-64,-64,0,64,-64,0,-64,64,0,64,64,0],indexes:[0,1,2,2,1,3],
                        uv:[0,128,128,128,0,0,128,0],nuv:[0,0,1,0,0,1,1,1],minPos:[-64,-64,0],maxPos:[64,64,0]}});
            }
            fs.writeFileSync(out+'.meta',JSON.stringify(meta,null,2)+'\n');
        }
    }
    fs.writeFileSync(path.join(project,'docs/design/frost-upgrade-v1/runtime-export-report.json'),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify({bundle,report,files:manifest.images.map(entry=>entry.name)},null,2));
}
if(require.main===module)main(process.argv[2]||'sharp').catch(error=>{console.error(error.message);process.exitCode=1;});
