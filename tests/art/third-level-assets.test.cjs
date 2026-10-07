const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
test('第三关兵塔十张透明128图、三阶外观和两张独立背景具备来源与预算',()=>{
 const m=JSON.parse(fs.readFileSync(path.join(root,'docs/art/third-level-runtime-manifest.json')));
 const provenance=JSON.parse(fs.readFileSync(path.join(root,'docs/art/third-level-provenance.json')));
 assert.equal(m.assets.length,12);assert.equal(provenance.sources.length,4);assert.ok(provenance.sources.every(s=>s.prompt?.length>100));
 assert.equal(m.human_runtime_approved,false);let bytes=0;const ids=new Set();
 for(const a of m.assets){
  const file=path.join(root,a.path),meta=JSON.parse(fs.readFileSync(file+'.meta'));
  assert.equal(fs.statSync(file).size,a.bytes);bytes+=a.bytes;assert.ok(!ids.has(meta.uuid));ids.add(meta.uuid);
  assert.equal(meta.subMetas.f9941.userData.trimType,'none');assert.equal(meta.subMetas['6c48a'].userData.mipfilter,'none');
  if(file.endsWith('.png')){
   const p=fs.readFileSync(file);assert.equal(p.readUInt32BE(16),128);assert.equal(p.readUInt32BE(20),128);assert.equal(p[25],6);
   assert.equal(a.alphaExtrema[0],0);assert.ok(a.alphaExtrema[1]>=240);assert.equal(a.alphaBounds[3],120);
  }else{assert.equal(a.width,720);assert.equal(a.height,1280);}
 }
 assert.equal(bytes,m.transferBytes);assert.equal(m.unitDecodedBytes,655360);assert.equal(m.singleBackdropDecodedBytes,3686400);
 for(const id of ['piercing-cannon','arc-tower'])for(const level of [1,2,3])assert.ok(m.assets.some(a=>a.path.endsWith(`${id}-level-${level}.png`)));
});
