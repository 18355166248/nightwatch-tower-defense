const test = require('node:test');
const assert = require('node:assert/strict');
const {PhaseBLayout,PHASE_B_RESULT_RESTART_BUTTON,PHASE_B_RESULT_HOME_BUTTON}=require('../.test-dist/presentation/PhaseBLayout.js');
test('结算纵向按钮共用适配矩形，窄屏热区不小于44px，统计不遮挡操作',()=>{
    for(const [width,height] of [[320,844],[320,900],[390,844],[1080,1920]]) {
        const layout=new PhaseBLayout(); layout.setVisibleWidth(1920*width/height);
        const scale=Math.min(width/1080,height/1920);
        const panel=layout.resultPanelRect();
        const buttons=[PHASE_B_RESULT_RESTART_BUTTON,PHASE_B_RESULT_HOME_BUTTON].map(rect=>layout.fitRect(rect));
        for(const rect of buttons) {
            assert.ok((rect.top-rect.bottom)*scale>=44);
            assert.ok((rect.right-rect.left)*scale>=44);
            assert.ok(rect.left>=panel.left && rect.right<=panel.right);
            assert.ok(rect.bottom>=panel.bottom && rect.top<=panel.top);
            assert.ok(layout.insideRect({x:rect.left+1,y:(rect.bottom+rect.top)/2},rect));
        }
        assert.ok(buttons[1].top<buttons[0].bottom);
        for(const rect of [...layout.resultStatRects(),...layout.resultDetailRects()]) assert.ok(rect.bottom>buttons[0].top);
    }
});
