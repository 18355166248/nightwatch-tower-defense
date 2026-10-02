# 首关中央石板底图候选 v2 与浏览器复核（2026-09-27）

## 设计判断

当前战场偏暗不全是运行时罩色造成的：项目原底图中央石板本身为深海军蓝，竖屏缩小时成为大块低层次色面。用户提供的《Fieldrunners 2》截图仅用于信息层级、明暗分离与开阔战场体验对照，**没有作为生图输入或切图来源**。本轮只改一张项目原创候选底图，不动塔、敌人、路线和 HUD 的来源。

## 资产与技术契约

- 编辑目标：`art-source/first-level-backdrop-source.png`，项目已有原创 941×1672 PNG；新源图：`art-source/first-level-backdrop-plaza-v2.png`，同尺寸。另留 390 像素宽游戏尺寸预览 `art-source/first-level-backdrop-plaza-v2-phone.png`。
- 运行时：`assets/resources/level-one/backdrop-plaza-v2.jpg`，JPEG 82，941×1672、约 415 KiB，小于 1 MiB 单图预算；SpriteFrame、中心锚点、线性采样、1080×1920 设计坐标、无碰撞。原 `backdrop.jpg` 原样保留。`PhaseBBackdropView` 先加载 v2，缺图则回退 v1；两者都失败时程序化战场仍可玩。
- 视觉锁定：原建筑、暖窗、天空和周边机械轮廓；中央石板提到灰紫中间值，保持没有预烘焙路径、格线、敌人、炮塔或障碍。源图中央 22%–78% 宽、26%–78% 高取样区的 RGB 加权平均亮度约 `55.2→91.0`；这是素材像素指标，不是浏览器截图或真人感知分数。
- 来源：2026-09-27，OpenAI 内置 `image_gen` 图片编辑模式，以项目自有 v1 原图作为唯一编辑目标。来源、状态和权利复核字段另见 `art-source/first-level-backdrop-plaza-v2-manifest.json`。

## 实际验收

- Cocos 3.8.8 Web Mobile 发布构建成功，新增 JPEG 的 `.meta` 已导入为 SpriteFrame；`npm run verify` 94/94，覆盖新旧两张底图的导入类型、尺寸和预算。
- 右侧浏览器无 QA 参数 `http://127.0.0.1:4176/?build=phase-c-plaza-v2-1657`：v2 地表加载，入场卡、石板、动态道路与四塔均可见；手动四塔开局金币 `140→10`、路径 `12→16`。1× 首波 9/9 击毁、0 漏、核心 10/10、金币 54，控制台 0 error/warn。候选石板在约 350 像素浏览器面板内可见纹理，敌人与塔未被底色吞掉。
- 本轮没有故意破坏 v2 文件做运行时回退演练，也未用此版本完整复跑八波或取得无指导首次玩家认可；真正的小屏长时观感、材质一致性与商业权利仍待交叉评审。按用户要求不做 Android 真机测试，不据此宣布 Phase B/Phase C 通过或需要迁移 Godot。

## 完整生成提示词

```text
Use case: precise-object-edit. Asset type: original portrait first-level NON-INTERACTIVE background for a top-down toy-mechanical tower-defense game. The supplied image is the EDIT TARGET, not a style reference. Change ONLY the large central playable stone-plaza floor: lift its midtones from very dark navy to a readable medium-value dusty indigo/slate-violet with restrained warm-lantern bounce near the borders, varied hand-painted cobblestone and rectangular stone texture, and subtle local value variation that remains quiet behind dynamic towers, enemies, route and grid. Keep the central playfield flat, open and unobstructed across its entire height: NO baked path, grid, towers, enemies, props, collision-looking obstacles, strong symbols, circles, arrows or text. Preserve EXACTLY the existing composition, architectural perimeter, rooftop silhouettes, pipes, warm windows, upper skyline, moon, lamps, lower houses, top-down camera angle, 9:16 portrait crop, upper-left light direction, painterly toy-game material and placement of every original building and border element. Keep the top and bottom HUD-safe zones. The improvement should remain visible when the complete image is reduced to approximately 390 pixels wide; do not make the floor so saturated or bright that gold/cyan gameplay units lose contrast. Do not imitate or include art from any external game. No text, logo, watermark, mockup interface, added characters, or duplicate objects.
```
