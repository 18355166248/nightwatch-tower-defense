'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ts = require('typescript');

const MIB = 1024 * 1024;
const BACKDROPS = ['level-one/backdrop-plaza-v2', 'level-one/backdrop',
    'level-one/backdrop-plaza-budget-v1', 'level-one/backdrop-budget-v1'];
const RIG_ATLASES = ['level-one/units/clockwork-infantry-walk-rig-v2', 'level-one/units/clockwork-infantry-collapse-rig-v1',
    'level-one/units/clockwork-infantry-walk-rig-budget-v1', 'level-one/units/clockwork-infantry-collapse-rig-budget-v1'];

function imageDimensions(bytes) {
    if (bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
        const width = bytes.readUInt32BE(16);
        const height = bytes.readUInt32BE(20);
        if (width > 0 && height > 0) return { width, height };
    }
    if (bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216) {
        const sof = new Set([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207]);
        let offset = 2;
        while (offset + 4 <= bytes.length) {
            if (bytes[offset++] !== 255) break;
            while (bytes[offset] === 255) offset += 1;
            const marker = bytes[offset++];
            if (marker === 217 || marker === 218) break;
            if (marker === 1 || marker >= 208 && marker <= 215) continue;
            if (offset + 2 > bytes.length) break;
            const length = bytes.readUInt16BE(offset);
            if (length < 2 || offset + length > bytes.length) break;
            if (sof.has(marker) && length >= 8) {
                const height = bytes.readUInt16BE(offset + 3);
                const width = bytes.readUInt16BE(offset + 5);
                if (width > 0 && height > 0) return { width, height };
            }
            offset += length;
        }
    }
    throw new Error('无法读取PNG/JPEG尺寸，拒绝把未知格式按0字节预算');
}

function rgbaBytes(width, height, mipmaps = false) {
    if (![width, height].every(v => Number.isSafeInteger(v) && v > 0)) throw new Error('纹理尺寸必须为正整数');
    let total = width * height * 4;
    if (!Number.isSafeInteger(total)) throw new Error('纹理字节数超出安全整数范围');
    if (mipmaps) {
        while (width > 1 || height > 1) {
            width = Math.max(1, Math.floor(width / 2));
            height = Math.max(1, Math.floor(height / 2));
            total += width * height * 4;
            if (!Number.isSafeInteger(total)) throw new Error('mipmap字节数超出安全整数范围');
        }
    }
    return total;
}

function textureBasesInSource(source) {
    const bases = Array.from(source.matchAll(/['"](level-one\/[^'"]+)['"]/g), match =>
        match[1].replace(/\/(spriteFrame|texture)$/, ''));
    const file = ts.createSourceFile('resources.ts', source, ts.ScriptTarget.Latest, true);
    const literalArray = expression => {
        while (expression && (ts.isAsExpression(expression) || ts.isParenthesizedExpression(expression))) expression = expression.expression;
        if (!expression || !ts.isArrayLiteralExpression(expression)
            || !expression.elements.every(ts.isStringLiteral)) return null;
        return expression.elements.map(item => item.text);
    };
    const visit = (node, callback) => { callback(node); ts.forEachChild(node, child => visit(child, callback)); };
    const resolveArray = expression => {
        if (!ts.isIdentifier(expression)) return literalArray(expression);
        // 按词法作用域找集合，不能把另一个函数同名数组的最后一次声明套进当前循环。
        for (let scope = expression.parent; scope; scope = scope.parent) {
            if (!ts.isBlock(scope) && !ts.isSourceFile(scope)) continue;
            for (const statement of scope.statements) {
                if (!ts.isVariableStatement(statement)) continue;
                for (const declaration of statement.declarationList.declarations) {
                    if (!ts.isIdentifier(declaration.name) || declaration.name.text !== expression.text) continue;
                    return statement.declarationList.flags & ts.NodeFlags.Const ? literalArray(declaration.initializer) : null;
                }
            }
        }
        return null;
    };
    // 页面饰面/结算图标使用模板路径。只展开可证明的静态for-of集合，不执行源代码；无法解析就拒绝漏算放行。
    visit(file, node => {
        if (!ts.isTemplateExpression(node) || !node.head.text.startsWith('level-one/')) return;
        const span = node.templateSpans[0];
        if (node.templateSpans.length !== 1 || !ts.isIdentifier(span.expression)) throw new Error('动态资源路径无法静态展开');
        let values = null;
        for (let parent = node.parent; parent; parent = parent.parent) {
            if (!ts.isForOfStatement(parent) || !ts.isVariableDeclarationList(parent.initializer)) continue;
            const declaration = parent.initializer.declarations[0];
            if (!declaration || !ts.isIdentifier(declaration.name) || declaration.name.text !== span.expression.text) continue;
            values = resolveArray(parent.expression);
            break;
        }
        if (!values) throw new Error(`动态资源路径无法静态展开：${node.getText(file)}`);
        for (const value of values) bases.push((node.head.text + value + span.literal.text).replace(/\/(spriteFrame|texture)$/, ''));
    });
    return Array.from(new Set(bases));
}

