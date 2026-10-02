// 原稿归一化与独立 SVG 设计导出；不读取游戏状态，也不把浏览器运行截图当设计源。
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'docs/design/first-level-quality-v2');
const src = path.join(root, 'art-source/design/first-level-quality-v2');
const data = (name) => `data:image/png;base64,${fs.readFileSync(path.join(out, name)).toString('base64')}`;
async function main() {
    fs.mkdirSync(out, { recursive: true });
    fs.mkdirSync(src, { recursive: true });
    const pieces = {
        'hud-frame.png': [48, 80, 1440, 232],
        'inspect-frame.png': [48, 348, 1092, 310],
        'tray-frame.png': [44, 720, 982, 226],
        'button-frame.png': [1160, 366, 332, 277],
        'disabled-frame.png': [1284, 740, 205, 184],
    };
    for (const [name, [left, top, width, height]] of Object.entries(pieces)) {
        await sharp(path.join(src, 'ui-material-board.png')).extract({ left, top, width, height }).png().toFile(path.join(out, name));
    }
    // 塔栏使用同一代表稿的局部肖像，保留地面作卡面；它们不是可用于战场的透明塔切图。
    const art = path.join(root, 'art-source/design/first-level-quality-v1/battle-art-v2.png');
    for (const [name, left, top, width, height] of [['rivet-portrait.png', 230, 229, 116, 113], ['frost-portrait.png', 661, 878, 126, 130]]) {
        await sharp(art).extract({ left, top, width, height }).resize(160, 160, { fit: 'cover' }).png().toFile(path.join(out, name));
    }
    for (const name of ['gold-coins', 'wave-beacon', 'core-heart']) {
        fs.copyFileSync(path.join(root, `assets/resources/level-one/ui/${name}.png`), path.join(out, `${name}.png`));
    }
    const img = (name, x, y, w, h, disabled = false) => `<image href="${data(name)}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="none"${name.includes('frame') ? ' filter="url(#quiet-metal)"' : ''}${disabled ? ' opacity=".55"' : ''}/>`;
    const typography = [];
    const text = (x, y, value, size = 40, color = '#f4e9cd', weight = 600, anchor = 'start') => {
        // 上轮逐项抬大字号破坏了字与面板的比例；所有文案共用一个缩放系数，不按窄屏单独放大。
        // 暂停/关闭是操作符号，保留其辨识尺寸；44px点击热区由控件层独立管理。
        const baseSize = size;
        const scale = value === 'Ⅱ' || value === '×' ? 1 : 0.72;
        size = Number((baseSize * scale).toFixed(2));
        typography.push({ x, y, value, baseSize, scale, size, color, weight, anchor, group:y >= 1440 && y < 1704 ? 'inspector' : 'common', key:value === '1×' ? 'speed' : null });
        return `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" font-weight="${weight}" text-anchor="${anchor}">${value}</text>`;
    };
    const bg = `data:image/png;base64,${fs.readFileSync(art).toString('base64')}`;
    const ui = [
        img('hud-frame.png',24,24,1032,152),
        img('gold-coins.png',72,65,70,70), text(156,82,'金币',40,'#b8c6cc',500),text(156,132,'54',55,'#f4cf79'),
        img('wave-beacon.png',338,65,70,70),text(421,82,'波次',40,'#b8c6cc',500),text(421,132,'6',55),text(458,132,'/ 8',40,'#b8c6cc',500),
        img('core-heart.png',600,65,70,70),text(683,82,'核心',40,'#b8c6cc',500),text(683,132,'9',55,'#a4efea'),text(720,132,'/ 10',40,'#b8c6cc',500),
        img('button-frame.png',888,40,128,120),text(952,122,'Ⅱ',64,'#f4e9cd',700,'middle'),
        `<rect x="40" y="194" width="280" height="48" rx="4" fill="#162b3de0"/>`,text(60,230,'夜城广场',40,'#dfd3b8',500),
        `<circle cx="323" cy="894" r="290" fill="#78df9b" fill-opacity=".04" stroke="#84d59c" stroke-opacity=".6" stroke-width="2.5"/>`,
        img('inspect-frame.png',24,1440,1032,264),
        img('rivet-portrait.png',85,1498,112,112),
        text(220,1505,'机枪塔',46),text(390,1505,'Lv.3',40,'#f4cf79'),text(550,1505,'伤害 18 · 射程 3.2',40,'#b8c6cc',500),
        text(985,1510,'×',60,'#b8c6cc',400,'middle'),
        img('disabled-frame.png',220,1544,320,144),text(380,1635,'出售 67',36,'#f4e9cd',500,'middle'),img('disabled-frame.png',560,1544,340,144,true),text(730,1635,'已满级',36,'#aebbc2',500,'middle'),
        img('tray-frame.png',24,1724,1032,172),
        img('rivet-portrait.png',76,1752,112,112),text(204,1798,'机枪塔',44),text(204,1850,'30',48,'#f4cf79'),
        img('frost-portrait.png',396,1752,112,112),text(524,1798,'冷凝塔',44),text(524,1850,'40',48,'#f4cf79'),
        img('button-frame.png',704,1750,128,120),text(768,1823,'1×',46,'#f4e9cd',700,'middle'),
        img('disabled-frame.png',844,1750,162,120),text(925,1823,'下一波',36,'#f4e9cd',500,'middle'),
    ].join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920"><defs><filter id="quiet-metal" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values=".7"/><feComponentTransfer><feFuncR type="linear" slope=".78"/><feFuncG type="linear" slope=".78"/><feFuncB type="linear" slope=".78"/></feComponentTransfer></filter></defs><style>text{font-family:'PingFang SC','Microsoft YaHei',sans-serif}</style><image href="${bg}" width="1080" height="1920" preserveAspectRatio="none"/>${ui}</svg>`;
    fs.writeFileSync(path.join(out, 'design-target.svg'), svg);
    await sharp(Buffer.from(svg)).png().toFile(path.join(out, 'design-target.png'));
    // 基线契约同时供设计导出与原生SVG文字节点消费，避免两套字体尺寸逐渐漂移。
    fs.writeFileSync(path.join(out, 'typography.json'), JSON.stringify(typography,null,2));
    fs.writeFileSync(path.join(out, 'slice-manifest.json'), JSON.stringify({ status:'pending-user-review', source:'art-source/design/first-level-quality-v2/ui-material-board.png', frameCropRects:pieces, coordinateSpace:[1080,1920], panels:{hud:[24,24,1032,152],inspector:[24,1440,1032,264],tray:[24,1724,1032,172]}, portraits:'Cropped concept cards only, not transparent battlefield units', text:'Native labels; no rasterized dynamic values', cocosIntegrated:true, integrationScope:'Battle HUD, tower tray and inspector only; battlefield and other pages still pending', integrationRecord:'COCOS-INTEGRATION.md' },null,2));
    console.log('设计 SVG、5 个饰面切片、2 个肖像与 3 个现有图标已导出');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
