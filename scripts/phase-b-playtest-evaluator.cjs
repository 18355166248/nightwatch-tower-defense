'use strict';

const fs = require('node:fs');

const COLUMNS = [
    'tester_id', 'build_id', 'browser_viewport', 'new_player', 'unassisted', 'qa_mode', 'speed_1x', 'result',
    'tutorial_completed', 'first_wave_start_seconds', 'victory_elapsed_seconds',
    'route_understood', 'tower_roles_understood', 'duplicate_charge', 'input_softlock',
    'quit_before_first_route', 'evidence_ref',
];

function parseCsv(source) {
    const rows = [];
    let row = [];
    let cell = '';
    let quoted = false;
    for (let index = 0; index < source.length; index += 1) {
        const char = source[index];
        if (quoted) {
            if (char === '"' && source[index + 1] === '"') {
                cell += '"';
                index += 1;
            } else if (char === '"') quoted = false;
            else cell += char;
        } else if (char === '"') quoted = true;
        else if (char === ',') {
            row.push(cell);
            cell = '';
        } else if (char === '\n') {
            row.push(cell.replace(/\r$/, ''));
            if (row.some((value) => value.trim())) rows.push(row);
            row = [];
            cell = '';
        } else cell += char;
    }
    if (quoted) throw new Error('CSV 引号未闭合');
    if (cell || row.length) {
        row.push(cell.replace(/\r$/, ''));
        if (row.some((value) => value.trim())) rows.push(row);
    }
    return rows;
}

function readPlaytests(source) {
    const [header, ...values] = parseCsv(source.replace(/^\uFEFF/, ''));
    if (!header || header.join(',') !== COLUMNS.join(',')) throw new Error(`CSV 表头必须是：${COLUMNS.join(',')}`);
    return values.map((cells, index) => {
        if (cells.length !== COLUMNS.length) throw new Error(`第 ${index + 2} 行字段数错误`);
        return Object.fromEntries(COLUMNS.map((column, columnIndex) => [column, cells[columnIndex].trim()]));
    });
}

function median(values) {
    if (!values.length) return null;
    const ordered = [...values].sort((left, right) => left - right);
    const middle = Math.floor(ordered.length / 2);
    return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}

