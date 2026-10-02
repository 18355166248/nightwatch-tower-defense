const states = [
  {id:'select',name:'首个动作',title:'拿起机枪塔',step:'布防 1 / 4',body:'点下方机枪塔，再点上路高亮格',help:'建议布防，不限制自由落点',gold:140,wave:0,lineup:'步兵 × 9',tactic:'机枪守线 · 留意改路',start:'先布防'},
  {id:'place',name:'已拿起',title:'让敌人绕进火力区',step:'布防 1 / 4',body:'点上路高亮格，查看路线变化',help:'进入建造预览后，这张卡让位',gold:140,wave:0,lineup:'步兵 × 9',tactic:'机枪守线 · 留意改路',start:'先布防'},
  {id:'ready',name:'首波就绪',title:'防线准备好了',step:'布防 4 / 4',body:'点右下“开始第一波”迎敌',help:'仍可自由调整；战前撤销全额返还',gold:10,wave:0,lineup:'步兵 × 9',tactic:'机枪守线 · 留意改路',start:'开始\n第一波',enabled:true},
  {id:'upgrade',name:'波间升级建议',title:'强化中段机枪',step:'等待你继续',body:'点中段机枪，查看下一阶提升',help:'建议升到Lv.2；不强制升级才能开波',gold:45,wave:1,lineup:'步兵 × 9',tactic:'机枪守线 · 留意改路',start:'开始\n下一波',enabled:true},
  {id:'reinforce',name:'波间补塔建议',title:'补齐下一段防线',step:'等待你继续',body:'选择机枪塔，补到推荐高亮格',help:'推荐塔位来自现有布防配置',gold:55,wave:2,lineup:'步兵 × 11 · 疾行 × 2',tactic:'疾行更快 · 冷凝压速',start:'开始\n下一波',enabled:true},
  {id:'poor',name:'不足但可继续',title:'金币不足补塔',step:'等待你继续',body:'点右下“开始下一波”继续防守',help:'不锁死教学；无需购买或等待额外奖励',gold:12,wave:2,lineup:'步兵 × 11 · 疾行 × 2',tactic:'疾行更快 · 冷凝压速',start:'开始\n下一波',enabled:true},
  {id:'countdown',name:'自由波间倒计时',title:'下一波即将到来',step:'8秒后自动开波',body:'可补塔、升级，或点右下提前开波',help:'自由模式继续原倒计时，不等待确认',gold:55,wave:2,lineup:'步兵 × 11 · 疾行 × 2',tactic:'疾行更快 · 冷凝压速',start:'提前开波\n8 秒',enabled:true,free:true},
  {id:'combat',name:'战斗时收起',title:'战斗进行中',step:'',body:'',help:'',gold:40,wave:3,lineup:'第3波 · 步兵先行',tactic:'战斗中不常驻教学卡',start:'等待中',combat:true},
];
const query = id => document.getElementById(id);
let active = states[0], inspection = false, skipped = false;
// 此页只演示提示状态，不持有战斗模型；接入时必须消费真实教学快照与编队。
function render(state) {
  active=state;inspection=false;skipped=false;
  query('state-title').textContent=state.name;
  ['gold','wave','lineup','tactic'].forEach(id=>query(id).textContent=id==='wave'?`${state.wave} / 8`:state[id]);
  query('notice-kicker').textContent=state.combat?'当前战况':state.wave===0?'首波敌情':`下一波 · 第${state.wave+1}波`;
  query('coach-title').textContent=state.title;query('step').textContent=state.step;
  query('coach-body').textContent=state.body;query('coach-help').textContent=state.help;
  query('start').textContent=state.start;query('start').disabled=!state.enabled;
  query('skip').hidden=Boolean(state.free||state.combat);
  document.querySelector('.coach-card').hidden=Boolean(state.combat);
  document.querySelector('.inspection-note').hidden=true;
  query('suggested-tower').hidden=Boolean(state.combat||state.id==='countdown'||state.id==='poor');
  query('suggested-tower').src=query('rivet').querySelector('img').src;
  query('place').disabled=Boolean(state.combat||state.id==='countdown'||state.id==='poor');
  document.querySelectorAll('[data-state]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.state===state.id)));
  query('feedback').textContent='示例状态，不影响游戏金币与存档';
}
states.forEach(state=>{const button=document.createElement('button');button.textContent=state.name;button.dataset.state=state.id;button.onclick=()=>render(state);query('states').appendChild(button);});
document.querySelectorAll('[data-size]').forEach(button=>button.onclick=()=>{
  const width=Number(button.dataset.size);document.querySelector('.stage').style.transform=`scale(${width/390})`;
  const viewport=document.querySelector('.viewport');viewport.style.width=`${width}px`;viewport.style.height=`${693.333*width/390}px`;
  document.querySelectorAll('[data-size]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
});
query('rivet').onclick=()=>{if(!active.combat&&!skipped)render(states[1]);};
query('frost').onclick=()=>{query('feedback').textContent='示例：自由选塔不被引导锁定；实装将进入真实建造预览。';};
query('place').onclick=()=>{if(!skipped){render(active.id==='select'||active.id==='place'?states[2]:states[5]);query('feedback').textContent='仅模拟成功后切换提示，不修改游戏经济。';}};
query('inspect').onclick=()=>{inspection=true;document.querySelector('.coach-card').hidden=true;document.querySelector('.inspection-note').hidden=false;query('feedback').textContent='教学卡已让位；不会留下原卡空槽。';};
query('close-inspection').onclick=()=>{inspection=false;document.querySelector('.inspection-note').hidden=true;document.querySelector('.coach-card').hidden=Boolean(active.combat||skipped);};
query('skip').onclick=()=>{skipped=true;document.querySelector('.coach-card').hidden=true;query('skip').hidden=true;query('feedback').textContent='引导已收起；实装沿用自由模式，不会重新常驻。';};
query('start').onclick=()=>{if(active.enabled){render(states[7]);query('feedback').textContent='示例已开波，教学卡收起；非实际战斗测试。';}};
render(states[0]);
