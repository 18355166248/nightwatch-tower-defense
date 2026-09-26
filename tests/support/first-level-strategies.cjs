const {
    FIRST_LEVEL_GUIDED_UPGRADES,
    FIRST_LEVEL_OPENING,
    FIRST_LEVEL_REINFORCEMENTS,
} = require('../../.test-dist/config/FirstLevelOpening.js');

const allRivets = (entries) => entries.map((entry) => ({ ...entry, towerId: 'rivet-gun' }));

function standardLayout(row = 2) {
    const opening = FIRST_LEVEL_OPENING.map((entry) => ({ ...entry, cell: { ...entry.cell, row } }));
    const reinforcements = FIRST_LEVEL_REINFORCEMENTS.map((entry, index) => index < 3
        ? { ...entry, cell: { ...entry.cell, row } }
        : entry);
    const upgradesAfterWave = FIRST_LEVEL_GUIDED_UPGRADES.map((entry) => entry.cell.row === 2
        ? { ...entry, cell: { ...entry.cell, row } }
        : entry);
    const shared = { openingCells: opening.map(({ cell }) => cell), upgradesAfterWave };
    return {
        mixed: { ...shared, opening, reinforcements },
        // 纯机枪多补一座，终局累计投入仅比混合构筑少 4 金；同格直接替换会少花 34 金，不够公平。
        pure: { ...shared, opening: allRivets(opening), reinforcements: [
            ...allRivets(reinforcements),
            { afterWave: 6, cell: { column: 7, row: 9 }, towerId: 'rivet-gun' },
        ] },
    };
}

module.exports = { standardLayout };