function evaluatePlaytests(rows) {
    const errors = [];
    const ids = new Set();
    const builds = new Set();
    rows.forEach((row, index) => {
        const line = index + 2;
        if (!row.tester_id || ids.has(row.tester_id)) errors.push(`第 ${line} 行：试玩者 ID 为空或重复`);
        ids.add(row.tester_id);
        if (!row.build_id || !row.browser_viewport) errors.push(`第 ${line} 行：缺少构建标识或浏览器/视口`);
        builds.add(row.build_id);
        for (const field of ['new_player', 'unassisted', 'qa_mode', 'speed_1x', 'tutorial_completed',
            'route_understood', 'tower_roles_understood', 'duplicate_charge', 'input_softlock', 'quit_before_first_route']) {
            if (row[field] !== '0' && row[field] !== '1') errors.push(`第 ${line} 行：${field} 必须填 0 或 1`);
        }
        if (row.new_player !== '1' || row.unassisted !== '1' || row.qa_mode !== '0' || row.speed_1x !== '1') {
            errors.push(`第 ${line} 行：不是新玩家、无指导、无 QA、全程 1× 的有效首局`);
        }
        if (!['victory', 'defeat', 'quit'].includes(row.result)) errors.push(`第 ${line} 行：result 必须为 victory/defeat/quit`);
        if (row.result !== 'quit' && row.tutorial_completed !== '1') errors.push(`第 ${line} 行：非退出局却未完成首次开波`);
        if (row.quit_before_first_route === '1' && row.result !== 'quit') errors.push(`第 ${line} 行：只有主动退出才可标记首次造路前退出`);
        if (row.quit_before_first_route === '1' && row.tutorial_completed !== '0') errors.push(`第 ${line} 行：首次造路前退出不可能已经开波`);
        if (!row.evidence_ref) errors.push(`第 ${line} 行：缺少截图、录屏或观察记录引用`);
        const firstWave = row.first_wave_start_seconds;
        if (row.tutorial_completed === '1' && (!firstWave || !Number.isFinite(Number(firstWave)) || Number(firstWave) < 0)) {
            errors.push(`第 ${line} 行：已开波必须记录非负教学耗时`);
        }
        if (row.tutorial_completed === '0' && firstWave) errors.push(`第 ${line} 行：未开波不应填写教学耗时`);
        const victoryTime = row.victory_elapsed_seconds;
        if (row.result === 'victory' && (!victoryTime || !Number.isFinite(Number(victoryTime)) || Number(victoryTime) < 0)) {
            errors.push(`第 ${line} 行：胜利局必须记录非负局内秒数`);
        }
        if (row.result !== 'victory' && victoryTime) errors.push(`第 ${line} 行：非胜利局不要填写胜利局长`);
    });
    if (rows.length < 5) errors.push(`有效首局不足 5 人：当前 ${rows.length} 人`);
    if (builds.size > 1) errors.push('样本混用了不同构建版本，请分批评估');
    if (errors.length) return { status: 'invalid', errors };

    const count = rows.length;
    const numberOf = (field) => rows.filter((row) => row[field] === '1').length;
    const victories = rows.filter((row) => row.result === 'victory');
    // 未完成首次开波视为无限长，避免只看完成者把卡住的首局从教学耗时里消失。
    const teachingMedian = median(rows.map((row) => row.tutorial_completed === '1'
        ? Number(row.first_wave_start_seconds) : Infinity));
    const victoryMedian = median(victories.map((row) => Number(row.victory_elapsed_seconds)));
    const metrics = {
        players: count,
        tutorialCompleted: numberOf('tutorial_completed'),
        victories: victories.length,
        victoryMedianSeconds: victoryMedian,
        teachingMedianSeconds: Number.isFinite(teachingMedian) ? teachingMedian : null,
        teachingMedianUnfinished: !Number.isFinite(teachingMedian),
        routeUnderstood: numberOf('route_understood'),
        towerRolesUnderstood: numberOf('tower_roles_understood'),
        duplicateCharge: numberOf('duplicate_charge'),
        inputSoftlock: numberOf('input_softlock'),
        quitBeforeFirstRoute: numberOf('quit_before_first_route'),
    };
    const gates = {
        tutorial: metrics.tutorialCompleted / count >= 0.8,
        victoryRate: metrics.victories / count >= 0.6 && metrics.victories / count <= 0.85,
        victoryDuration: victoryMedian !== null && victoryMedian >= 360 && victoryMedian <= 480,
        routeUnderstanding: metrics.routeUnderstood / count >= 0.8,
        towerUnderstanding: metrics.towerRolesUnderstood / count >= 0.8,
        inputStability: metrics.duplicateCharge === 0 && metrics.inputSoftlock === 0,
        earlyExit: metrics.quitBeforeFirstRoute < 2,
        teachingDuration: teachingMedian !== null && teachingMedian <= 90,
    };
    return { status: Object.values(gates).every(Boolean) ? 'pass' : 'fail', metrics, gates };
}

if (require.main === module) {
    const file = process.argv[2];
    if (!file) {
        process.stderr.write('用法：node scripts/phase-b-playtest-evaluator.cjs <试玩记录.csv>\n');
        process.exitCode = 2;
    } else {
        try {
            const report = evaluatePlaytests(readPlaytests(fs.readFileSync(file, 'utf8')));
            process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
            if (report.status !== 'pass') process.exitCode = 1;
        } catch (error) {
            process.stderr.write(`${error.message}\n`);
            process.exitCode = 2;
        }
    }
}

module.exports = { COLUMNS, parseCsv, readPlaytests, median, evaluatePlaytests };
