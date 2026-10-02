const test = require('node:test');
const assert = require('node:assert/strict');
const { FeedbackVisualOrigins } = require('../.test-dist/presentation/FeedbackVisualOrigins.js');
const { CombatFeedbackRuntime } = require('../.test-dist/presentation/CombatFeedbackRuntime.js');
const { CombatVisualAnchors } = require('../.test-dist/presentation/CombatVisualAnchors.js');

test('实际绘制弹迹、枪口亮点和命中火花读取本发炮管，不串用主炮口', () => {
    const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
    const ts = require('typescript');
    const load = require('node:module').createRequire(path.resolve(__dirname,'../.test-dist/presentation/CombatFeedbackView.js'));
    const module = {exports:{}};
    const compiled = ts.transpileModule(fs.readFileSync(path.resolve(__dirname,
        '../assets/scripts/presentation/CombatFeedbackView.ts'),'utf8'),
        {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
    vm.runInNewContext(compiled,{module,exports:module.exports,require:name=>name==='cc'?{Color:class Color{}}:load(name)});
    const circles=[], moves=[];
    const graphics={circle:(x,y)=>circles.push([x,y]),moveTo:(x,y)=>moves.push([x,y]),lineTo(){},fill(){},stroke(){}};
    const view = new module.exports.CombatFeedbackView(graphics,{gridPointCenter:p=>({x:p.column*10,y:p.row*10})});
    const feedback=new CombatFeedbackRuntime();
    const shot={towerCell:{column:4,row:3},towerId:'rivet-gun',targetId:'enemy-a',
        targetPoint:{column:3,row:2},damage:7,lethal:false,appliedSlow:false};
    feedback.consume({shots:[shot,shot],killed:[],leaked:[],spawningCompleted:false});
    const anchors=new CombatVisualAnchors();
    anchors.emitter('4,3',{x:10,y:30},0); anchors.emitter('4,3',{x:20,y:30},1);
    anchors.target('enemy-a',{x:50,y:60});
    view.drawAboveUnits({grid:{},reducedMotion:false,feedback:feedback.snapshot},10,anchors);
    assert.deepEqual(Array.from(view.alignmentSamples,s=>[s.barrel,s.origin.x,s.origin.y]),[[0,10,30],[1,20,30]]);
    assert.ok(circles.some(([x,y])=>x===10&&y===30));
    assert.ok(circles.some(([x,y])=>x===20&&y===30));
    // 两次命中各有两道火花；末四次 moveTo 应跟随各自枪口的入射方向。
    const sparks=moves.slice(-4);
    for(let barrel=0;barrel<2;barrel++){
        const direction=Math.atan2(30,50-(barrel===0?10:20));
        const angle=direction-.4;
        assert.ok(Math.abs(sparks[barrel*2][0]-(50+Math.cos(angle)*1.3))<1e-9);
        assert.ok(Math.abs(sparks[barrel*2][1]-(60+Math.sin(angle)*1.3))<1e-9);
    }
});

test('实际反馈绘制：击杀圈读取本帧尸影，金币起点在尸影退场后仍固定，范围圈不追敌', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const vm = require('node:vm');
    const ts = require('typescript');
    const { createRequire } = require('node:module');
    const load = createRequire(path.resolve(__dirname, '../.test-dist/presentation/CombatFeedbackView.js'));
    const module = { exports: {} };
    // 仅替换绘图设备；执行真实视图源码，检查绘制端点，不把纯工具测试冒充视图接入证明。
    const compiled = ts.transpileModule(fs.readFileSync(path.resolve(__dirname,
        '../assets/scripts/presentation/CombatFeedbackView.ts'), 'utf8'),
        { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
    vm.runInNewContext(compiled, { module, exports: module.exports, require: name => name === 'cc'
        ? { Color: class Color {} } : load(name) });
    const circles = [];
    const graphics = { circle: (x, y) => circles.push([x, y]), fill() {}, stroke() {}, moveTo() {}, lineTo() {} };
    const view = new module.exports.CombatFeedbackView(graphics,
        { gridPointCenter: point => ({ x: point.column * 10, y: point.row * 10 }) });
    const timed = { point: { column: 2, row: 3 }, durationSeconds: .7, remainingSeconds: .7 };
    const state = { grid: {}, reducedMotion: true, feedback: { tracers: [], impacts: [], coreHits: [],
        slowPulses: [{ ...timed, radiusCells: 1, affectedEnemyCount: 1 }],
        deaths: [{ ...timed, enemyId: 'enemy-a', archetypeId: 'clockwork-infantry', spawnOrder: 1 }],
        rewards: [{ ...timed, enemyId: 'enemy-a', amount: 4 }] } };
    const anchors = new CombatVisualAnchors();
    anchors.target('enemy-a', { x: 26, y: 39 });
    view.drawBehindUnits(state, 10, anchors);
    assert.deepEqual(circles[0], [20, 30]);
    assert.deepEqual(circles[2], [26, 39]);
    view.drawAboveUnits(state, 10, anchors);
    assert.equal(view.rewardAlignmentSamples[0].origin.x, 26);
    anchors.begin();
    view.drawAboveUnits(state, 10, anchors);
    assert.equal(view.rewardAlignmentSamples[0].origin.x, 26);
    state.feedback.rewards = [];
    view.drawAboveUnits(state, 10, anchors);
    state.feedback.rewards = [{ ...timed, enemyId: 'enemy-a', amount: 4 }];
    view.drawAboveUnits(state, 10, anchors);
    assert.equal(view.rewardAlignmentSamples[0].origin.x, 20);
});

test('奖励锁住首次身体点，尸影移动/消失不跳回逻辑格点，输入坐标不被修改', () => {
    const origins = new FeedbackVisualOrigins();
    const displayed = { x: 26, y: 39 };
    assert.deepEqual(origins.resolve('enemy-a', displayed), displayed);
    displayed.x = 100;
    assert.deepEqual(origins.resolve('enemy-a', { x: 0, y: 0 }), { x: 26, y: 39 });
    assert.deepEqual(origins.resolve('enemy-b', { x: 70, y: 80 }), { x: 70, y: 80 });
    origins.retain(new Set(['enemy-b']));
    assert.deepEqual(origins.resolve('enemy-a', { x: 1, y: 2 }), { x: 1, y: 2 });
    origins.retain(new Set());
    assert.deepEqual(origins.resolve('enemy-b', { x: 3, y: 4 }), { x: 3, y: 4 });
});

test('击杀金币和尸影共用事实敌人ID，奖励寿命不依赖尸影是否已退场', () => {
    const feedback = new CombatFeedbackRuntime();
    const enemy = { id: 'enemy-a', archetype: { id: 'clockwork-infantry', killReward: 4 },
        fromCell: { column: 3, row: 2 }, toCell: { column: 3, row: 3 }, progress: .5, spawnOrder: 1 };
    feedback.consume({ shots: [], killed: [enemy], leaked: [], spawningCompleted: false });
    assert.equal(feedback.snapshot.rewards[0].enemyId, feedback.snapshot.deaths[0].enemyId);
    assert.equal(feedback.snapshot.rewards[0].amount, 4);
    feedback.advance(.6);
    assert.equal(feedback.snapshot.rewards[0].enemyId, 'enemy-a');
    feedback.clear();
    assert.equal(feedback.snapshot.rewards.length, 0);
});
