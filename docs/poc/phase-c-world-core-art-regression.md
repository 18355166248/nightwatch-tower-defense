# 出口核心世界切图候选与浏览器验收

日期：2026-09-27。范围仅是第一关出口目标的世界空间识别，不改 9×13 网格、动态道路、生命计算、波次和经济。对照了本地《Fieldrunners 2》截图中“场景留白也可以成立”的事实，因此本轮没有为了铺满屏幕重写迷宫；改进重点是玩家究竟在守什么。

## Source

- 原图 `art-source/first-level-objective/core-reactor-source-v1.png`：OpenAI 内置 image_gen，1254×1254 透明 RGBA，原创候选。提示词没有输入或派生外部游戏截图，仅用文字描述本项目已有的深蓝/铜金玩具机械材质。
- 运行时 `assets/resources/level-one/units/core-reactor-v1.png`：`sips -z 128 128` 从源图确定性缩放，128×128 RGBA、19,926 B。`art-source/first-level-objective/core-reactor-phone-preview-v1.png` 为 `sips -z 32 32` 原生小图预览。资产来源、尺寸、预算、锚点和待审批状态见同目录 manifest。
- 精确生成提示词：

```text
Create ONE original production-ready 2D game sprite for a mobile tower-defense game. Subject: a small, squat, fortified power core that players must protect at the end of a maze path. Appearance: warm copper and brass circular riveted base, deep navy steel housing, one large luminous cyan-blue crystal/energy cylinder in center, two compact guard brackets. Orthographic three-quarter top-down view, centered, symmetric left-right, compact silhouette, visibly different from a gun or tower. Art direction: polished hand-painted toy-like steampunk night-city game art, strong readable shape at 70x70 pixels, crisp edges, warm highlights and cool blue energy, very restrained details, consistent with brass/blue mechanical turrets. Entire object and base visible, tight square crop with ~8% transparent padding. Truly transparent RGBA background, no floor, no ground decal, no cast shadow outside the object, no extra props, no UI, no text, no letters, no border, no sheet, no other variants. Original design, not derived from Fieldrunners or any existing game art.
```

## 工程边界

- 新 `CoreObjectiveArtView` 只异步载入 SpriteFrame、从 `grid.exit` 定位、控制表现层顺序和结果态显隐；不读取或修改生命、寻路、敌人状态。旧 `CoreObjectiveView` 继续负责动态健康圆环与左侧生命牌，缺图时它们完整保留。
- 首次构建确认 Cocos 把 PNG 当普通 Texture，虽无 console 错误但世界切图不出现；将 `.png.meta` 指定为 `sprite-frame` 后重建，资源表出现 `/spriteFrame`，浏览器真实画面才出现目标。此过程是“构建成功不等于切图可见”的回归点。
- 默认窄屏审图发现 0.96 格显得太小，因此候选调为 1.22 格并上移 0.18 个显示尺寸；仍以出口格坐标为唯一定位，覆盖在旧圆环内部，位于敌人与塔下方、HUD 上方。放大是表现层微调，不扩大碰撞或可建造范围。

## 验证与限制

- `npm run verify`：100/100；Web Mobile 发布构建完成。右侧浏览器最终地址：`http://127.0.0.1:4176/?build=phase-c-core-reactor-final-2223`。普通玩家入口从首页进入布防，原来出口仅有空心圆环，现在能看到蓝芯铜座；生命数值仍为 10。显式 QA 推荐四塔使路径 12→16 格，目标仍与路径终点对齐；启动第 1 波后目标在路面之上可见，没有挡住上路四塔。浏览器控制台无 error/warn。
- 这里只确认第一关首屏和第一波开始时的视觉可见性，不代表八波完整复跑、漏怪危急态观感、5 名新玩家是否立即理解目标，或正式美术/商业权利审批；该切图仍是可撤换候选。按用户要求不做 Android 真机测试。
