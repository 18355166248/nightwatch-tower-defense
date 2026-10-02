const fs = require('node:fs');
const path = require('node:path');
const { root, images, readOriginalImage } = require('./design-image-store.cjs');
const prefix = process.argv[2];
if (!prefix || !/^(art-source|docs)\//.test(prefix) || prefix.includes('..')) throw new Error('必须显式指定 art-source/ 或 docs/ 下的文件或目录前缀');
(async () => {
    const keys = Object.keys(images()).filter(key => key === prefix || key.startsWith(prefix.replace(/\/$/, '') + '/'));
    if (!keys.length) throw new Error('没有匹配的归档图片');
    for (const key of keys) {
        if (!/^(art-source|docs)\/.+\.(png|jpe?g)$/i.test(key) || key.split('/').includes('..')) throw new Error('归档图片路径无效');
        const file = path.resolve(root, key);
        if (!file.startsWith(root + path.sep)) throw new Error('归档路径越界');
        if (fs.existsSync(file)) continue;
        const bytes = await readOriginalImage(file);
        // 只恢复请求的原图且不覆盖已有文件；恢复图不应该重新提交，完成后重新执行归档收尾。
        fs.mkdirSync(path.dirname(file), { recursive: true });
        if (!fs.realpathSync(path.dirname(file)).startsWith(root + path.sep)) throw new Error('恢复目录不能经链接逃逸项目');
        fs.writeFileSync(file, bytes, { flag: 'wx' });
    }
    console.log('原始字节恢复完成：' + keys.length + ' 张');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
