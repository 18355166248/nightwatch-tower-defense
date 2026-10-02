// 生成独立采样评审附件，不安装/覆盖任何运行图片。采样不可称逐像素无损，必须人工确认。
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname,'..');
const specs = [
    ['backdrop','夜城背景','level-one/backdrop-plaza-v2.jpg',768,640,1080,1920],
    ['hud','顶部 HUD 铜框','level-one/ui/quality-v2/hud-frame.png',1024,864,1032,152],
    ['tray','底部塔栏铜框','level-one/ui/quality-v2/tray-frame.png',768,640,1032,172],
    ['button','HUD 启用按钮','level-one/ui/quality-v2/button-frame.png',240,160,128,120],
    ['disabled','HUD 禁用按钮','level-one/ui/quality-v2/disabled-frame.png',192,160,162,120],
    ['panel','共用九宫格面板（仅源纹理对照）','level-one/ui/quality-v3/panel.png',448,384,900,860],
];

async function main(sharpModule) {
    // 接入后源图已经是 B；拒绝再次把 B 当原图采样，否则会污染获批对照基线。
    if (fs.existsSync(path.join(root,'docs/design/first-level-quality-v3/texture-sampling-installed.json'))) {
        throw new Error('B 已接入，保留现有原图/A/B评审附件；不能从运行图重新生成原始基线。');
    }
    const sharp = require(sharpModule);
    const out = path.join(root,'docs/design/first-level-quality-v3/texture-review-generated');
    fs.mkdirSync(out,{recursive:true});
    const assets = [];
    for (const [id,label,relative,a,b,displayWidth,displayHeight] of specs) {
        const source = path.join(root,'assets/resources',relative);
        const bytes = fs.readFileSync(source), meta = await sharp(bytes).metadata();
        const original = `${id}-original${path.extname(relative)}`;
        fs.copyFileSync(source,path.join(out,original));
        const candidates = [];
        for (const [name,width] of [['A',a],['B',b]]) {
            const height = Math.round(meta.height*width/meta.width), file = `${id}-${name}.png`;
            // PNG只用于隔离重采样影响，不叠加JPEG重编码；这不是最终发布格式/传输预算。
            await sharp(bytes).resize(width,height,{kernel:'lanczos3'}).png().toFile(path.join(out,file));
            candidates.push({name,file,width,height,decodedBytes:width*height*4});
        }
        assets.push({id,label,source:relative,sourceSha256:crypto.createHash('sha256').update(bytes).digest('hex'),
            original,width:meta.width,height:meta.height,decodedBytes:meta.width*meta.height*4,
            displayWidth,displayHeight,candidates});
    }
    const originalBytes=assets.reduce((sum,item)=>sum+item.decodedBytes,0);
    fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({version:1,status:'review-only-not-installed',
        originalBytes,assets,operation:'whole-canvas Lanczos3 to PNG, preserve aspect; no art generation',
        candidateBytes:{A:assets.reduce((sum,item)=>sum+item.candidates[0].decodedBytes,0),
            B:assets.reduce((sum,item)=>sum+item.candidates[1].decodedBytes,0)},
        limitations:['未接入Cocos，不是真实GPU测量','九宫格源图缩放不能证明实际边框还原，接入前须同步边距并截图',
            '不声称逐像素无损或预算达标，需用户确认清晰度','生成附件忽略于Git；原图与正式游戏不变']},null,2)+'\n');
    console.log(JSON.stringify({out,originalBytes,assets:assets.length}));
}
if (require.main === module) main(process.argv[2] || 'sharp').catch(error=>{console.error(error);process.exitCode=1;});
