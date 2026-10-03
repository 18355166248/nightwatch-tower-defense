# 内置image_gen提示词及选稿记录

2026-10-02。使用OpenAI内置image_gen，透明背景选项为true；未使用CLI或外部生成模型。参考图片均为当前项目图片。原始字节包含生成工具提供的来源信息，CDN归档保留原始字节。生成不等于商业素材权利或生产质量验收。

## 认可后的生产视角修正

下面是两次生产编辑输入的结构化复述，不冒充逐字工具日志。透明背景仍为true，未要求改结构或另选风格。

- 二级生成`exec-0626d467-9919-4b76-b343-1853a0591d8d`：编辑目标为获批双侧罐，一级原塔仅作视角/材料参照。precise-object-edit，只提高三分之四俯视相机，露出更多罐顶和圆底座，轻微缩短柱体透视；保留两个大型侧罐、较高中室、铜管、深蓝外壳、青蓝冷却玻璃和左上暖光。方形透明画布、单机完整居中、无外投影/地形/文字/级标，不能裁掉侧罐。
- 三级生成`exec-b2dbd8d4-c3dc-4eb4-b676-1877998ff1b4`：编辑目标为获批球形图，一级原塔作视角参照。precise-object-edit，只修正俯视相机，保留一整颗青蓝压力球、铜赤道环及前扣、三条曲臂、圆形铜底座、深蓝机械下座及左上暖光；不能变回多个柱罐或侧瓶。完整透明画布，无额外场景、文字、徽章或拖尾。

原始1254方输出用于确定性配准和颜色/alpha提取，再由ai-asset-pipeline导出128图；不使用压缩预览作切图源。生产图哈希和CDN见`production-manifest.json`。

## 二级：选用

源生成标识：`exec-ffbb7697-e73b-48a8-8c20-098d699ad3d2`。

参考：`assets/resources/level-one/units/frost-coil.png`（一级身份/视角）与`rivet-gun.png`（同族材质）。

```text
Use case: stylized-concept. Asset type: one transparent high-fidelity tower concept sprite for Nightwatch Tower Defense, LEVEL TWO frost coil. Input image 1 is the exact project's existing LEVEL ONE frost tower, identity/view/material reference; image 2 is the sibling machine-gun tower, material and painterly rendering reference ONLY. Create a NEW LEVEL TWO structural upgrade, not the same tower enlarged. Centered on genuinely transparent square canvas, one complete compact tower, no text. Preserve rounded riveted COPPER circular plinth, dark NAVY armor, luminous CYAN glass cooling coils, toy-like polished painterly game sprite, three-quarter top-down orthographic camera matching image 1, upper-left warm lighting, original compact ground footprint. DESIGN: a thick central short cyan cooling chamber with two BIG separate cyan cylindrical condenser tanks on the left and right, joined by chunky copper pipes. Two side tanks should be unmistakable large silhouette masses, forming a wide squat three-part silhouette, brighter cyan focal area, navy rounded rear guard, strong copper rim, simple bold forms that survive at 32px. Side tanks roughly half height of central cylinder, spaced with clear negative gaps, oriented symmetrically to match the camera. This is a cryogenic industrial machine, not a gun, not magic crystal tower, not modern spaceship. Maintain coherent same-family art, no thin decorative fins, no badges or level pips as substitute for changed geometry, no ground outside plinth, no scenery, no detached parts, no smoke, no enormous particle halo, no text, no labels, no UI, no watermark. Entire tower inside image with about 14% safety padding. Visually distinct from level one by twin broad side tanks, but not as powerful or tall as level three.
```

## 三级：弃用的三罐候选

源生成标识：`exec-4c7a2daf-2cdf-49d7-98ec-0216416b0210`。使用一级、上面二级及机枪为参考，要求三芯环式反应堆。结果仍是三罐结构，实际小尺寸与二级相近，未作为交付稿或切图基线。仅作为后续定向编辑的中间输入保留来源标识。

## 三级：选用的球形定向修改

源生成标识：`exec-81f7fec2-e3d2-4a4b-98fb-495ece8b60e5`。

参考：弃用三罐图为编辑目标，现有一级图为风格/视角参考。

```text
Use case: precise-object-edit. EDIT TARGET is image1, current level3 prototype. Image2 is original level1 STYLE/CAMERA reference. REPLACE ONLY the ENTIRE cluster of three CYLINDRICAL tanks and their connecting top pipes in image1 with a radically distinct SPHERICAL CRYOGENIC REACTOR. Preserve image1's circular riveted copper base plinth, dark navy mechanical lower chassis, polished painterly toy-like rendering, warm upper-left lighting, canvas registration, ground footprint and clean transparent background. New top structure: ONE LARGE almost circular CYAN GLASS PRESSURE SPHERE, clearly readable ball silhouette, filled with swirling icy coolant, occupies upper central half of machine; three broad curved COPPER BRACING ARMS clamp the sphere, one at rear and two at lower sides. One broad COPPER elliptical EQUATOR band wraps the sphere horizontally, navy collar at base, small chunky copper cap on top. Keep much of cyan glass visible, glowing bright cyan center and darker blue edges, controlled minimal glow fully inside silhouette. Sphere is industrial glass sealed inside brass mechanical frame, NOT a crystal, wizard orb on a pedestal, levitating magic or sci-fi spaceship. Do not retain any large vertical cylindrical tanks at front or side; do not add twin bottles. Strong easy-to-read round crown silhouette like an armored pressure vessel, distinctly different from existing narrow level1 cylinder and proposed horizontal twin-side tanks level2. Camera must be elevated three-quarter top-down, not straight eye-level side view. Reduce bolt count/texture noise, use large navy/copper/cyan forms that survive at32px. Entire compact complete machine centered in square canvas, no external shadow, scenery, text, level labels, badges, FX trails, watermark, cropped parts.
```
