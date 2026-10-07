const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveCombatDamage } = require('../.test-dist/systems/CombatDamage');
const { RIVET_GUN, FROST_COIL, CLOCKWORK_INFANTRY, PHASE_B_TOWERS } = require('../.test-dist/config/PhaseBCombatConfig');
const { SIEGE_TANK, SHIELD_GUARD, PIERCING_CANNON, ARC_TOWER, ALL_TOWERS, THIRD_LEVEL_WAVES } = require('../.test-dist/config/ThirdLevelCombatConfig');
const { TowerLoadout, validLoadout, THIRD_LEVEL_LOADOUT, FIXED_BEGINNER_LOADOUT } = require('../.test-dist/systems/TowerLoadout');
const { towerAtLevel } = require('../.test-dist/systems/TowerLevelRules');
const { WaveCombatRuntime } = require('../.test-dist/systems/WaveCombatRuntime');
const { FlowField } = require('../.test-dist/systems/FlowField');
const { PHASE_A_GRIDS } = require('../.test-dist/config/PhaseAGrids');
const approx = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);

test('穿甲保留软克制，旧无甲无盾伤害与升级继承不变', () => {
    approx(resolveCombatDamage(580, 0, SIEGE_TANK, RIVET_GUN).healthDamage, 2.45);
    approx(resolveCombatDamage(580, 0, SIEGE_TANK, PIERCING_CANNON).healthDamage, 44.88);
    for (const level of [1, 2, 3]) {
        const cannon = towerAtLevel(PIERCING_CANNON, level);
        assert.equal(cannon.armorIgnore, 0.9);
        assert.equal(cannon.shieldDamageMultiplier, 0.6);
        const gun = towerAtLevel(RIVET_GUN, level);
        assert.deepEqual(resolveCombatDamage(100, 0, CLOCKWORK_INFANTRY, gun),
            { healthDamage: gun.damage, shieldDamage: 0, shieldBroken: false });
    }
    assert.deepEqual(PHASE_B_TOWERS.map(t => t.id), ['rivet-gun', 'frost-coil']);
});

test('破盾按原始伤害折算溢出，护甲只减生命，不会双重扣伤', () => {
    const result = resolveCombatDamage(150, 10, { armorReduction: 0.65 }, ARC_TOWER);
    assert.equal(result.shieldDamage, 10);
    approx(result.healthDamage, 3.5);
    assert.equal(result.shieldBroken, true);
    const shieldOnly = resolveCombatDamage(150, 160, SHIELD_GUARD, ARC_TOWER);
    assert.deepEqual(shieldOnly, { shieldDamage: 35, healthDamage: 0, shieldBroken: false });
    approx(resolveCombatDamage(150, 160, SHIELD_GUARD, RIVET_GUN).shieldDamage, 4.2);
    assert.equal(resolveCombatDamage(150, 160, SHIELD_GUARD, FROST_COIL).shieldDamage, 4);
    assert.equal(resolveCombatDamage(1, 0, {}, ARC_TOWER).healthDamage, 1);
    assert.equal(resolveCombatDamage(0, 0, {}, ARC_TOWER).healthDamage, 0);
});

const grid = PHASE_A_GRIDS['grid-9x13'];
const flow = new FlowField(grid, new Set());
function spawnPair(tower, enemies) {
    const runtime = new WaveCombatRuntime(grid, [tower]);
    runtime.start({ wave: 1, clearReward: 0, groups: enemies.map(enemy => ({ enemy, count: 1, spawnIntervalSeconds: 0.1 })) });
    runtime.tick(1.7, flow, []);
    // 两只均在射程内，普通敌人更接近终点，克制类优先仍应选后来的敌人。
    runtime.enemies.forEach((enemy, i) => {
        enemy.fromCell = { column: 4, row: 3 - i };
        enemy.toCell = { column: 4, row: 4 - i };
        enemy.progress = 0;
    });
    return runtime;
}
const deployment = tower => [{ towerId: tower.id, cell: { column: 3, row: 2 } }];

test('穿甲优先有甲、电弧优先有盾；新威胁和破盾会解除旧锁定', () => {
    const cannon = spawnPair(PIERCING_CANNON, [CLOCKWORK_INFANTRY, SIEGE_TANK]);
    assert.equal(cannon.tick(0, flow, deployment(PIERCING_CANNON)).shots[0].targetId, cannon.enemies[1].id);
    const arc = spawnPair(ARC_TOWER, [SHIELD_GUARD, SHIELD_GUARD]);
    arc.enemies[1].shield = 0;
    assert.equal(arc.tick(0, flow, deployment(ARC_TOWER)).shots[0].targetId, arc.enemies[0].id);
    arc.enemies[0].shield = 0;
    arc.enemies[1].shield = 160;
    assert.equal(arc.tick(0.65, flow, deployment(ARC_TOWER)).shots[0].targetId, arc.enemies[1].id);
});

