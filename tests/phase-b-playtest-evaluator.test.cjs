'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { COLUMNS, evaluatePlaytests, readPlaytests } = require('../scripts/phase-b-playtest-evaluator.cjs');

const sample = (id, result, overrides = {}) => ({
    tester_id: id,
    build_id: 'phase-b-wave-briefing-1123', browser_viewport: 'IAB 360x780',
    new_player: '1', unassisted: '1', qa_mode: '0', speed_1x: '1', result,
    tutorial_completed: '1', first_wave_start_seconds: '78',
    victory_elapsed_seconds: result === 'victory' ? '420' : '',
    route_understood: '1', tower_roles_understood: '1', duplicate_charge: '0',
    input_softlock: '0', quit_before_first_route: '0', evidence_ref: `${id}.mp4`,
    ...overrides,
});

test('试玩 CSV 空模板不会被误判为达标，带逗号的证据引用可解析', () => {
    assert.equal(evaluatePlaytests(readPlaytests(`${COLUMNS.join(',')}\n`)).status, 'invalid');
    const source = `${COLUMNS.join(',')}\n${COLUMNS.map((column) => column === 'evidence_ref' ? '"clip,part1.mp4"' : sample('P01', 'victory')[column]).join(',')}\n`;
    assert.equal(readPlaytests(source)[0].evidence_ref, 'clip,part1.mp4');
});

test('五名新玩家三人胜利且教学、理解、时长均达标时通过', () => {
    const rows = [
        sample('P01', 'victory', { victory_elapsed_seconds: '361' }),
        sample('P02', 'victory', { victory_elapsed_seconds: '420' }),
        sample('P03', 'victory', { victory_elapsed_seconds: '479' }),
        sample('P04', 'defeat', { route_understood: '0', tower_roles_understood: '0', first_wave_start_seconds: '95' }),
        sample('P05', 'quit', { tutorial_completed: '0', first_wave_start_seconds: '', quit_before_first_route: '1' }),
    ];
    const result = evaluatePlaytests(rows);
    assert.equal(result.status, 'pass');
    assert.equal(result.metrics.victoryMedianSeconds, 420);
    assert.equal(result.metrics.teachingMedianSeconds, 78);
    assert.equal(result.metrics.tutorialCompleted, 4);
});

test('两名首次造路前退出或一次重复扣费不能被其他指标掩盖', () => {
    const rows = [sample('P01', 'victory'), sample('P02', 'victory'), sample('P03', 'victory'),
        sample('P04', 'quit', { tutorial_completed: '0', first_wave_start_seconds: '', quit_before_first_route: '1' }),
        sample('P05', 'quit', { tutorial_completed: '0', first_wave_start_seconds: '', quit_before_first_route: '1' })];
    const result = evaluatePlaytests(rows);
    assert.equal(result.status, 'fail');
    assert.equal(result.gates.earlyExit, false);
    assert.equal(evaluatePlaytests(rows.map((row, index) => index === 4 ? { ...row, duplicate_charge: '1' } : row)).gates.inputStability, false);
});

test('QA、非首次、非一倍速和缺证据均使样本无效，不伪装成失败率', () => {
    const rows = [sample('P01', 'victory'), sample('P02', 'victory'), sample('P03', 'victory'),
        sample('P04', 'defeat'), sample('P05', 'defeat', { qa_mode: '1', speed_1x: '0', evidence_ref: '' })];
    const result = evaluatePlaytests(rows);
    assert.equal(result.status, 'invalid');
    assert.match(result.errors.join(' '), /有效首局/);
    assert.match(result.errors.join(' '), /观察记录引用/);
});

test('不同构建的试玩不得混入同一组结论', () => {
    const rows = ['P01', 'P02', 'P03', 'P04', 'P05'].map((id) => sample(id, 'victory'));
    rows[4] = { ...rows[4], build_id: 'other-build' };
    assert.match(evaluatePlaytests(rows).errors.join(' '), /不同构建/);
});

test('五人全部胜利仍不满足目标胜率，且教学超过 90 秒单独失败', () => {
    const rows = ['P01', 'P02', 'P03', 'P04', 'P05'].map((id) => sample(id, 'victory', { first_wave_start_seconds: '91' }));
    const result = evaluatePlaytests(rows);
    assert.equal(result.status, 'fail');
    assert.equal(result.gates.victoryRate, false);
    assert.equal(result.gates.teachingDuration, false);
});
