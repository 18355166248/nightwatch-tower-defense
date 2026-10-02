const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const project = path.resolve(__dirname, '../..');
const states = import(`data:text/javascript;base64,${fs.readFileSync(path.join(project,'docs/design/first-level-quality-v2/UiReviewStates.js')).toString('base64')}`).then(module => module.UI_REVIEW_STATES);
test('设计状态明确区分战斗禁售、波间操作、不足和满级', async () => {
    const s = await states;
    assert.deepEqual(Object.keys(s), ['battle','ready','poor','max']);
    assert.equal(s.battle.sellDisabled, true);
    assert.equal(s.battle.nextDisabled, true);
    assert.equal(s.ready.upgradeDisabled, false);
    assert.equal(s.ready.sellDisabled, false);
    assert.equal(s.poor.upgradeDisabled, true);
    assert.equal(s.poor.sellDisabled, false);
    assert.equal(s.max.upgradeDisabled, true);
    assert.equal(s.max.sellDisabled, false);
});
test('统一字体比例继续保留，减负后文案节点减少', () => {
    const a = JSON.parse(fs.readFileSync(path.join(project,'docs/design/first-level-quality-v2/typography.json')));
    assert.equal(a.length,22);
    for (const t of a) assert.equal(t.scale, ['Ⅱ','×'].includes(t.value) ? 1 : .72);
    assert.ok(!a.some(t => t.value === '持续火力 · 拦截前排' || t.value === '速度' || t.value === '战斗中'));
});