test('破盾与击杀事件只结算一次，尸体不会被后续塔重复击杀', () => {
    const runtime = new WaveCombatRuntime(grid, [ARC_TOWER]);
    runtime.start({ wave: 1, clearReward: 0, groups: [{ enemy: { ...SHIELD_GUARD, maxHealth: 1, maxShield: 1 }, count: 1, spawnIntervalSeconds: 1 }] });
    runtime.tick(0, flow, []);
    const result = runtime.tick(0, flow, [
        { towerId: ARC_TOWER.id, cell: { column: 3, row: 0 } },
        { towerId: ARC_TOWER.id, cell: { column: 5, row: 0 } },
    ]);
    assert.equal(result.shots.length, 1);
    assert.equal(result.shots[0].shieldBroken, true);
    assert.equal(result.shots[0].shieldDamage, 1);
    assert.equal(result.shots[0].healthDamage, 1);
    assert.equal(result.killed.length, 1);
    assert.equal(runtime.totals.killed, 1);
    assert.equal(runtime.tick(1, flow, []).killed.length, 0);
});

test('第三关先分别教护甲和护盾，后段密度独立配置，真实只有四塔', () => {
    assert.equal(THIRD_LEVEL_WAVES.length, 8);
    assert.deepEqual(THIRD_LEVEL_WAVES[0].groups.map(g => g.enemy.id), ['clockwork-infantry', 'siege-tank']);
    assert.deepEqual(THIRD_LEVEL_WAVES[1].groups.map(g => g.enemy.id), ['clockwork-infantry', 'shield-guard']);
    assert.deepEqual(THIRD_LEVEL_WAVES.map(w => w.groups.reduce((sum, g) => sum + g.count, 0)), [11,14,17,12,12,42,44,62]);
    approx(THIRD_LEVEL_WAVES[7].groups[3].spawnIntervalSeconds, 1.12);
    assert.equal(ALL_TOWERS.length, 4);
    assert.equal(CLOCKWORK_INFANTRY.maxHealth, 85);
});

test('配塔至少一种、上限五种、拒绝重复未知塔；不携带克制塔仅警告', () => {
    const loadout = new TowerLoadout(THIRD_LEVEL_LOADOUT);
    assert.equal(loadout.choose([]), false);
    assert.equal(loadout.choose(['arc-tower', 'arc-tower']), false);
    assert.equal(loadout.choose(['unknown']), false);
    assert.equal(loadout.choose(['frost-coil']), true);
    assert.equal(loadout.warnings.length, 2);
    const synthetic = ['a','b','c','d','e','f'];
    assert.equal(validLoadout(synthetic.slice(0, 5), synthetic), true);
    assert.equal(validLoadout(synthetic, synthetic), false);
    const beginner = new TowerLoadout(FIXED_BEGINNER_LOADOUT);
    assert.equal(beginner.choose(['rivet-gun']), false);
    assert.deepEqual(beginner.ids, ['rivet-gun','frost-coil']);
});

test('阵容保持选择顺序、开局目录独立，切关存档隔离且坏存档回默认', () => {
    const values = new Map();
    const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
    const loadout = new TowerLoadout(THIRD_LEVEL_LOADOUT);
    loadout.choose(['arc-tower','piercing-cannon']);
    const run = loadout.freeze(ALL_TOWERS);
    loadout.save(storage, 'third-level');
    loadout.choose(['rivet-gun']);
    assert.deepEqual(run.map(t => t.id), ['arc-tower','piercing-cannon']);
    assert.equal(Object.isFrozen(run), true);
    loadout.restore(storage, 'third-level');
    assert.deepEqual(loadout.ids, ['arc-tower','piercing-cannon']);
    loadout.restore(storage, 'second-level');
    assert.deepEqual(loadout.ids, THIRD_LEVEL_LOADOUT.defaults);
    storage.setItem('nightwatch:loadout:v1:third-level', '{bad');
    loadout.restore(storage, 'third-level');
    assert.deepEqual(loadout.ids, THIRD_LEVEL_LOADOUT.defaults);
    for (const ids of [[], ['arc-tower','arc-tower'], ['obsolete-tower']]) {
        storage.setItem('nightwatch:loadout:v1:third-level', JSON.stringify({ version: 1, ids }));
        loadout.restore(storage, 'third-level');
        assert.deepEqual(loadout.ids, THIRD_LEVEL_LOADOUT.defaults);
    }
    const unavailable = { getItem() { throw Error('denied'); }, setItem() { throw Error('denied'); } };
    loadout.restore(unavailable, 'third-level');
    assert.equal(loadout.save(unavailable, 'third-level'), false);
});
