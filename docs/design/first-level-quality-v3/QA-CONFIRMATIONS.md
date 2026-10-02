# 确认弹窗设计还原 QA

本报告只覆盖2026-10-02获批的两张确认页，不证明其他页面或首关阶段整体完成。

此前全页面阶段报告完整保留在 [QA-BEFORE-CONFIRMATIONS.md](docs/design/first-level-quality-v3/QA-BEFORE-CONFIRMATIONS.md)。其中首页、设置、结算等已记录的未解决视觉差异仍需复查；全页面交付仍未通过，本文件末尾的passed只指本批确认页内部对照。

## 视觉真值与环境

- Source truth：`docs/design/first-level-quality-v3/confirmations.html`；截图 `/private/tmp/nightwatch-confirmation-fidelity-aeMb8G/reference-restart.jpg`、`reference-home.jpg`。
- Implementation：`http://127.0.0.1:4176/?build=quality-v3-confirmations-final-1007`；截图同目录 `implementation-restart.jpg`、`implementation-home.jpg`。
- Browser CSS viewport：770×597；source pixels 390×844；implementation pixels 770×597；截图均1×。源稿为390宽内容区域；游戏为SHOW_ALL中心336×597区域。
- Normalization：实装剔除左右黑边（left217,width336），按宽度等比到390×693；源稿中心裁切top76,height693。未伪造390／320浏览器验证；视口覆盖未生效。
- State：普通1×，两机枪塔，第一波，核心10/10，用户主动暂停后分别进入两个确认页。源稿同波次与核心；背景只作为上下文，实装保留真实地图与HUD。

## 比较历史

1. 初稿：正文缺局部重点、九宫格显示边框未按稿件尺寸；P2。修复为分段原生文字，边框宽度19／9稿件像素与整体同缩放。
2. 对照裁切一度未与源DOM匹配，废弃该比较结果；从整页770×2176参考截图按真实DOM坐标裁切390×844，再归一后比较。
3. 正文分隔线被底板遮挡／缩放后描边过淡；P2。移到饰面上层，以原生实心细线绘制。最终1007构建截图中已可见。
4. 最终重新打开参考、运行截图并一起查看全景和局部对照：主体尺寸、正文顺序、重点、按钮位置及安全操作层级一致，无剩余可执行P0/P1/P2问题。

## 五项必查表面

- Typography：同PingFang SC；标题17、用途10、战况11、正文12／22.8行高、按钮13、辅助10（以390稿件基准）。等比例缩放且无截字。Cocos与浏览器文字抗锯齿、600／500字重映射、眉题1px字距有轻微差异，P3。
- Layout：344×394.45面板、298×54按钮、10间隔及正文位置遵循稿件；归一后因像素取整有约1–2px差异，P3。内容没有重叠。320按钮缩放后的44.3px仅由几何测试证明。
- Colors：正文#F4E9CD，辅助#A9BDCA，眉题#C6A876，离开按钮字#D9B2A5；遮罩rgba(6,12,22,.67)。未再用大红退出主按钮。
- Assets：原本第三稿本地无字底板／按钮／home、restart图标，九宫格边框19／9稿件像素。无假图标、占位整页或新图片；背景差异为实际游戏状态，不是替换设计资产。
- Copy：三行后果、历史纪录／设置保留、战前金币恢复符合真实状态。首页主按钮保留原局，次按钮明确结束本局；不是只换了视觉而继续用旧触控下标。

## 证据

- Full view：同临时目录 `restart-comparison.png`、`home-comparison.png`。
- Focused：`restart-focused-comparison.png`、`home-focused-comparison.png`，两侧同时检查字体、九宫格、图标、分隔线及文案。
- 实际交互：两个取消、重部署恢复两塔与80金币、确认离开回首页、确认页切换设置已验证；日志检查无捕获警告／错误。
- `npm run verify` 199通过，美术10通过，发布构建通过；完整运行源码在ES2020独立检查配置中通过。默认全量tsconfig的ES2015／Bun工具问题仍单独披露。

## 后续边界

P3字体渲染和细字距可在用户最终视觉反馈后再调整，不无限循环。尚未验证完整八波、三局连续运行、真实320／390视口、读屏和键盘。内部对照通过不等于用户成品视觉验收，不证明全页面目标完成。

final result: passed

