# 第3稿 · 首页与首关简报

日期：2026-10-01。方向沿用用户选定quiet-enamel，不扩展关卡或外围系统。

## 设计与拆分

独立高保真源稿：`concepts/home-quiet-enamel.png`，原生成文件`exec-83f7e2e8-dac8-46f1-ba18-6cb8e18a76ce.png`。工具为内置imagegen，唯一风格参考是已选暂停稿；没有用运行截图替代设计。

构图从三张大卡片改为夜城插画、目标、两种塔能力、纪录、开始/自由布防入口。插画只表达氛围，不宣称其中的塔位、敌群或透视是可玩地图。标题与正文按1080画布统一比例缩小；稿件标题生得偏大，实装遵循用户的小字号要求。

只切无字插画`home-hero.png`，裁切规格见`home-slice-manifest.json`。面板/按钮/齿轮/播放复用共用切图；塔能力图用真实机枪、冷凝SpriteFrame，纪录从原存储读取。文字、热区和状态仍原生；没有整页贴图。

## 分层与验证

- `FirstLevelEntryLayout.ts`：安全区与入口/插画几何，绘制和输入共同读取，跳过也采用适配后的热区。
- `FirstLevelHomeArtView.ts`：无字图片、按需加载、比例保持、异步失败诊断，不拥有玩法或页面状态。
- `FirstLevelExperienceView.ts`：首页排版，教学高亮保持原行为；当前快照驱动资源到达后的重绘。
- `FirstLevelPageSkinView.ts`：图片资源乱序时底板固定到最底层，不遮住先创建的控件。

首次浏览器截图`runtime-home-390-before-layer-fix.png`暴露[P1]底板后加载遮住按钮/图标；资源加载成功本身不能证明页面正确。修正后需重新截图、对照并验证入口。

本阶段全页面视觉及同构建三局正常1×八波仍未完成；下面记录首页增量，不将它缩减成总目标。

## 实装对照与迭代

最终构建`quality-v3-home-fidelity-1950`，主包SHA256 `9516ede077bdd41e48b615f2b35360bbe58bc4a08e5778403800598bc8f4d06d`。

源图941×1672，实际390×844浏览器截图；源稿等比包含进390×844，未拉伸。`home-fidelity-comparison.png`为全景并排，`home-controls-comparison.png`为同像素入口区域；两张均实际打开审查。窄屏截图`runtime-home-320-final.png`及`runtime-home-320x900-final.png`。实际图片保持764:450比例，不把图片的塔或敌人拉扁。

迭代1：[P1]异步图片遮住按钮/图标。固定底板在饰面最底层，并将图标分独立更高容器；冷加载及战斗返回重新截图，所有入口饰面、齿轮和播放均显示。不是只根据加载成功判断。

迭代2：[P2]主视觉偏小、标题和能力卡留白偏移。面板910→1000参考宽，主视觉730→900参考宽；标题/章节/目标/能力/纪录按源稿移位，入口视觉内缩但保留155高热区。修正后的全景和入口局部再次对照，主要区域的位置和比例更接近源稿。

五项审查：

- 字体：原生PingFang SC回退，标题68/目标48/正文32/入口38/说明28参考单位；390宽对应24.6/17.3/11.6/13.7/10.1px。字体家族和字重仍比生成稿更轻，部分标题按用户偏好缩小；不将此说成逐像素一致。
- 版式：主视觉与目标区比例已修正，设置/开始/自由布防热区由共享安全几何读取。320×844/900未观察到裁切，窄屏需要时能力文字换行。
- 配色：深蓝珐琅、铜边、米白文字、青绿主按钮，和暂停/设置共用材质。纪录沿用温金色。
- 图片：只裁无字插画，说明缩略图是真实游戏单位而非稿中不同造型的炮塔；主体保持原图比例。背景暂为静态深色，未做稿件外框后的虚化城市；分隔线/小菱形、设置角件仍有装饰差异。
- 文案：目标、能力、八波与实际首关一致；最快/最佳核心读取实际已有纪录，不将生成稿数值写死。没有开新关卡、商店或锁定槽位。

尚有[P2]装饰分隔/字体视觉重心/城市外围氛围差异，需统一家族精修及用户视觉确认；首页和全页面验收尚不宣称完成。不是因为工程测试绿就标记成品质量。

## 真实浏览器流程证据

已测设置→返回→开始布防进入guided；刷新后320长屏点自由布防进入free，金币140/塔0/准备态不变；恢复默认尺寸真实建3机枪1冷凝、改路12→16、普通1×开波、暂停→返回首页确认→确认，首页完整重现。9饰面与3插画/单位资源加载，失败列表和错误日志均为空。临时视口结束已恢复默认，右侧保留首页。

规则195/195、首页资源契约及其余设计契约检查通过；运行时代码类型通过。新增主视觉按RGBA解码为1,375,200 bytes；没有因此把8MiB全包预算标记通过。当前构建未跑三局完整八波，不复用旧构建通关证据。

## 完整生成提示词

transparent_background=false；referenced_image_paths只有已选`concepts/pause-quiet-enamel.png`。

```text
Use case: ui-mockup. Create one high-fidelity original HOME / FIRST LEVEL BRIEFING screen for the same steampunk tower defense game in reference image 1, whose quiet navy enamel, restrained fine copper trims, ivory Chinese lettering and teal primary controls are approved. Portrait 1080x1920. This is an independent design, not an existing runtime screenshot. No battle HUD behind the menu, no locked tower slots, no currency/shop/extra levels. Frame occupies x85..995 y110..1810, thin copper corners, dark navy smooth material. Top left brand 夜城防线 in modest 68 design units, below 第一关 · 夜城广场 in 32, top right compact gear Settings button 155 square touch area. Below header a wide cinematic hero window approximately x175..905 y420..805 (730x385): atmospheric original rooftop town at night, amber lamps, dark indigo architecture, brass rivet cannon left, cyan condenser right defending a blue core from tiny approaching clockwork robots, consistent original painterly 3D game-art style. Keep text outside illustration. Under hero a concise left-aligned objective title 守住夜城入口 48 units. Body at 32 units two lines: 摆塔改路，让敌人走进火力区 / 坚守八波，保护核心. Under it two restrained horizontal legend chips: 机枪 · 集中输出 and 冷凝 · 减速控场, tiny real tower thumbnails not three giant equal cards. Record at 28 units 最快 06:54 · 最佳核心 9/10. Bottom actions: one teal copper-beveled wide button 开始布防 with small play icon, 155 design-unit touch height; a secondary navy wide button 自由布防 · 跳过引导 also 155 touch height; micro footer 本关自由布塔 · 无额外道具. Make clear hierarchy, generous but compact spacing, restrained mature game design. No excessive title typography, no logo crest, no extra screens or systems. Match referenced button materials rather than flat web cards.
```
