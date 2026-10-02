// 只读审核现有切图：统计透明留白的理论上限，不修改源图，也不冒称裁边后已省显存。
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function alphaBounds(data, width, height, padding = 1) {
    if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0
        || data.length !== width*height*4 || !Number.isSafeInteger(padding) || padding < 0) {
        throw new Error('审核输入必须是完整RGBA缓冲和有效尺寸/安全边距');
    }
    let left = width, top = height, right = -1, bottom = -1;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        if (data[(y * width + x) * 4 + 3] === 0) continue;
        left = Math.min(left, x); right = Math.max(right, x);
        top = Math.min(top, y); bottom = Math.max(bottom, y);
    }
    // 空图不建议销毁/改尺寸，交由资源审查决定；边缘保留一像素，避免双线性过滤直接截边。
    if (right < left) return null;
    return { left: Math.max(0, left-padding), top: Math.max(0, top-padding),
        right: Math.min(width-1, right+padding), bottom: Math.min(height-1, bottom+padding) };
}

async function audit(root, budget, sharp) {
    const resources = new Set(budget.variants.normal.resources);
    const textures = [];
    for (const texture of budget.textures) {
        const base = texture.resourceBase;
        if (!resources.has(base) || !base.includes('/ui/quality-')) continue;
        const file = path.join(root, 'assets/resources', `${base}.png`);
        const encoded = fs.readFileSync(file);
        const sha256 = crypto.createHash('sha256').update(encoded).digest('hex');
        // 来源发生漂移时中断，不能把旧预算的尺寸与新图的像素混在一起。
        if (sha256 !== texture.sha256) throw new Error(`预算来源与现有文件不一致：${base}`);
        const {data, info} = await sharp(encoded).ensureAlpha().raw().toBuffer({resolveWithObject:true});
        const bounds = alphaBounds(data, info.width, info.height);
        const proposedPixels = bounds ? (bounds.right-bounds.left+1)*(bounds.bottom-bounds.top+1) : info.width*info.height;
        textures.push({resourceBase:base, sha256, width:info.width, height:info.height, bounds,
            decodedBytes:info.width*info.height*4, maximumPaddingSavingBytes:(info.width*info.height-proposedPixels)*4});
    }
    return {version:1, operation:'read-only alpha bounds with 1px filter guard', textures,
        maximumPaddingSavingBytes:textures.reduce((sum,t)=>sum+t.maximumPaddingSavingBytes,0),
        limitations:['不是已接入的裁边结果；原始画布、锚点和九宫格需保留',
            '透明像素RGB及过滤边缘仍需对照，不能以alpha边界断言最终视觉无损',
            '只审核normal集合的quality UI PNG，不计其他资源，不改变任何预算']};
}

if (require.main === module) {
    const [budgetFile, sharpModule, output] = process.argv.slice(2);
    if (!budgetFile || !sharpModule || !output) throw new Error('用法：node audit-ui-texture-padding.cjs <预算JSON> <sharp模块路径> <输出JSON>');
    audit(path.resolve(__dirname,'..'), JSON.parse(fs.readFileSync(budgetFile,'utf8')), require(sharpModule))
        .then(report => {fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n'); console.log(JSON.stringify({
            textureCount:report.textures.length, maximumPaddingSavingBytes:report.maximumPaddingSavingBytes, output}));})
        .catch(error => {console.error(error.message); process.exitCode=1;});
}
module.exports = {alphaBounds, audit};
