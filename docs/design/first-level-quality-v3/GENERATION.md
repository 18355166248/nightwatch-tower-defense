# 首关全页面重设计：代表稿生成记录

日期：2026-10-01。使用内置 imagegen；三次独立生成，未使用 CLI/API 兜底。
以下是独立视觉探索，不是游戏运行截图；尚未选择、切图或接入运行时。

实际主聊天显示顺序与文件：
1. `concepts/pause-command-console.png`
2. `concepts/pause-watchtower-badge.png`
3. `concepts/pause-quiet-enamel.png`

三个生成均附带相同四张已查看的参考：
- v2/pages/runtime-pause-restored-390.jpg：现有功能与改造前界面，不作为新材质标准。
- art-source/design/first-level-quality-v1/battle-art-v2.png：原创夜城画风与材质。
- v2/pages/runtime-guided-upgrade-final.jpg：实际战斗 HUD 和操作结构。
- 用户提供的 Fieldrunners 2 截图（224238.png）：完成度参考，不能复制其资产。

## 生成提示词 · Mechanical Command Console

```text
Use case: ui-mockup. Create a realistic production-quality UI design for Nightwatch, an original Cocos tower defense game. Direction name: Mechanical Command Console.
Target dimensions: portrait 1080 x 1920 game content, shown naturally at 390px width. No phone body, browser chrome, OS bars, notches or surrounding presentation canvas.
Input images: first is the current poor pause screen for exact functional content ONLY (do not copy its flat generic rectangles); second is our existing painted Nightwatch battle artwork for world, palette and polished material style; third is our current working battle screenshot for actual HUD appearance and scale; fourth is a Fieldrunners2 screenshot for craftsmanship/readability reference ONLY, do not copy its assets, theme or characters.
Design a single high-fidelity pause screen with a dimmed recognizable nighttime rooftop tower-defense battlefield behind the panel, bronze cannon turrets and cyan condenser towers. Keep original Nightwatch midnight navy, warm bronze, ivory text, cyan accent. Not photorealistic: polished hand-painted dimensional game UI, crafted 3D bevels, softly worn metal with intentional lit edges, enamel surface, riveted joins, tiny contained mechanical motifs. Match the attached artwork's professional game material rendering.
The hero is a centered mechanical command console modal, occupying ~84% screen width and ~48% screen height; integrated top header plate and a modest embossed pause mechanism badge, beautifully shaded slim bronze frame, deep ink enamel inner field. Avoid five nested borders and generic wireframe UI. Strong hierarchy: modest 24px title at 390 width, secondary 13px game-state text, 16px mediumweight button text, 12px brief footer. CJK clean sans serif, no decorative calligraphy, no giant typography. Generous but economical spacing.
Text verbatim: title "战斗暂停"; state line "第 1 / 8 波 · 核心 10 / 10". One clear large primary full-width jade enamel beveled button with play icon and text "继续战斗", at least 48px visible height at 390px width. Beneath it two evenly sized dark enamel secondary buttons in one row: "回到战前布防" with restrained circular arrow icon, "战斗设置" with restrained gear icon, ~54px high. Last quiet danger outlined full-width action "返回首页" ~46px high, muted reddish bronze not saturated red. Small footer "战斗已冻结，继续后恢复". All four existing actions remain, no extra features, no close action, no fake rewards, tabs, currency panels or logos. Align button content and consistent optical padding.
Place familiar dimmed game top HUD and bottom tower tray behind, sufficiently muted not to compete. Precise neat Chinese typography. Show only ONE design, not a moodboard, not old/new side-by-side. Complete finished-game quality, not a web settings page or engineering prototype.
```

## 生成提示词 · Compact Watchtower Badge

