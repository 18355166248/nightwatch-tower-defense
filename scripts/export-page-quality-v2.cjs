// 独立页面设计源：不访问浏览器、不读取战斗快照，固定示例数据不进入运行时。
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'docs/design/first-level-quality-v2/pages');
const geometry = require('../.test-dist/presentation/PhaseBLayout');
const entry = require('../.test-dist/presentation/FirstLevelExperience');
const { firstLevelHomeLayout } = require('../.test-dist/presentation/FirstLevelEntryLayout');
const { firstLevelFontSize } = require('../.test-dist/presentation/FirstLevelUiStyle');
const layout = new geometry.PhaseBLayout();
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
const tones = {neutral:'#A78350',primary:'#6FAF9D',danger:'#C47768',disabled:'#596A70'};
const inset = (r,n) => ({left:r.left+n,right:r.right-n,bottom:r.bottom+n,top:r.top-n});
const box = (r,color,radius=12) => `<rect x="${540+r.left}" y="${960-r.top}" width="${r.right-r.left}" height="${r.top-r.bottom}" rx="${radius}" fill="${color}"/>`;
const line = (left,right,y,color) => `<path d="M${540+left} ${960-y}H${540+right}" stroke="${color}" stroke-width="2"/>`;
function panel(r,tone='neutral') {
    let svg = [[0,'#080F17',26],[4,'#6B5035',23],[9,'#B48B53',19],[14,'#352B24',15],[19,'#152732',12]].map(([n,c,rad])=>box(inset(r,n),c,rad)).join('');
    svg += line(r.left+45,r.right-45,r.top-42,tones[tone]);
    for(let y=r.bottom+45;y<r.top-35;y+=26) svg += line(r.left+30,r.right-30,y,'#1D303B');
    for(const x of [r.left+13,r.right-13]) for(const y of [r.bottom+35,r.top-35]) svg += `<circle cx="${540+x}" cy="${960-y}" r="5" fill="#C3A46A"/>`;
    return svg;
}
function text(x,y,value,size=40,color='#F4E9CD') {
    const lines = value.split('\n');
    const font = firstLevelFontSize(size), spacing=font*1.35;
    return lines.map((v,i)=>`<text x="${540+x}" y="${960-y+(i-(lines.length-1)/2)*spacing}" dominant-baseline="central" text-anchor="middle" font-size="${font}" fill="${color}">${esc(v)}</text>`).join('');
}
function button(r,value,tone='neutral',size=40) {
    return box(r,'#080F17',18)+box(inset(r,3),tones[tone],15)+box(inset(r,7),tone==='primary'?'#25483F':tone==='danger'?'#452B2D':'#1C303C',12)
        +line(r.left+17,r.right-17,r.top-11,'#938565')+text((r.left+r.right)/2,(r.bottom+r.top)/2,value,size);
}
const configs = [
    {id:'pause',name:'战斗暂停',screen:'menu',title:'战斗暂停',actions:['继续战斗','回到战前布防','战斗设置','返回首页'],footer:'敌人、倒计时、弹道与局内计时均已冻结'},
    {id:'lifecycle',name:'后台安全暂停',screen:'menu',title:'后台安全暂停',actions:['等待返回页面','回到战前布防','战斗设置','返回首页'],footer:'返回页面后由玩家主动继续'},
    {id:'settings',name:'战斗设置',screen:'settings',title:'战斗设置',actions:['声音 · 开','音量 · 75%','减弱动态 · 关','速度 · 1×','返回暂停'],footer:'偏好保存在本机；不会改变战斗数值'},
    {id:'home-settings',name:'首页设置',screen:'menu',title:'游戏设置',actions:['声音 · 开','音量 · 75%','减弱动态 · 关','','返回首页'],footer:'偏好保存在本机；不会改变战斗数值'},
    {id:'confirm-restart',name:'重新部署确认',screen:'confirm-restart',title:'回到战前布防？',actions:['确认重新部署','取消'],footer:'恢复开战前塔位；本局击杀与金币清零'},
    {id:'confirm-home',name:'返回首页确认',screen:'confirm-home',title:'返回首页？',actions:['确认返回首页','取消'],footer:'本局进度将清空；最快纪录保留'},
    {id:'route-error',name:'路线异常恢复',screen:'route-error',title:'路线异常 · 已暂停',actions:['重新部署','返回首页'],footer:'本局未判胜负，也没有删除敌人'},
];
const frames=[];
function add(id,name,body,states) {
    // SVG使用相对本地资源，PNG导出时嵌入同一原图，便于离线交叉review。
    const background=fs.readFileSync(path.join(root,'assets/resources/level-one/backdrop-plaza-v2.jpg')).toString('base64');
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920"><style>text{font-family:'PingFang SC','Microsoft YaHei',sans-serif}</style><image href="data:image/jpeg;base64,${background}" width="1080" height="1920"/><rect width="1080" height="1920" fill="#07101B" opacity=".91"/>${body}</svg>`;
    frames.push({id,name,svg,states});
}
for(const c of configs) {
    const compact=!['menu','settings'].includes(c.screen), settings=c.screen==='settings';
    const rect=layout.pausePanelRect(c.screen);
    let body=panel(rect,c.id==='route-error'||c.id==='confirm-home'?'danger':'neutral');
    body+=text(0,compact?235:settings?550:460,c.title,64,'#F4D58D');
    body+=text(0,compact?165:settings?480:390,c.id==='home-settings'?'第一关 · 画面与声音':c.id==='route-error'?'诊断已保存，请重新部署':'第 3/8 波 · 核心 9/10',32,'#D7E6F5');
    body+=text(0,compact?-285:settings?-525:-435,c.footer,28,'#A9C4DB');
    const buttons=c.id==='home-settings'?geometry.phaseBSettingsButtons(true):geometry.phaseBPauseButtons(c.screen);
    c.actions.forEach((s,i)=> {if(s) body+=button(buttons[i],s,c.id==='lifecycle'&&i===0?'disabled':i===0&&c.id==='confirm-home'||c.screen==='menu'&&i===3?'danger':i===0&&['pause','confirm-restart'].includes(c.id)?'primary':'neutral');});
    add(c.id,c.name,body,c.id==='settings'?['声音开/关','音量25/50/75/100%','减弱动态开/关','速度1/2×']:[]);
}
const home=firstLevelHomeLayout(layout);
let homeBody=panel(home.card)+text(0,355,'夜城防线',66,'#F4D58D');
homeBody+=button(home.settings,'设置','neutral',31);
for(const [i,name] of ['机枪','冷凝','来袭'].entries()) {
    const x=(i-1)*235;
    homeBody+=box({left:x-94,right:x+94,bottom:54,top:280},'#152732',24);
    const accent=['#D8AD68','#7EDCE7','#E4A087'][i];
    homeBody+=`<rect x="${540+x-94}" y="680" width="188" height="226" rx="24" fill="none" stroke="${accent}" stroke-width="3"/><circle cx="${540+x}" cy="775" r="67" fill="${accent}"/><circle cx="${540+x}" cy="775" r="61" fill="#10202B"/>`;
    const file=['rivet-gun','frost-coil','clockwork-infantry'][i];
    const encoded=fs.readFileSync(path.join(root,`assets/resources/level-one/units/${file}.png`)).toString('base64');
    homeBody+=`<image href="data:image/png;base64,${encoded}" x="${540+x-80}" y="695" width="160" height="160"/>`+text(x,85,name,32);
}
homeBody+=text(0,-75,'第一关 · 守住夜城入口\n摆塔改路，让敌人走进火力区\n机枪输出 · 冷凝减速 · 坚守八波',34,'#D9E9F4');
homeBody+=text(0,-170,'最快 04:32 · 最佳核心 10/10',33,'#F4D58D');
homeBody+=button(home.start,'开始布防','primary',44)+button(entry.FIRST_LEVEL_SKIP_INTRO_BUTTON,'直接开始 · 跳过引导','neutral',30);
add('home','首页 / 首关简报',homeBody,['无历史纪录','已有最快/核心纪录']);
for(const success of [true,false]) {
    let body=panel(layout.resultPanelRect(),success?'primary':'danger');
    body+=text(0,393,success?'✓':'×',72,success?'#7DBCA6':'#C47768');
    body+=text(0,300,success?'防线守住了':'核心失守',64,success?'#7DBCA6':'#C47768')+text(0,214,success?'第一关 · 八波完成':'第一关 · 第 6 波',32,'#D7E6F5');
    layout.resultStatRects().forEach((r,i)=> {body+=box(r,'#0D1C25',10)+text((r.left+r.right)/2,(r.top+r.bottom)/2+17,['132 / 132','0','10 / 10','54'][i],48,'#F4D58D')+text((r.left+r.right)/2,(r.top+r.bottom)/2-29,['击毁','漏怪','核心','金币'][i],26,'#A9C4DB');});
    layout.resultDetailRects().forEach((r,i)=> {body+=box(r,'#0D1C25',10)+text((r.left+r.right)/2,(r.top+r.bottom)/2+17,['04:32','12','8'][i],41,'#F4D58D')+text((r.left+r.right)/2,(r.top+r.bottom)/2-29,['用时','建塔','升级'][i],25,'#A9C4DB');});
    body+=button(geometry.PHASE_B_RESULT_RESTART_BUTTON,'重新部署','primary',37)+button(geometry.PHASE_B_RESULT_HOME_BUTTON,'返回首页','neutral',37);
    body+=text(0,-477,success?'新纪录 · 下次挑战更稳的防线':'调整火力与路线，再试一次',29,'#A9C4DB');
    add(success?'victory':'defeat',success?'胜利结算':'失败结算',body,['新纪录','未刷新纪录','重新部署','返回首页']);
}
add('orientation','横屏阻断',panel(layout.orientationPanelRect())+text(0,205,'请转回竖屏',96,'#F4D58D')+text(0,95,'第 3/8 波 · 核心 9/10',52,'#D7E6F5')+button({left:-340,right:340,bottom:-90,top:70},'横屏期间战斗已暂停','disabled')+text(0,-255,'恢复竖屏后，点继续战斗',48,'#A9C4DB'),['横屏阻断','竖屏恢复后仍暂停']);
const bitmap=(file,x,y,width,height)=>`<image href="data:image/png;base64,${fs.readFileSync(path.join(root,file)).toString('base64')}" x="${x}" y="${y}" width="${width}" height="${height}"/>`;
let waveBody=bitmap('docs/design/first-level-quality-v2/hud-frame.png',24,24,1032,152)
    +bitmap('docs/design/first-level-quality-v2/tray-frame.png',24,1724,1032,172);
