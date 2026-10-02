const test=require('node:test'),assert=require('node:assert/strict');
const {VisibleResourceSlots}=require('../.test-dist/presentation/VisibleResourceSlots.js');
test('可见文字槽复用，消失槽释放，重新显示才新建',()=>{
    const released=[],slots=new VisibleResourceSlots(v=>released.push(v));let count=0;
    const create=()=>++count;
    slots.begin();const a=slots.acquire('a',create);slots.acquire('b',create);slots.end();
    slots.begin();assert.equal(slots.acquire('a',create),a);slots.end();assert.deepEqual(released,[2]);
    slots.clear();slots.clear();assert.deepEqual(released,[2,1]);
    slots.begin();assert.equal(slots.acquire('a',create),3);slots.end();
});
test('释放前断开所有权，重入不能复用正在销毁的旧槽',()=>{
    let slots,newValue;
    slots=new VisibleResourceSlots(()=>{newValue=slots.acquire('a',()=>({new:true}));});
    slots.begin();const old=slots.acquire('a',()=>({new:false}));slots.end();slots.clear();
    assert.notEqual(newValue,old);assert.equal(newValue.new,true);
});
