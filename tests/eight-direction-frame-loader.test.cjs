const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const load=require('node:module').createRequire(path.resolve(__dirname,'../.test-dist/presentation/EightDirectionTowerFrames.js'));
function fixture(){
    const pending=[],module={exports:{}};
    const compiled=ts.transpileModule(fs.readFileSync(path.resolve(__dirname,'../assets/scripts/presentation/EightDirectionTowerFrames.ts'),'utf8'),
        {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
    vm.runInNewContext(compiled,{module,exports:module.exports,require:name=>name==='cc'
        ?{isValid:()=>true,SpriteFrame:class{},resources:{load:(url,type,callback)=>pending.push({url,callback})}}:load(name)});
    return {loader:new module.exports.EightDirectionTowerFrames({}),pending};
}
test('三级炮头按已布置等级请求，不重复加载，整组就绪才发布且相互隔离',()=>{
    const {loader,pending}=fixture();
    assert.equal(loader.status,'idle');loader.request(2);loader.request(2);
    assert.equal(pending.length,8);assert.ok(pending.every(p=>p.url.includes('level-2-v1')));
    let refs=0;
    const frames=pending.map(()=>({addRef:()=>refs++,decRef:()=>refs--}));
    pending.slice(0,7).forEach((p,i)=>p.callback(null,frames[i]));
    assert.equal(loader.frame('north',2),null);
    pending[7].callback(null,frames[7]);
    assert.equal(loader.frame('north',2),frames[0]);assert.equal(loader.frame('north',1),null);
    loader.request(3);assert.equal(pending.length,16);
    assert.equal(loader.frame('north',2),frames[0]);assert.equal(loader.frame('north',3),null);
    assert.throws(()=>loader.request(4));loader.dispose();loader.dispose();assert.equal(refs,0);
    pending[8].callback(null,frames[0]);assert.equal(refs,0);assert.equal(loader.status,'disposed');
});
test('单级缺帧不发布半套方向，也不阻断已经完整的其他等级',()=>{
    const {loader,pending}=fixture();loader.request(1);loader.request(2);
    const frame={addRef(){},decRef(){}};
    pending.slice(0,8).forEach(p=>p.callback(null,frame));pending[8].callback(new Error('missing'));
    assert.equal(loader.status,'unavailable');assert.equal(loader.frame('north',1),frame);
    assert.equal(loader.frame('north',2),null);loader.dispose();
});

test('升级帧加载未齐时恢复旧炮身图、轴点与尺寸，不残留八向帧配准',()=>{
    const module={exports:{}};
    class Sprite{} class UITransform{}
    const compiled=ts.transpileModule(fs.readFileSync(path.resolve(__dirname,'../assets/scripts/presentation/LayeredTowerRig.ts'),'utf8'),
        {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
    vm.runInNewContext(compiled,{module,exports:module.exports,require:name=>name==='cc'?{Sprite,UITransform}:load(name)});
    const sprite={spriteFrame:'eight-frame',trim:true}, sizes=[],anchors=[];
    const transform={contentSize:{width:128,height:128},setContentSize:(w,h)=>sizes.push([w,h]),setAnchorPoint:(x,y)=>anchors.push([x,y])};
    const root={getChildByName:()=>({getComponent:type=>type===Sprite?sprite:transform})};
    const spec=module.exports.RIVET_GUN_LAYER_SPEC;
    module.exports.LayeredTowerRig.restoreActiveFrame(root,'legacy',60,spec);
    assert.equal(sprite.spriteFrame,'legacy');assert.equal(sprite.trim,false);
    assert.deepEqual(anchors,[[spec.activePivotX,spec.activePivotY]]);
    assert.deepEqual(sizes,[[60*spec.canvasScale*spec.activeScaleX,60*spec.canvasScale*spec.activeScaleY]]);
});

test('过时等级租约释放，快速重建时旧加载不得回填；仍布置的等级保留且复用',()=>{
    const {loader,pending}=fixture();let refs=0;
    const frame={addRef:()=>refs++,decRef:()=>refs--};
    loader.request(1);loader.request(3);
    pending.slice(0,8).forEach(p=>p.callback(null,frame));assert.equal(refs,8);
    loader.retainLevels(new Set([3]));assert.equal(refs,0);assert.equal(loader.frame('north',1),null);
    loader.request(1);assert.equal(pending.length,24);
    // 第三级还在加载时退出，迟到八帧全部成对归还，不污染新一级组。
    loader.retainLevels(new Set([1]));pending.slice(8,16).forEach(p=>p.callback(null,frame));
    assert.equal(refs,0);assert.equal(loader.frame('north',3),null);
    pending.slice(16,24).forEach(p=>p.callback(null,frame));assert.equal(refs,8);
    loader.request(1);assert.equal(pending.length,24);assert.equal(loader.frame('north',1),frame);
    loader.retainLevels(new Set());assert.equal(refs,0);assert.equal(loader.status,'idle');loader.dispose();
});
