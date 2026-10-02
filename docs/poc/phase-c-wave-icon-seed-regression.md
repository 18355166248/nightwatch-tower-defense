# 波次 HUD 单图试点：四资源卡一致性与开波回归

日期：2026-09-27。首关顶栏的金币、路径、核心已有独立图标；本轮为唯一仍为纯文字的“波次”资源卡补一枚同系候选，不改玩法、波次配置或输入热区。

## 来源与切图

- 使用 OpenAI 内置 `image_gen`。参考输入依次为本项目的 `gold-coins.png`、`core-heart.png`、`path-route.png`，只借用铜金边、深蓝机壳、青蓝能量与左上暖光；未使用《Fieldrunners 2》图片。原图 `art-source/first-level-hud/wave-beacon-source-v1.png`（1254×1254 RGBA），`sips -Z 128` / `sips -Z 32` 得到 `wave-beacon-128-v1.png` 和 `wave-beacon-32-preview-v1.png`。128 版复制到 `assets/resources/level-one/ui/wave-beacon.png`；来源和使用边界见 `wave-beacon-v1-manifest.json`。
- 使用的完整生成提示词：

```text
Use case: stylized-concept. Asset type: one standalone transparent HUD sprite for the WAVE / incoming-enemies resource card of Nightwatch Tower Defense. The three referenced images are style references from this same project only: gold coins (warm polished brass), reactor heart (navy brass casing and cyan glass), and route nodes (cyan light, sturdy outline). Create an ORIGINAL compact front-facing mechanical signal beacon icon: one broad brass-and-navy beacon housing with a bright cyan center and TWO bold cyan signal arcs rising above it, reading unmistakably as incoming waves at 32x32 pixels. Use a broad triangular / radiating silhouette, not a question mark, clock, coin, heart, route nodes, enemy head, or tower. Strong clean edge, 2-3 broad value bands, warm highlight from upper left, toy-mechanical rendering consistent with references. Center it in a square and occupy about 82% of the canvas; genuinely transparent RGBA everywhere outside the icon, no floor, shadow, glow cloud, background, card, text, digits, logo, watermark, additional object. Keep the arcs thick and separated so downsampling preserves them. This is a single icon cutout, not a UI screenshot.
```

## 技术与浏览器回归

- `asset_report.py`：运行时图 128×128 RGBA、26,664 B、alpha 0–255、内容边界 `(0,7)–(116,121)`、无问题；原生 32×32 预览中信号弧线与信标主体仍可分辨。Cocos Creator 3.8.8 以 `sprite-frame` 导入，`f9941` 子资源已生成。
- `PhaseBHudView` 复用 `HudResourceIconView` 与资源卡排版；图加载成功时波次为动态 `0/8`、`1/8`，未就绪时为 `波 0/8` 等完整文字。通用文字格式器仅将值类型扩展为数字或字符串，其他资源卡语义不变。
- `npm run verify` 92/92、Web Mobile 发布构建及 `git diff --check` 通过。右侧浏览器约 390×600，在 `http://127.0.0.1:4176/?build=phase-c-wave-icon-1445` 进入默认教学见四图标同列及 `0/8`；首塔落地后金币 140→110、路径 12→14格；第二塔落地后金币 80，开波后显示 `1/8`，波次事件为“第 1 波 · 发条步兵×9进场”。另在 360×780、430×932 查看四卡及教学/底栏布局，没有相邻卡遮挡；浏览器 error/warn 为空。视口测试后已恢复默认尺寸，试玩页复位到首页。

## 边界与待评审

- 波次图标是装饰图，具体进度由代码文字与波次事件共同表达。当前只用右侧浏览器测试了第一波开波，不是这一新构建的完整八波回归；之前的八波通过记录不能冒充本轮证据。
- 需交叉评审四枚图标在实际手机大小下的材质一致性和“信号弧线=来袭波次”识别率；至少 5 名无指导首次玩家、商业使用权、整套正式 HUD 与音效主观品质仍未验收。按用户要求不做 Android 真机测试，Phase B/Phase C 不因此宣布通过。
