# 第一关敌军入口实体切图候选（2026-09-27）

## Source

- 目标：给现有 `grid.entry` 一眼可认的敌军出发地标，不改变入口坐标、动态改路或敌人生成。出口已有实体反应炉；本轮补齐与之对位的入口形态。
- 原图 `art-source/first-level-objective/enemy-entry-hatch-source-v1.png`：OpenAI 内置 `image_gen`，1254×1254 透明 RGBA，使用本项目原创 `core-reactor-v1.png` 与 `rivet-gun.png` 两图作材质/光照参考，没有输入外部游戏截图或素材。运行时 `assets/resources/level-one/units/enemy-entry-hatch-v1.png` 用 `sips -Z 128` 确定性缩放，128×128 RGBA、20,952 B；32×32 原生小图预览同目录保留。素材台账见 `enemy-entry-hatch-v1-manifest.json`。
- 精确生成提示词：

```text
Use case: stylized-concept. Asset type: original transparent game sprite for Nightwatch Tower Defense, a first-level enemy spawn landmark, not a full scene. The two input images are style references only: preserve their toy-like copper/brass and deep-navy mechanical material language, cool cyan emissive details, chunky silhouette, soft hand-painted bevels, upper-left warm rim lighting. Create ONE original clockwork enemy entry hatch/portal viewed from near top-down orthographic camera, square base with dark central opening clearly suggesting enemies emerge from here, brass riveted frame and subtle cyan inward arrows or energy, no readable text. Centered object, generous transparent padding on all sides, visually readable at 32–40 pixels in a mobile vertical tower-defense battlefield. The object should be low and flat enough that an enemy sprite traveling over it remains visible. Keep a clean truly transparent RGBA background, no ground plane, no cast shadow outside the object, no screenshot, no UI panel, no road tiles, no characters, no duplicate objects, no logos, no text, no watermark. Approximately square silhouette, source resolution around 1024x1024.
```

## 工程与实景

- `EnemyEntryArtView` 独立异步加载 SpriteFrame、从 `grid.entry` 定位并把装置放在路面上、敌人切图下；结算时隐藏。加载失败只丢装饰，原道路入口和刷怪继续。Cocos `.png.meta` 明确为 `sprite-frame`，诊断只读字段 `entryArtLoaded` 用来确认实际导入。
- 素材报告：128×128、RGBA、alpha 0–255、9,971 个透明像素、无尺寸/透明异常；`npm run verify` 104/104、Cocos Web Mobile 发布构建通过。
- 右侧 350×600 普通入口首版 1.22 格在实际屏幕约 20 像素，不够明确；改为 1.55 格、向战场内退 0.08 个显示尺寸后，出口和入口能作为不同实体辨认，上方“第一夜”简报不被压住。最终构建 `?build=phase-c-entry-hatch-final-2332` 已在普通入口打开布防检查，`entryArtLoaded=true`。
- 同构建显式 QA 推荐四塔开第一波，入口与改变后的 16 格路径保持对齐；9/9 击毁、核心 10/10、54 金，浏览器 error/warning 为空。入口叠在地表与敌人切图之间，未见可见遮挡或改变游戏数据。

## 限制与 Review 问题

- 这是单张入口地标的浏览器候选，精细边缘、AI 素材商业权利、与所有敌种在密集刷怪时的可辨性仍需人工审美和来源评审。当前截图与短时首波不能替代完整八波和 5 名无指导玩家测试；不称作正式资产。
- 交叉 Review 请重点看：缩到手机宽度后是否足够像“敌军从这里来”、铜色是否与出口核心过近、第一格敌人出现时洞口是否喧宾夺主。按要求不做 Android 真机测试。