function selectTextureSet(resourceBases, rigCandidate, fallbackBackdrop = false, compact = false) {
    // 回退底图与主底图互斥；候选图集是额外加载，不能假装原有A/B和首页单位图已被释放。
    const selected = resourceBases.filter(base => !BACKDROPS.includes(base) && !RIG_ATLASES.includes(base));
    const offset = compact ? 2 : 0;
    selected.push(BACKDROPS[offset + (fallbackBackdrop ? 1 : 0)]);
    if (rigCandidate) selected.push(...RIG_ATLASES.slice(offset, offset + 2));
    return Array.from(new Set(selected)).sort();
}

function walkFiles(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const file = path.join(directory, entry.name);
        return fs.statSync(file).isDirectory() ? walkFiles(file) : [file];
    });
}

function buildReport(root) {
    const resourceRoot = path.join(root, 'assets/resources');
    const bases = new Set();
    // 扫描全部运行时源码，避免新表现类未登记在手工清单时漏算；动态拼接路径仍须人工复核。
    for (const loader of walkFiles(path.join(root, 'assets/scripts')).filter(file => file.endsWith('.ts'))) {
        const source = fs.readFileSync(loader, 'utf8');
        for (const base of textureBasesInSource(source)) {
            if (['.png', '.jpg'].some(ext => fs.existsSync(path.join(resourceRoot, base + ext)))) bases.add(base);
            else throw new Error(`${loader}新增未知资源 ${base}，请先更新预算识别规则`);
        }
    }
    for (const base of [...BACKDROPS, ...RIG_ATLASES]) {
        if (!bases.has(base)) throw new Error(`加载路径已漂移：${base}，禁止用旧清单报告通过`);
    }
    const buildRoot = path.join(root, 'build/web-mobile');
    const entries = Array.from(bases).map(base => {
        const ext = ['.png', '.jpg'].find(ext => fs.existsSync(path.join(resourceRoot, base + ext)));
        const sourcePath = path.join(resourceRoot, base + ext);
        const meta = JSON.parse(fs.readFileSync(sourcePath + '.meta', 'utf8'));
        const native = path.join(buildRoot, 'assets/resources/native', meta.uuid.slice(0, 2), meta.uuid + ext);
        const source = fs.readFileSync(sourcePath);
        const built = fs.readFileSync(native);
        const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
        // 当前发布配置直接复制PNG/JPEG；源与产物不符表示尚未构建，不能借旧产物证明新源预算。
        if (hash(source) !== hash(built)) throw new Error(`源与构建产物不一致：${base}，先重新构建`);
        const dimensions = imageDimensions(built);
        const textureMeta = Object.values(meta.subMetas).find(sub => sub.importer === 'texture');
        if (!textureMeta || !textureMeta.userData.mipfilter) throw new Error(`${base}缺少纹理mipmap配置`);
        const mipmaps = textureMeta.userData.mipfilter !== 'none';
        return { resourceBase: base, ...dimensions, mipmaps, transferBytes: built.length,
            decodedRgbaBytes: rgbaBytes(dimensions.width, dimensions.height, mipmaps), sha256: hash(built) };
    });
    const variants = {};
    for (const [name, rig, fallback, compact] of [['normal', false, false, false], ['rigCandidate', true, false, false],
        ['rigCandidateFallback', true, true, false], ['compactNormal', false, false, true],
        ['compactRigCandidate', true, false, true], ['compactRigCandidateFallback', true, true, true]]) {
        const selected = new Set(selectTextureSet([...bases], rig, fallback, compact));
        const textures = entries.filter(entry => selected.has(entry.resourceBase));
        const transferBytes = textures.reduce((sum, entry) => sum + entry.transferBytes, 0);
        const decodedBytes = textures.reduce((sum, entry) => sum + entry.decodedRgbaBytes, 0);
        variants[name] = { textureCount: textures.length, texturePayloadBytes: transferBytes,
            decodedRgbaBytes: decodedBytes, decodedMiB: decodedBytes / MIB,
            firstScreenTexturesWithin3MiB: transferBytes <= 3 * MIB,
            residentTexturesWithin8MiB: decodedBytes <= 8 * MIB,
            resources: textures.map(entry => entry.resourceBase) };
    }
    const wholeBuildBytes = walkFiles(buildRoot).reduce((sum, file) => sum + fs.statSync(file).size, 0);
    return { version: 1, generatedAt: new Date().toISOString(), basis: '当前源码加载清单与SHA一致的实际Web Mobile产物',
        limitations: ['RGBA8解码估算不是设备GPU/进程内存测量；Cocos ImageAsset默认RGBA8888',
            '不含引擎/字体纹理、动态合图、渲染目标、CPU副本及音频缓冲',
            '清单含静态字符串与静态for-of模板集合，不证明当前浏览器已全部加载或同时驻留；其他动态路径拒绝静默漏算',
            '图像SHA匹配不等于运行时JS与源码匹配；本报告不替代构建/浏览器验证',
            'PNG/JPEG尺寸头探测不替代完整图片解码及透明边缘验收',
            '纹理payload是无HTTP压缩的构建图像文件总量，不是完整首屏HAR',
            '整包按当前本地服务无压缩全部构建文件计数；不假定gzip或缓存抵扣'],
        variants, wholeBuildBytes, wholeBuildWithin20MiB: wholeBuildBytes <= 20 * MIB, textures: entries };
}

