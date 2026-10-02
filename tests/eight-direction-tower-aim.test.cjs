const test = require('node:test');
const assert = require('node:assert/strict');
const { towerHeadDirection, TOWER_HEAD_DIRECTIONS, directionalHeadMuzzlePoint } =
    require('../.test-dist/presentation/EightDirectionTowerAim.js');

test('八方向使用Y向上显示坐标，侧后方均有真实帧选择，不再截断为正面', () => {
    const targets = [[0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1]];
    targets.forEach(([x, y], i) => assert.equal(towerHeadDirection({ x: 0, y: 0 }, { x, y }), TOWER_HEAD_DIRECTIONS[i]));
});

test('方向边界迟滞避免抖动，跨过边界及时切换；无目标或无效坐标保留最近方向', () => {
    const origin = { x: 10, y: 20 };
    const point = degree => ({ x: 10 + Math.sin(degree * Math.PI / 180), y: 20 + Math.cos(degree * Math.PI / 180) });
    assert.equal(towerHeadDirection(origin, point(24), 'north'), 'north');
    assert.equal(towerHeadDirection(origin, point(27), 'north'), 'north-east');
    assert.equal(towerHeadDirection(origin, point(21), 'north-east'), 'north-east');
    assert.equal(towerHeadDirection(origin, point(18), 'north-east'), 'north');
    assert.equal(towerHeadDirection(origin, point(359), 'north-west'), 'north');
    assert.equal(towerHeadDirection(origin, origin, 'south'), 'south');
    assert.equal(towerHeadDirection(origin, { x: NaN, y: 20 }, 'east'), 'east');
});

test('双炮口注册跟随同一安装轴，图片Y向下转为显示Y向上，不修改输入', () => {
    const registration = { pivot: { x: .5, y: .8 }, muzzles: [{ x: .3, y: .2 }, { x: .7, y: .2 }] };
    const mounting = { x: 50, y: 100 };
    const left = directionalHeadMuzzlePoint(registration, mounting, 100, 0);
    const right = directionalHeadMuzzlePoint(registration, mounting, 100, 1);
    assert.ok(Math.abs(left.x - 30) < 1e-9 && Math.abs(left.y - 160) < 1e-9);
    assert.ok(Math.abs(right.x - 70) < 1e-9 && Math.abs(right.y - 160) < 1e-9);
    assert.deepEqual(mounting, { x: 50, y: 100 });
    assert.throws(() => directionalHeadMuzzlePoint(registration, mounting, 0, 0), RangeError);
    const scaled = directionalHeadMuzzlePoint(registration, mounting, 100, 0, { x: 2, y: .5 });
    assert.ok(Math.abs(scaled.x - 10) < 1e-9 && Math.abs(scaled.y - 130) < 1e-9);
});

test('八张实际运行切图保持128画布、独立UUID和非动态合图；注册点均在帧内', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const { RIVET_HEAD_REGISTRATIONS } = require('../.test-dist/presentation/RivetHeadRegistrations.js');
    const uuids = new Set();
    for (const direction of TOWER_HEAD_DIRECTIONS) {
        const file = path.resolve(__dirname, '../assets/resources/level-one/units/rivet-head-eight-v1', direction+'.png');
        const png = fs.readFileSync(file);
        assert.equal(png.readUInt32BE(16), 128);
        assert.equal(png.readUInt32BE(20), 128);
        const meta = JSON.parse(fs.readFileSync(file+'.meta','utf8'));
        assert.equal(meta.subMetas.f9941.userData.packable, false);
        assert.equal(meta.subMetas['6c48a'].userData.mipfilter, 'none');
        uuids.add(meta.uuid);
        const registration = RIVET_HEAD_REGISTRATIONS[direction];
        for (const point of [registration.pivot, ...registration.muzzles]) {
            assert.ok(point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1);
        }
    }
    assert.equal(uuids.size, 8);
});