```text
Use case: ui-mockup. Create realistic production-quality UI with clear hierarchy, intentional imagery and purposeful spacing for Nightwatch, an original Cocos tower-defense game. Direction name: Compact Watchtower Badge.
Target dimensions: portrait 1080 x 1920 game content, natural 9:16 ratio, designed to display at 390px wide. App content only, no phone frame, browser, OS indicators or mockup decoration. One finished screen, not multiple options.
Input images: first current pause screen is functional-content reference only, explicitly redesign its flat generic rectangles; second original Nightwatch battle art is the visual-world style reference; third actual game screenshot grounds HUD and layout; fourth Fieldrunners2 image is craftsmanship/readability reference only, do not copy its graphics or palette.
Preserve the original painted steampunk night-city world, slate rooftop battlefield, bronze cannons, cyan condenser towers, ivory typography and muted navy-bronze HUD. Highly polished hand-painted dimensional game interface with disciplined material rendering and soft directional highlights, not a web design or flat wireframe.
Create a compact pause panel, ~78% screen width and ~43% screen height centered just above mid-screen, with deliberately more battlefield visible than a tall console. Shape: crafted clipped-corner dark midnight-blue enamel plate, elegantly thin shaded bronze outer trim with four warm metal corner caps. A small embossed round watchtower shield emblem seated above header; pause bars inside, no crowns, stars, trophies or invented rewards. Restrained trim, no lanterns/pipes on panel, no decorative clutter. Strong whitespace and crisp optical alignment.
Exact title "战斗暂停" (22px optical at 390px wide) and state line "第 1 / 8 波 · 核心 10 / 10" (12-13px). Full-width jade enamel primary button "继续战斗" with a small polished play icon, visible 52px high, type16px. Below, one grouped list of THREE full-width secondary rows, each at least46px high: "回到战前布防" with circular-arrow icon; "战斗设置" with gear icon; "返回首页" with home icon. Rows use refined inset navy surface, subtle separations and small metal right chevron, not three heavyweight colored cards. Return-home text muted reddish ivory, no big red slab. Each row aligned icon left and label left, action primary centered. Brief footer "战斗已冻结，继续后恢复" in12px muted ivory. No close button, no new features, no tabs, no extra statistics.
Dim the backdrop and familiar top HUD/bottom tower tray, don't black it out; preserve world readability while attention is on modal. Chinese clean sans serif, at most two fonts, medium bodyweight, no oversized text. Finished game quality with consistent edge bevels, calibrated shadows, rich but restrained metal detail.
```

## 生成提示词 · Quiet Night-City Enamel

```text
Use case: ui-mockup. Create realistic production-quality UI designs with clear hierarchy, strong typography, intentional imagery and purposeful spacing. Original Nightwatch Cocos tower-defense pause menu. Direction name: Quiet Night-City Enamel.
Target dimensions: 1080 x 1920 portrait game content, natural 9:16 ratio, aimed at display390px wide. Output game content only, no device body, OS bars, browser, page margin or board of multiple designs.
Inputs: first current pause screen provides required functional text/actions only, not styling; second our painted Nightwatch battle concept is the style identity; third runtime battle capture grounds familiar game layout; fourth Fieldrunners2 screenshot only references finished-game craftsmanship/readability, never reproduce its assets.
Stay with this original night-city steampunk world: slate rooftop, bronze turrets, cyan condenser towers, warm windows, navy enamel/bronze material family. However design the LIGHTEST and most RESTRAINED treatment: no pipes, lanterns, giant gears, trophy emblems or fantasy scrolls. Softly shaded professionally painted UI, not flat CSS boxes.
Composition: battlefield fills entire screen with a clear dark atmospheric overlay. Place one compact precision-cut navy enamel pause panel slightly BELOW vertical center, ~83% screen width and ~35% screen height. Thin chamfered warm-bronze rim, asymmetrical small machined corners, no more than one outer rim. Header left aligned small brass pause icon, ivory title "战斗暂停",24px optical size at390wide. Beneath state line "第 1 / 8 波 · 核心 10 / 10",13px. Elegant hairline divider and useful breathing room, no huge whitespace.
Primary action immediately beneath title: full-width teal enamel button "继续战斗", text16px and play icon, 54px optical visible height, a precise bronze top bevel and discreet glow highlight only. Under this one ROW of TWO equally weighted secondary actions, each at least54px tall and wide enough for readable text: a small refresh icon above "回到战前布防"; a small gear icon above "战斗设置". Dark inset enamel, thin slate edges, consistent icon scale, label14px. Final "返回首页" is a quiet full-width bottom row with small home icon, muted copper-red label, at least46px hit height; does not look like a dangerous giant red slab. Footer small12px "战斗已冻结，继续后恢复".
Only these existing four actions, no new features, no X close control, currencies withinmodal, scores, progression systems or invented settings. Typography clean Chinese sans serif, medium weights, calm density. Preserve familiar dimmed top HUD and bottom tower tray in background. Keep battle units recognisable, no giant new hero character. Focus attention via framing/lighting/hierarchy not excessive decoration or large typography. Finished commercial tower-defense game quality, no placeholder art.
```
