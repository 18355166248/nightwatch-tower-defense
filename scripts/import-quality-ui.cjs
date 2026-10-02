// 独立切图机械入库；保留设计原稿，运行时不包含整张概念图和烘焙文字。
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const target = path.join(root, 'assets/resources/level-one/ui/quality-v2');
fs.mkdirSync(target, { recursive: true });
for (const name of ['hud-frame', 'inspect-frame', 'tray-frame', 'button-frame', 'disabled-frame']) {
    fs.copyFileSync(path.join(root, `docs/design/first-level-quality-v2/${name}.png`), path.join(target, `${name}.png`));
    const metaPath = path.join(target, `${name}.png.meta`);
    // 重复导入不改 UUID，避免已构建场景和缓存指向不存在的资源。
    if (!fs.existsSync(metaPath)) fs.writeFileSync(metaPath, JSON.stringify({
        ver: '1.0.27', importer: 'image', imported: false, uuid: crypto.randomUUID(), files: [], subMetas: {},
        userData: { type: 'sprite-frame', hasAlpha: true, fixAlphaTransparencyArtifacts: false },
    }, null, 2));
}
console.log('5 张独立 UI 饰面已入库；动态文字与塔图不烘焙。');