function budgetPassed(report, profile = 'all') {
    if (!['all', 'original', 'compact'].includes(profile)) throw new Error('--profile只接受all/original/compact');
    const variants = Object.entries(report.variants).filter(([name]) => profile === 'all'
        || name.startsWith('compact') === (profile === 'compact'));
    // 指定档位只校验该档常驻集合，但整包仍包含比较资源，不能从整包预算中抵扣。
    return variants.length > 0 && report.wholeBuildWithin20MiB
        && variants.every(([, value]) => value.residentTexturesWithin8MiB && value.firstScreenTexturesWithin3MiB);
}

if (require.main === module) {
    try {
        const root = path.resolve(__dirname, '..');
        const report = buildReport(root);
        const profileIndex = process.argv.indexOf('--profile');
        const profile = profileIndex < 0 ? 'all' : process.argv[profileIndex + 1];
        const passed = budgetPassed(report, profileIndex >= 0 && profile === undefined ? 'invalid' : profile);
        report.validation = { profile, passed };
        const outIndex = process.argv.indexOf('--out');
        if (outIndex >= 0) {
            if (!process.argv[outIndex + 1]) throw new Error('--out缺少报告路径');
            fs.writeFileSync(path.resolve(root, process.argv[outIndex + 1]), JSON.stringify(report, null, 2) + '\n');
        }
        process.stdout.write(JSON.stringify({ variants: report.variants, wholeBuildBytes: report.wholeBuildBytes,
            wholeBuildWithin20MiB: report.wholeBuildWithin20MiB, validation: report.validation }, null, 2) + '\n');
        if (!passed) process.exitCode = 1;
    } catch (error) { process.stderr.write(error.message + '\n'); process.exitCode = 2; }
}

module.exports = { imageDimensions, rgbaBytes, selectTextureSet, textureBasesInSource, buildReport, budgetPassed };
