# 第3稿页面材质生产记录

2026-10-01，内置imagegen生成，唯一视觉参考为用户已选择的 pause-quiet-enamel.png。
原始panel/primary/secondary/danger/icons-source.png均保留；确定性透明裁切与缩放由 scripts/export-page-quality-v3.cjs 负责。
运行时只用独立无字资产，slice-manifest.json记录源图、裁切位置、尺寸、透明检测、解码占用和九宫格边距。
未引用第三方游戏资产，也没有烘焙动态文字；商业发布前仍需人工核对生成服务条款。

## panel

```text
Use case: ui-mockup, production GAME UI ASSET, not a full screen. Using the attached selected Nightwatch pause mock as exact style reference, extract/redraw ONLY its outer pause panel as a clean independent TEXTLESS image, approximately square 1024x1024. Same thin chamfered bronze edge with small rounded machined corner caps and steel rivets, dark midnight navy enamel interior with extremely subtle painterly texture, soft top-left metal highlight. Panel face fully filled opaque dark navy; OUTSIDE the panel genuinely transparent. Front-on orthographic, no perspective. Fill canvas with panel, leave 16px transparent safety margin all sides. Preserve proportions of a near-square 836x810 Cocos reference panel. Remove ALL title, numbers, icons, separator lines, buttons, typography, HUD, towers, scene. NO internal text or symbols. Do not invent thick pipes, lanterns, gears or ornate extensions. Border about24px of1024. Nine-slice compatible: large calm center, no central ornament. Crisp professionally hand-painted shaded metal, not flat wireframe. One asset only, no surrounding sheet.
```

## primary

```text
Use case: ui-mockup. Production Nightwatch game UI asset, using attached selected mock for exact style. ONE clean textless primary button only, no whole screen. Horizontal rounded/chamfered rectangle, aspect4.6:1, 1024x224 intended export. Match attached large cyan-teal Continue button: deep teal enamel face, slim warm bronze outer bevel, cool cyan inner top edge, restrained hand painted soft top-left light and lower-edge shadow, subtly textured calm center. Four small chamfered corners, border about14px at1024wide, don't add rivets or ornament. Outside button TRUE transparent, minimal16px safety margin. FRONT ON orthographic no perspective. NO typography, NO play icon, NO labels, no scene, no other controls. Single resizable nine-slice button, no baked lighting spill outside alpha. Preserve original Nightwatch painted game material, not glossy modern app blue.
```

## secondary

```text
Use case: ui-mockup. Single production textless SECONDARY GAME UI BUTTON, using attached selected mock's two navy secondary buttons as style reference. Independent front-on orthographic button only; aspect2.4:1, intended1024x426. Midnight navy enamel face, subtle slate-blue dimensional bevel and only a very thin muted bronze corner edge, soft warm top-left illumination, rounded chamfered rectangle. EXACT original Nightwatch restrained painterly material, no huge rivets, no ornament. Large calm interior, no symbols, no gear icon, no words, no baked typography, no scene or other buttons. TRUE transparent outside, small safety margin. Nine-slice compatible, corners confined to outer40px. Must pair coherently with teal primary button in reference, but much lower emphasis.
```

## danger

```text
Use case: ui-mockup. Production Nightwatch game UI asset: ONE textless subdued danger/exit button only, using attached selected mock's bottom burgundy Return Home button as exact style. Front-on orthographic horizontal chamfered rounded rectangle, 4.6:1 ratio intended1024x224. Deep muted maroon/plum enamel interior, slim warm bronze perimeter bevel, subtle top-left highlight and calm slightly worn texture, same material style as reference, not bright saturated red. Outside TRUE transparent, small safety margin. No words, no house icon, no symbols, no labels, no gameplay, no sheet or other controls. Nine-slice compatible corners confined to40px at1024wide, single complete uncut button.
```

## icons

```text
Production Nightwatch icon-family atlas on TRUE transparent background, using attached chosen mock as style reference. Exactly FIVE individual symbols equally spaced in ONE horizontal row, each fully contained within a separate equal square cell, intended1280x256 overall, five256x256cells. Left to right: round bronze PAUSE medallion with ivory two vertical bars; small ivory beveled PLAY triangle; ivory beveled circular RESTART arrow; ivory beveled SETTINGS cogwheel; ivory/bronze beveled HOME house. No letters or numbers, no words or labels, no whole UI button, no sheet border or scenery. Front-on orthographic, same clean restrained game-painted material, soft top-left lighting. Each centered with at least40px transparent padding within its cell, no overlap, consistent optical size; pause medallion is largest but fully fits. Ivory icons warm off-white, not glowing neon, edges sharp at24px display. No additional icons or repeated symbols.
```
