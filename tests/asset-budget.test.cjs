const test = require('node:test');
const assert = require('node:assert/strict');
const { imageDimensions, rgbaBytes, selectTextureSet, textureBasesInSource, budgetPassed } = require('../scripts/report-first-level-budget.cjs');
const { RIVET_HEAD_RESOURCE_PATHS, rivetHeadResourcePath } = require('../.test-dist/presentation/RivetHeadResourcePaths.js');

test('三级八方向运行清单与预算发现一致，24张全部入账而非人工豁免动态路径', () => {
    const fs = require('node:fs'), path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../assets/scripts/presentation/RivetHeadResourcePaths.ts'), 'utf8');
    const expected = Object.values(RIVET_HEAD_RESOURCE_PATHS).flatMap(group => Object.values(group));
    assert.equal(expected.length, 24); assert.equal(new Set(expected).size, 24);
    assert.deepEqual(textureBasesInSource(source).sort(), expected.map(p => p.replace('/spriteFrame','')).sort());
    for (const [level, group] of Object.entries(RIVET_HEAD_RESOURCE_PATHS)) for (const direction of Object.keys(group)) {
        assert.equal(rivetHeadResourcePath(Number(level), direction), group[direction]);
        assert.ok(fs.existsSync(path.resolve(__dirname, '../assets/resources', group[direction].replace('/spriteFrame','.png'))));
    }
    assert.throws(() => rivetHeadResourcePath(4,'north'),RangeError);
    assert.throws(() => rivetHeadResourcePath(1,'unknown'),RangeError);
});

test('无损 WebP 尺寸计入同一 RGBA 预算，截断与未知版本拒绝放行', () => {
    const b = Buffer.alloc(26);
    b.write('RIFF'); b.writeUInt32LE(18,4); b.write('WEBPVP8L',8); b.writeUInt32LE(5,16); b[20] = 0x2f;
    b.writeUInt32LE(639 | (1136 << 14),21);
    assert.deepEqual(imageDimensions(b), {width:640,height:1137});
    assert.throws(() => imageDimensions(b.subarray(0,25)));
    b[24] |= 0x20; assert.throws(() => imageDimensions(b));
});

test('纹理预算按RGBA与完整mipmap计数，不用PNG文件压缩体积冒充解码内存', () => {
    assert.equal(rgbaBytes(1024, 1024), 4 * 1024 * 1024);
    assert.equal(rgbaBytes(4, 2, true), 32 + 8 + 4);
    assert.throws(() => rgbaBytes(NaN, 128));
    assert.throws(() => rgbaBytes(1.5, 128));
    assert.throws(() => rgbaBytes(Number.MAX_SAFE_INTEGER, 128));
});

test('低占用常驻集合与旧高分比较图互斥；指定档位也不能绕过整包预算', () => {
    const bases = ['level-one/backdrop', 'level-one/backdrop-plaza-v2', 'level-one/backdrop-plaza-budget-v1',
        'level-one/backdrop-budget-v1', 'level-one/units/clockwork-infantry',
        'level-one/units/clockwork-infantry-walk-rig-v2', 'level-one/units/clockwork-infantry-collapse-rig-v1',
        'level-one/units/clockwork-infantry-walk-rig-budget-v1', 'level-one/units/clockwork-infantry-collapse-rig-budget-v1'];
    assert.equal(selectTextureSet(bases,true,false,true).length,4);
    assert.ok(!selectTextureSet(bases,true,false,true).includes('level-one/units/clockwork-infantry-walk-rig-v2'));
    assert.ok(selectTextureSet(bases,true,true,true).includes('level-one/backdrop-budget-v1'));
    const report = { wholeBuildWithin20MiB:true, variants:{ rigCandidate:{residentTexturesWithin8MiB:false,firstScreenTexturesWithin3MiB:true},
        compactRigCandidate:{residentTexturesWithin8MiB:true,firstScreenTexturesWithin3MiB:true} } };
    assert.equal(budgetPassed(report),false);
    assert.equal(budgetPassed(report,'compact'),true);
    assert.equal(budgetPassed({...report,wholeBuildWithin20MiB:false},'compact'),false);
    assert.throws(()=>budgetPassed(report,'unknown'));
});

