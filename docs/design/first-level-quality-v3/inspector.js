// 仅用于独立设计稿；不调用游戏实例或保存示例状态。数值对应 PhaseBCombatConfig。
const towers={
  rivet:{name:'机枪塔',role:'稳定单体输出',image:'https://audiopaytest.cos.tx.xmcdn.com/storages/7249-audiotest/3E/F0/GAqSoUUOlMn1AAQ9QAACF0J9.png',cost:30,levels:[{power:7,range:2.6,tempo:.35,cost:24},{power:11,range:2.8,tempo:.31,cost:42},{power:18,range:3.2,tempo:.27,cost:null}]},
  frost:{name:'冷凝塔',role:'范围减速 · 优先控制疾行机',image:'https://audiopaytest.cos.tx.xmcdn.com/storages/9e00-audiotest/99/88/GAqSiIMOlMoAAAOunwACF0KF.png',cost:40,levels:[{power:75,range:3,tempo:1.2,cost:32},{power:82,range:3.2,tempo:1.5,cost:48},{power:89,range:3.5,tempo:1.8,cost:null}]}
};
const states=[
  {id:'ready',title:'一级机枪 · 可升级',tower:'rivet',level:1,gold:80},
  {id:'short',title:'二级机枪 · 金币不足',tower:'rivet',level:2,gold:20},
  {id:'max',title:'三级机枪 · 已满级',tower:'rivet',level:3,gold:14},
  {id:'battle',title:'战斗中 · 禁止出售',tower:'rivet',level:1,gold:36,battle:true},
  {id:'frost',title:'冷凝塔 · 控制属性',tower:'frost',level:1,gold:60},
  {id:'valid',title:'建造预览 · 可放置',tower:'rivet',level:1,gold:80,placement:true},
  {id:'invalid',title:'建造预览 · 堵住道路',tower:'rivet',level:1,gold:80,placement:true,invalid:true},
  {id:'click',title:'点选建造 · 确认按钮',tower:'rivet',level:1,gold:80,placement:true,clickConfirm:true}
];
const byId=id=>document.getElementById(id);
let current;
const text=(id,value)=>{byId(id).textContent=value;};
function render(){
  const tower=towers[current.tower],level=tower.levels[current.level-1],next=tower.levels[current.level];
  const unit=current.tower==='frost'?'%':'';
  let refund=tower.cost;for(let i=0;i<current.level-1;i++)refund+=tower.levels[i].cost;
  text('state-title',current.title);text('gold',current.gold);text('tower-name',tower.name);
  const badge=document.createElement('small');badge.textContent=current.placement?'建造预览':`Lv.${current.level}`;byId('tower-name').append(badge);
  byId('portrait').src=tower.image;byId('portrait').alt=tower.name;
  text('role',tower.role);text('stat-caption',current.tower==='frost'?'范围减速':'单次伤害');
  text('power',level.power+unit);text('range',level.range+' 格');text('tempo-caption',current.tower==='frost'?'持续时间':'攻击间隔');text('tempo',level.tempo+' 秒');
  text('preview',current.placement?(current.invalid?'不可放置：道路必须保持连通':`可放置：${current.clickConfirm?'再次点落点':'松手'}建造 · 消耗 ${tower.cost} 金币`):next?`下一级：${current.tower==='frost'?'减速':'伤害'} ${level.power}${unit} → ${next.power}${unit} · 射程 ${level.range} → ${next.range}`:'已达到最高等级 · 无需继续投入');
  text('sell',current.placement?'取消建造':current.battle?'战斗中禁售':`撤销 · ${refund}`);
  byId('sell').disabled=Boolean(current.battle);
  text('upgrade',current.placement?(current.invalid?'不可放置':current.clickConfirm?`确认建造 · ${tower.cost}`:'松手建造'):next?(current.gold>=level.cost?`升级 · ${level.cost}`:`还差 ${level.cost-current.gold} 金币`):'已满级');
  byId('upgrade').disabled=current.placement?!current.clickConfirm||Boolean(current.invalid):!next||current.gold<level.cost;
  text('help',current.placement?(current.clickConfirm?'点落点或确认建造 · 取消不扣金币':'拖动至空地 · 松手前不扣金币'):current.battle?'战斗中可升级，波间才可出售':'战前撤销返还全部投入');
  document.querySelector('.tower-sheet').hidden=false;
  document.querySelector('.tower-sheet').dataset.invalid=String(Boolean(current.invalid));
}
for(const state of states){const button=document.createElement('button');button.textContent=state.title;button.dataset.state=state.id;button.addEventListener('click',()=>select(state));byId('states').append(button);}
function select(state){current={...state};document.querySelectorAll('[data-state]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.state===state.id)));text('demo-feedback','设计稿操作不影响游戏存档');render();}
// 成功操作后释放战场视野；失败/禁用不能被当作确认成功而关闭面板。
byId('upgrade').addEventListener('click',()=>{if(current.placement){current.gold-=towers[current.tower].cost;render();document.querySelector('.tower-sheet').hidden=true;text('demo-feedback','示例建造完成；面板收起，恢复战场视野');return;}current.gold-=towers[current.tower].levels[current.level-1].cost;current.level++;render();document.querySelector('.tower-sheet').hidden=true;text('demo-feedback',`${towers[current.tower].name}已升至 Lv.${current.level}；面板收起，恢复战场视野（设计示例）`);});
byId('sell').addEventListener('click',()=>{document.querySelector('.tower-sheet').hidden=true;text('demo-feedback',current.placement?'已取消示例建造':'示例面板收起；未操作真实游戏');});
document.querySelector('.close-control').addEventListener('click',()=>{document.querySelector('.tower-sheet').hidden=true;text('demo-feedback','面板已收起；切换状态可重新查看');});
// 整个设计坐标系同比缩放，包括文字与九宫格边缘，不单独放大字体。
// 对照模式适配Cocos实际16:9竖幅，保留205高面板、字体和12间距；只按原塔栏顶部锚定。
const gameFrame=new URLSearchParams(location.search).get('frame')==='game';
const frameHeight=gameFrame?1920*390/1080:844;
function resize(width){document.querySelectorAll('.viewport').forEach(viewport=>{const actual=Math.min(width,viewport.parentElement.clientWidth);viewport.style.width=actual+'px';viewport.style.height=frameHeight*actual/390+'px';const stage=viewport.querySelector('.stage');stage.style.height=frameHeight+'px';stage.style.transform=`scale(${actual/390})`;if(gameFrame){stage.style.setProperty('--sheet-bottom',(196*390/1080+12)+'px');stage.style.setProperty('--tray-bottom',(24*390/1080)+'px');stage.style.setProperty('--tray-height',(172*390/1080)+'px');}});}
let previewWidth=390;
document.querySelectorAll('[data-size]').forEach(button=>button.addEventListener('click',()=>{previewWidth=Number(button.dataset.size);document.querySelectorAll('[data-size]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));resize(previewWidth);}));
window.addEventListener('resize',()=>resize(previewWidth));select(states[0]);resize(previewWidth);
