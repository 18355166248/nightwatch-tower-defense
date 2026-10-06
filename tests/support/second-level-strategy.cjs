// 固定高级路线用于证明加强后的第二关仍有解；不自动替玩家布塔，不代表玩家胜率。
const opening=[
 {cell:{column:2,row:2},towerId:'rivet-gun'},
 {cell:{column:1,row:2},towerId:'rivet-gun'},
 {cell:{column:3,row:2},towerId:'rivet-gun'},
 {cell:{column:2,row:5},towerId:'frost-coil'},
];
const reinforcements=[[1,0,2],[1,4,2],[2,3,5],[3,4,5],[3,5,5],[4,1,5],[5,2,8],[5,3,8],[6,4,8],[6,1,8],[6,0,8]]
 .map(([afterWave,column,row])=>({afterWave,cell:{column,row},towerId:'rivet-gun'}));
const upgradesAfterWave=[
 {wave:3,cell:{column:2,row:5},targetLevel:2},
 {wave:4,cell:{column:2,row:2},targetLevel:2},
 {wave:5,cell:{column:2,row:5},targetLevel:3},
];
module.exports={opening,reinforcements,upgradesAfterWave};