test('预算读取PNG尺寸头，无效尺寸与未知格式不以0字节放行', () => {
    const png = Buffer.alloc(24);
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(png);
    png.writeUInt32BE(512, 16); png.writeUInt32BE(1024, 20);
    assert.deepEqual(imageDimensions(png), { width: 512, height: 1024 });
    assert.throws(() => imageDimensions(Buffer.from('not-an-image')));
    png.writeUInt32BE(0, 16); assert.throws(() => imageDimensions(png));
});

test('源码资源发现不漏下划线或数字路径，只移除Cocos子资源后缀', () => {
    assert.deepEqual(textureBasesInSource(`const p = 'level-one/units/rig_v3/texture';
        const q = "level-one/ui/icon-2/spriteFrame"; const unrelated = 'other/icon';`),
        ['level-one/units/rig_v3', 'level-one/ui/icon-2']);
});

test('JPEG尺寸读SOF，不依赖系统图片工具或扩展名猜测', () => {
    const jpg = Buffer.from([255, 216, 255, 224, 0, 4, 0, 0, 255, 192, 0, 8, 8, 6, 136, 3, 173, 1, 255, 217]);
    assert.deepEqual(imageDimensions(jpg), { width: 941, height: 1672 });
    assert.throws(() => imageDimensions(jpg.subarray(0, 13)));
});

test('资源预算展开页面与结算模板路径，不漏动态九宫格；未知集合拒绝放行', () => {
    const source = "const ASSETS=['panel','primary'] as const; for(const name of ASSETS) resources.load(`level-one/ui/quality-v3/${name}/spriteFrame`); for(const name of ['gold-coins'])resources.load(`level-one/ui/${name}/spriteFrame`);";
    assert.deepEqual(textureBasesInSource(source), ['level-one/ui/quality-v3/panel', 'level-one/ui/quality-v3/primary', 'level-one/ui/gold-coins']);
    assert.throws(() => textureBasesInSource('resources.load(`level-one/ui/${unknown}/spriteFrame`)'), /无法静态展开/);
    assert.throws(() => textureBasesInSource('for(const name of getNames())resources.load(`level-one/ui/${name}/spriteFrame`)'), /无法静态展开/);
    assert.deepEqual(textureBasesInSource("function a(){const ART=['a'];for(const name of ART)load(`level-one/ui/${name}/spriteFrame`)} function b(){const ART=['b'];for(const name of ART)load(`level-one/ui/${name}/spriteFrame`)}"), ['level-one/ui/a','level-one/ui/b']);
    assert.throws(() => textureBasesInSource("let ART=['a'];for(const name of ART)load(`level-one/ui/${name}/spriteFrame`)"), /无法静态展开/);
});

test('候选额外图集与原A/B同时计入；主背景和回退背景不能重复算常驻', () => {
    const bases = ['level-one/backdrop', 'level-one/backdrop-plaza-v2', 'level-one/units/clockwork-infantry',
        'level-one/units/clockwork-infantry-walk-rig-v2', 'level-one/units/clockwork-infantry-collapse-rig-v1'];
    assert.deepEqual(selectTextureSet(bases, false), ['level-one/backdrop-plaza-v2', 'level-one/units/clockwork-infantry']);
    const rig = selectTextureSet(bases, true);
    assert.equal(rig.length, 4); assert.ok(rig.includes('level-one/units/clockwork-infantry'));
    const fallback = selectTextureSet(bases, true, true);
    assert.ok(fallback.includes('level-one/backdrop')); assert.ok(!fallback.includes('level-one/backdrop-plaza-v2'));
});
