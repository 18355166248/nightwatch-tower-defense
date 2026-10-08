const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {flatTowerArtLayout,towerDisplaySize}=require('../.test-dist/presentation/UnitDisplaySize');
const manifest=require('../docs/art/tower-redesign-v2.json');
test('新塔三级按可见主体对齐，宽度不超过格子，底座与旧塔地面线一致',()=>{
 for(const cell of [58,76,88,112])for(const id of ['piercing-cannon','arc-tower'])for(const level of [1,2,3]){
  const g=flatTowerArtLayout(cell,id,level);
  assert.ok(Math.abs(g.visibleWidth-cell*.95)<.001);assert.ok(Math.abs(g.visibleHeight-cell*1.3)<.001);
  assert.equal(g.ground,-towerDisplaySize(cell)*.56);assert.ok(g.visibleWidth<cell);
 }
 assert.equal(flatTowerArtLayout(76,'rivet-gun'),null);assert.equal(flatTowerArtLayout(76,'frost-coil'),null);
});
test('重设计原图尺寸、导入设置和有色边界与实际部署配准一致',()=>{
 for(const a of manifest.assets){
  const p=path.resolve(__dirname,'..',a.path),png=fs.readFileSync(p),meta=JSON.parse(fs.readFileSync(p+'.meta'));
  assert.equal(png.readUInt32BE(16),a.width);assert.equal(png.readUInt32BE(20),a.height);assert.equal(png.length,a.bytes);
  const data=meta.subMetas.f9941.userData;assert.equal(data.rawWidth,a.width);assert.equal(data.rawHeight,a.height);assert.equal(data.trimType,'none');
  const g=flatTowerArtLayout(76,a.towerId,a.level),[l,t,r,b]=a.alphaBounds;
  assert.ok(Math.abs(g.width*(r-l)/a.width-76*.95)<.001);
  assert.ok(Math.abs(g.height*(b-t)/a.height-76*1.3)<.001);
  assert.ok(Math.abs(g.y-(b-a.height/2)*g.height/a.height-g.ground)<.001);
 }
 assert.equal(manifest.human_runtime_approved,false);
});
test('建造、图鉴与升级三级都使用完整新版家族，不能混入旧二三级',()=>{
 const {towerPortraitPath}=require('../.test-dist/config/TowerCatalog');
 assert.equal(manifest.assets.length,6);
 for(const id of ['piercing-cannon','arc-tower'])for(const level of [1,2,3]){
  const a=manifest.assets.find(a=>a.towerId===id&&a.level===level);
  assert.ok(a);
  assert.equal(towerPortraitPath(id,level),`level-three/units/${id}-level-${level}-v2/spriteFrame`);
 }
});
