const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const load = require('node:module').createRequire(path.resolve(__dirname, '../.test-dist/presentation/FirstLevelResultView.js'));
function fixture() {
    class UITransform { setContentSize(w,h) { this.size=[w,h]; } }
    class Label { static Overflow={SHRINK:1}; }
    class Node {
        constructor(name) { this.name=name; this.components=new Map(); this.destroyed=0; this.removed=0; }
        addComponent(Type) { const c=new Type();c.node=this;this.components.set(Type,c);return c; }
        getComponent(Type) { return this.components.get(Type); }
        addChild(child) { child.parent=this; }
        setPosition(x,y) { this.position=[x,y]; }
        removeFromParent() { this.removed++;this.parent=null; }
        destroy() { this.destroyed++; }
    }
    const module={exports:{}};
    const slotsModule={exports:{}};
    const slotsSource=ts.transpileModule(fs.readFileSync(path.resolve(__dirname,
        '../assets/scripts/presentation/VisibleLabelSlots.ts'),'utf8'),
        {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
    vm.runInNewContext(slotsSource,{module:slotsModule,exports:slotsModule.exports,require:load});
    const source=ts.transpileModule(fs.readFileSync(path.resolve(__dirname,
        '../assets/scripts/presentation/FirstLevelResultView.ts'),'utf8'),
        {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
    vm.runInNewContext(source,{module,exports:module.exports,require:name=>name==='cc'
        ?{Node,UITransform,Label,Color:class{},HorizontalTextAlignment:{CENTER:0},VerticalTextAlignment:{CENTER:0},isValid:()=>true}
        :name==='./FirstLevelPageSkinView'?{FirstLevelPageSkinView:class{}}
        :name==='./VisibleLabelSlots'?slotsModule.exports:load(name)});
    // 只隔离图像和几何；执行真实render/text及VisibleLabelSlots生命周期，而非复制释放逻辑。
    const view=Object.create(module.exports.FirstLevelResultView.prototype);
    Object.assign(view,{root:new Node('result'),textRoot:new Node('text'),opacity:{},assets:new Map(),
        labels:new slotsModule.exports.VisibleLabelSlots(),layout:{safeHalfWidth:540},signature:'',snapshot:null});
    view.draw=result=>{view.labels.begin();view.text('title',result.title,54,0,400,500,85,'#fff',true);view.labels.end();};
    return view;
}
for(const kind of ['victory','defeat']) test(`${kind}结算隐藏销毁文字，重复隐藏幂等，返回按原字号重建`,()=>{
    const view=fixture(),result={kind,title:kind};view.render(result,1);
    const first=Array.from(view.labels.entries())[0][1];
    assert.equal(first.fontSize,54);assert.equal(first.node.destroyed,0);
    view.render(result,1);assert.equal(Array.from(view.labels.entries())[0][1],first);
    view.render(null,0);view.render(null,0);view.invalidate();
    assert.equal(Array.from(view.labels.entries()).length,0);
    assert.equal(first.node.removed,1);assert.equal(first.node.destroyed,1);
    view.render(result,1);const second=Array.from(view.labels.entries())[0][1];
    assert.notEqual(second,first);assert.equal(second.fontSize,54);
    assert.equal(second.node.getComponent(first.node.components.keys().next().value).size[0],500);
});
