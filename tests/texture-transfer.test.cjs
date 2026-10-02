const test = require('node:test'), assert = require('node:assert/strict');
const {textureTransferSummary,BrowserTextureTransferProbe} = require('../.test-dist/presentation/BrowserTextureTransferProbe.js');
const origin = 'http://127.0.0.1:4176';
const image = (extra={}) => ({name:origin+'/assets/a.webp',encodedBodySize:100,transferSize:400,responseEnd:10,...extra});
test('真实图片传输计入重复请求，JS与未完成请求不混入纹理预算',()=>{
    assert.deepEqual(textureTransferSummary([image(),image(),image({name:origin+'/app.js'}),image({responseEnd:0})],origin),
        {requests:2,bodyBytes:200,wireBytes:800,unknown:0,complete:true});
});
test('缓存可为零线缆流量，但未知跨域/零响应大小不以0冒充测量完成',()=>{
    assert.equal(textureTransferSummary([image({transferSize:0})],origin).complete,true);
    const result=textureTransferSummary([image({name:'https://other.example/a.png'}),image({encodedBodySize:0})],origin);
    assert.equal(result.unknown,2);assert.equal(result.complete,false);
    assert.equal(textureTransferSummary([],origin).complete,false);
});
test('首屏退出即时封存，500ms节流不阻断状态变化，结算新请求不污染首屏',()=>{
    const previousWindow=global.window,previousPerformance=global.performance;
    let now=0,reads=0,entries=[image()];
    global.window={location:{origin}};
    global.performance={now:()=>now,getEntriesByType:()=>{reads++;return entries;}};
    try {
        const probe=new BrowserTextureTransferProbe();
        assert.equal(probe.read(true).textureRequestsFirstScreen.bodyBytes,100);
        now=100;probe.read(true);assert.equal(reads,1);
        entries=[image(),image()];
        const sealed=probe.read(false);assert.equal(reads,2);
        assert.equal(sealed.textureRequestsFirstScreenFrozen,true);
        assert.equal(sealed.textureRequestsFirstScreen.bodyBytes,200);
        now=700;entries.push(image());
        const later=probe.read(false);
        assert.equal(later.textureRequestsFirstScreen.bodyBytes,200);
        assert.equal(later.textureRequestsCurrent.bodyBytes,300);
    } finally {global.window=previousWindow;global.performance=previousPerformance;}
});
