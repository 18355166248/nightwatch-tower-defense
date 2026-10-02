# 核心生命 HUD 单图试点：切图、回退与引擎内预览

日期：2026-09-27。沿用 `phase-c-hud-direction-v1.md` 的夜城深蓝/铜边层级和已接入的金币种子图，只制作一枚新的“核心生命”图标候选供交叉评审；不把合成设计稿当游戏底图，也不批量生产尚未审定的路径/波次图标。

## 来源与边界

- 使用 OpenAI 内置 `image_gen`，输入 `assets/resources/level-one/ui/gold-coins.png` **仅作本项目已有图标的材质/光照参考**。提示词要求：单枚透明机械心形能量核心；铜/深蓝铆接外框、青蓝玻璃发光心体；左上暖光、少量大色阶、32×32 仍可识别；占方形画布约 80%；禁止金币、文字、卡框、场景和外部投影。没有使用《Fieldrunners 2》的素材作为输入。
- 原始生成文件保存在 `art-source/first-level-hud/core-heart-source-v1.png`（1254×1254 RGBA）。用 `sips -Z 128` 导出 `core-heart-128-v1.png`，并复制为 `assets/resources/level-one/ui/core-heart.png`；另存 `core-heart-32-preview-v1.png` 供原生小图评审。`hud-resource-seed-contact-v1.png` 并排展示金币与核心图标；逐项资产契约在 `core-heart-v1-manifest.json`。
- 核心健康数值、受损/危急颜色与触控热区仍由程序维护。图标不表达具体生命余量；低血量依旧由数字、色条及原有反馈表达，不能仅凭青蓝心形判断生命是否安全。商业使用权、原创性和用户审美接受度仍待最终审核。

生成使用的最终提示词（输入图 1 为上述金币图标）：

```text
Use case: stylized-concept. Asset type: single transparent HUD cutout icon for Nightwatch Tower Defense's CORE HEALTH resource card. Input image 1 is a style reference only: the project's existing three-gold-coins HUD icon; do not edit it or copy coins into the new asset. Produce one original compact heart-shaped mechanical reactor core icon, front-facing and nearly symmetrical. A small chunky copper/brass rim with rivets and dark navy recess surrounds a bright cyan-teal glass energy heart; crisp large silhouette and 2-3 broad value bands so it is recognizable at 32x32 pixels. Match the reference's warm upper-left highlight, softly beveled toy-mechanical material, clean polished edge, and restrained shading. Occupy about 80% of a square canvas and center precisely. Genuinely transparent RGBA outside the object, no floor, no shadow outside the silhouette, no background, no UI card, no text, no numbers, no glyphs, no logo, no watermark, no duplicate object. This is a standalone sprite, not a screenshot or interface mockup.
```

## 技术与运行时

- `asset_report.py`：128×128 RGBA，22,751 B，alpha 范围 0–255，透明像素 9,269，内容边界 `(13,16)–(115,112)`，无问题。Cocos Creator 首次导入为普通 Texture；将 `.png.meta` 的类型设为 `sprite-frame` 再构建后生成 `f9941` 子资源。
- `HudResourceIconView` 继续只负责异步加载、位置和显隐；`PhaseBHudView` 对金币和核心复用同一个图标/数值卡排版方法。`resourceCardValueText` 在单图未就绪时分别保留“金币 N”或“核心 N”，不会把一个图标的加载状态错误套到另一个资源上。
- Web Mobile 发布构建 `http://127.0.0.1:4176/?build=phase-c-core-icon-seed-1335`。右侧浏览器约 390×600：默认首页到战前引导，核心图标与动态 10 同卡、金币图标与 140 同卡，均可见且不压边；手动选择/预览/落下一座机枪后金币 140→110、塔 0→1，核心仍 10，浏览器 error/warn 为空。最终复位试玩 URL 为 `http://127.0.0.1:4176/?build=phase-c-core-heart-final-1336`，再次确认 140 金/核心 10、无浏览器 error/warn；两 URL 使用同一发布文件，仅查询参数不同。
- `npm run verify` 覆盖两个独立图标的数值文字回退、128 RGBA、单张 <32 KiB 和 SpriteFrame 导入契约；`git diff --check` 随本轮最终检查。

## 仍需评审

- 这只是作者在默认浏览器窗口的视觉判断，不等于 5 名首次玩家的实际识别率，也不是其他宽高比或 Android 真机验收。核心低血量下的图标/数字组合还未做浏览器危急态截图回归。
- 图标属候选资产，虽已引擎内接入，`approved_by` 仍为空；完整 HUD 图标家族与底框正式切图在方向获得交叉评审后继续制作。首关玩法完整八波证据仍以 `phase-c-guidance-hierarchy-and-full-run-regression.md` 对应的前一构建为准，本轮新增图标构建只复测了第一座塔。

后续低血量状态和危急卡框已在 `phase-c-core-critical-card-regression.md` 单独复测；本节“还未做”仅指当时的图标试点构建。
