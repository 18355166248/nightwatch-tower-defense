/** 只调整 Sprite 的显示画布，逻辑格、索敌、射程与触控命中仍由战斗系统和 PhaseBLayout 决定。 */
export function towerDisplaySize(cellSize: number): number {
    return Math.min(88, cellSize * 0.98);
}

export function enemyDisplaySize(cellSize: number, heavy: boolean, fitToCell = false): number {
    // 小怪原图留有透明画布，略放大主体；重装原本已接近满格，只微调避免密集群相互遮住。
    // 极窄屏显式按格收敛，不能硬撑92画布；常规屏与既有QA网格保持原尺寸策略。
    return heavy ? fitToCell ? Math.min(98, cellSize * 1.12) : Math.max(92, Math.min(98, cellSize * 1.12))
        : Math.min(90, cellSize * 1.06);
}

/** 按有色主体配准，透明画布和不同等级留白不能改变塔的视觉尺寸或脚点。 */
export function flatTowerArtLayout(cellSize:number,towerId:string,level=1) {
    if(towerId!=='piercing-cannon'&&towerId!=='arc-tower')return null;
    const rank=Math.max(1,Math.min(3,level));
    const bounds=towerId==='piercing-cannon'
        ? rank===1?[1254,101,83,1153,1180]:rank===2?[1254,92,81,1162,1182]:[1254,93,72,1161,1183]
        : rank===1?[1254,153,84,1100,1192]:rank===2?[1254,152,69,1102,1195]:[1254,150,72,1103,1194];
    const [canvas,left,top,right,bottom]=bounds;
    const visibleWidth=cellSize*.95,visibleHeight=cellSize*1.3;
    const width=visibleWidth*canvas/(right-left),height=visibleHeight*canvas/(bottom-top);
    const x=-(left+right-canvas)/2*width/canvas;
    // 新塔底座和旧分层塔落在同一地面线；否则放大后底座会下沉进下一行。
    const ground=-towerDisplaySize(cellSize)*.56;
    const y=ground+(bottom-canvas/2)*height/canvas;
    return {width,height,x,y,visibleWidth,visibleHeight,ground};
}