for(const [x,caption,value] of [[-384,'金币','54'],[-119,'波次','1 / 8'],[143,'核心','10 / 10']]) {
    waveBody+=text(x,887,caption,40,'#B8C6CC')+text(x,836,value,55,'#F4E9CD');
}
waveBody+=text(-130,744,'下一波 · 第 2 波',40,'#DFD3B8')+text(-130,683,'步兵×9',32,'#B8C6CC')+text(-130,635,'机枪守线 · 留意改路',29,'#9DE2CB');
waveBody+=button(entry.FIRST_LEVEL_SKIP_COACH_BUTTON,'跳过','neutral',27)
    +text(0,-650,'强化中段机枪\n点推荐塔位，查看升级费用',36,'#DFD3B8');
waveBody+=text(-280,-835,'机枪塔',44)+text(-280,-887,'30',48,'#F4CF79')+text(35,-835,'冷凝塔',44)+text(35,-887,'40',48,'#F4CF79');
waveBody+=text(239,-850,'1×',46)+text(406,-850,'开始\n下一波',36);
add('intermission','教学波间 / 下波敌情',waveBody,['推荐补塔','推荐升级','可提前开波','三类混编预告']);
async function main() {
    fs.mkdirSync(out,{recursive:true});
    const verificationPath=path.join(out,'browser-verification.json');
    const verified=fs.existsSync(verificationPath)?JSON.parse(fs.readFileSync(verificationPath,'utf8')).pages:{};
    for(const f of frames) {
        fs.writeFileSync(path.join(out,`${f.id}.svg`),f.svg);
        await sharp(Buffer.from(f.svg)).resize(540,960).png().toFile(path.join(out,`${f.id}.png`));
    }
    fs.writeFileSync(path.join(out,'state-index.json'),JSON.stringify(frames.map(({svg,...f})=>({...f,source:`${f.id}.svg`,preview:`${f.id}.png`,runtimeAcceptance:verified[f.id]?.status??'pending-browser-verification',runtimeScreenshot:verified[f.id]?.screenshot??null,visualAcceptance:'pending-user-review'})),null,2));
    fs.writeFileSync(path.join(out,'index.html'),`<!doctype html><meta charset="utf-8"><title>夜城防线 · 全页面设计</title><style>body{margin:32px;background:#09131d;color:#ded8c9;font:14px 'PingFang SC',sans-serif}h1{font-size:22px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:24px}article{border:1px solid #66563b;padding:16px;background:#13232f}img{display:block;width:100%;max-width:390px;margin:auto}h2{font-size:16px}a{color:#cdb785}</style><h1>全页面设计 · 铜框 / 墨蓝 / 克制反馈</h1><p>独立设计稿，不是运行截图。1080×1920 参考坐标，文字统一 ×0.72。原生框体无需新增整页切图；战场沿用现有图片资产。</p><p><a href="../index.html">战斗设计稿与切图索引</a> · <a href="state-index.json">页面状态索引</a> · <a href="../PAGE-AUDIT.md">审查与验收记录</a></p><main>${frames.map(f=>`<article id="${f.id}"><h2>${f.name}</h2><a href="${f.id}.svg"><img src="${f.id}.png"></a><p>${f.states.join(' · ')||'共用面板规范'}</p></article>`).join('')}</main>`);
    console.log(`已导出 ${frames.length} 张独立页面设计及状态索引`);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
