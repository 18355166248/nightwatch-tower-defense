const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'../..');
const dir = path.join(root,'docs/design/first-level-quality-v2/pages');
test('既有非战斗页面均有独立设计源和预览，而非用运行截图冒充稿件',()=>{
    const states=JSON.parse(fs.readFileSync(path.join(dir,'state-index.json'),'utf8'));
    const expected=['home','home-settings','pause','lifecycle','settings','confirm-restart','confirm-home','route-error','orientation','victory','defeat','intermission'];
    assert.deepEqual(states.map(s=>s.id).sort(),expected.sort());
    for(const state of states) {
        assert.ok(fs.existsSync(path.join(dir,state.source)));
        assert.ok(require('../../scripts/design-image-store.cjs').hasImage(path.join(dir,state.preview)));
        assert.ok(!state.source.startsWith('runtime-'));
        const source=fs.readFileSync(path.join(dir,state.source),'utf8');
        assert.ok(source.includes('viewBox="0 0 1080 1920"'));
        assert.ok(source.includes('PingFang SC'));
    }
});
