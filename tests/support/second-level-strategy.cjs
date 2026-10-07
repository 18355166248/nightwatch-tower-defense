// 固定高级路线用于证明加强后的第二关仍有解；不自动替玩家布塔，不代表玩家胜率。
const opening=[
 {cell:{column: 4,row:2},towerId:'rivet-gun'},
 {cell:{column: 3,row:2},towerId:'rivet-gun'},
 {cell:{column: 5,row:2},towerId:'rivet-gun'},
 {cell:{column: 4,row:5},towerId:'frost-coil'},
];
// 九列增加左侧绕行空间，末段补塔覆盖新的左路，避免沿用六列边界封路的假设。
const reinforcements=[[1,2,2],[1,6,2],[2,5,5],[3,6,5],[3,7,5],[4,3,5],[5,4,8],[5,5,8],[6,1,5],[6,0,8],[6,1,8]]
 .map(([afterWave,column,row])=>({afterWave,cell:{column,row},towerId:'rivet-gun'}));
const upgradesAfterWave=[
 {wave:2,cell:{column: 4,row:5},targetLevel:2},
 {wave:3,cell:{column: 4,row:2},targetLevel:2},
 {wave:4,cell:{column: 4,row:5},targetLevel:3},
];
module.exports={opening,reinforcements,upgradesAfterWave};
