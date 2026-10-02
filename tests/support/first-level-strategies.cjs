const { FIRST_LEVEL_OPENING } = require('../../.test-dist/config/FirstLevelOpening.js');
const { PHASE_B_WAVE_ONE } = require('../../.test-dist/config/PhaseBCombatConfig.js');

const allRivets = (entries) => entries.map((entry) => ({ ...entry, towerId: 'rivet-gun' }));

function standardLayout(topRow = 3) {
    // 只平移上路折线，保留中段火力点；这样两条路线能公平检验第一波冷凝塔价值。
    const opening = FIRST_LEVEL_OPENING.map((entry, index) => index < 2
        ? { ...entry, cell: { ...entry.cell, row: topRow } }
        : entry);
    const shared = { reinforcements: [], upgradesAfterWave: [], waves: [PHASE_B_WAVE_ONE] };
    return {
        mixed: { ...shared, opening },
        // 同格替换后纯机枪还多余 10 金，若仍漏怪则说明中段减速不可由平射直接替代。
        pure: { ...shared, opening: allRivets(opening) },
    };
}

module.exports = { standardLayout };
