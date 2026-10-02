const { resolve, join } = require('node:path');
const sharp = require('sharp');

// 只生成临时评审证据，不改游戏资产；SHOW_ALL黑边剔除后按宽度等比归一，禁止拉伸截图。
async function compare(directory, state) {
    const reference = join(directory, `reference-${state}.jpg`);
    const implementation = join(directory, `implementation-${state}.jpg`);
    const source = await sharp(reference).metadata();
    const actual = await sharp(implementation).metadata();
    if (source.width !== 390 || source.height !== 844) throw Error('参考稿必须为390×844内容区域');
    const phoneWidth = Math.round(actual.height * 1080 / 1920);
    if (actual.width < phoneWidth) throw Error('截图不是SHOW_ALL宽屏布局，需另行记录适配方式');
    const phoneLeft = Math.floor((actual.width - phoneWidth) / 2);
    const normalizedHeight = Math.round(actual.height * 390 / phoneWidth);
    const sourceTop = Math.round((844 - normalizedHeight) / 2);
    const normalized = await sharp(implementation).extract({left:phoneLeft,top:0,width:phoneWidth,height:actual.height})
        .resize(390, normalizedHeight).png().toBuffer();
    const truth = await sharp(reference).extract({left:0,top:sourceTop,width:390,height:normalizedHeight}).png().toBuffer();
    await sharp({create:{width:800,height:normalizedHeight,channels:4,background:'#101720'}})
        .composite([{input:truth,left:0,top:0},{input:normalized,left:410,top:0}])
        .png().toFile(join(directory, `${state}-comparison.png`));
    const focused = {left:23,top:258-sourceTop,width:344,height:395};
    await sharp({create:{width:708,height:395,channels:4,background:'#101720'}})
        .composite([{input:await sharp(truth).extract(focused).png().toBuffer(),left:0,top:0},
            {input:await sharp(normalized).extract(focused).png().toBuffer(),left:364,top:0}])
        .png().toFile(join(directory, `${state}-focused-comparison.png`));
    console.log(JSON.stringify({state,sourcePixels:[source.width,source.height],implementationPixels:[actual.width,actual.height],
        gameCrop:{left:phoneLeft,width:phoneWidth,height:actual.height},normalized:[390,normalizedHeight],sourceTop}));
}

(async () => {
    if (!process.argv[2]) throw Error('传入本轮临时证据目录，不向仓库重新写入大图');
    for (const state of ['restart','home']) await compare(resolve(process.argv[2]), state);
})().catch(error => { console.error(error.message); process.exitCode = 1; });
