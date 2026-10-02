# 第一关视觉样板与资产记录

## 方向

夜城屋顶防线：俯视的玩具质感建筑、铜色机械件、青蓝屋顶和暖黄窗光。中央战场保持低对比，路线、敌人、塔与射程由运行时独立叠加。参考《Fieldrunners 2》的信息层级和布塔改路体验，不沿用其美术资产。

当前完成底图、三种敌人和两种塔的单位切图、两塔分层，以及步兵/疾行机的第二步态帧候选。路线、特效和 HUD 仍是程序化表现；敌人尚缺完整待机/受击/死亡动作，不能称作完整美术落地。

2026-09-27 已制作第一关 HUD 合成方向稿与一枚透明金币切图样本；金币 v2 后续已作为**单张引擎内种子候选**接入，方向稿本身未接入运行时。小屏预览、来源、复用边界及交叉评审点见 `docs/poc/phase-c-hud-direction-v1.md`。合成方向稿改变了原底图细节，不能当作最终背景或直接切图。

同日又以已有金币图标为材质参考，单独制作并接入一枚青蓝铜框“核心生命”透明候选图标；金币与核心的数值仍为动态文字，任一图标未加载时该卡回退到完整资源名。源图、128/32 小图、并排对照、资产契约和浏览器边界见 `docs/poc/phase-c-core-heart-icon-seed-regression.md`。此举只是第二枚单图种子，不代表整套 HUD 切图方向获批；路径和波次图标仍待交叉评审。

同日增补第三枚独立种子：路径长度图标。经过 32×32 原生尺寸比较，弃用轮廓近似问号的 v1 和过扁的 v2，选择紧凑 L 形三节点 v3 接入；数值固定带“格”，图标缺失时回退“路径 N格”。源图、128/32 切图、资产契约和右侧浏览器首塔回归见 `docs/poc/phase-c-path-icon-seed-regression.md`。它仍是候选，波次图标与整套 HUD 尚待交叉评审。

同日以已有三枚本项目图标为材质参考，增加机械信标/双青蓝弧线的波次图标候选。波次仍是动态 `N/8`，缺图退回“波 N/8”；至此四个资源位均有单独图标，但**不是**整套 HUD 美术获批。源图、128/32 切图、提示词、资产契约与右侧浏览器开波检查见 `docs/poc/phase-c-wave-icon-seed-regression.md`。

同日已将方向稿中的深蓝/铜边层级作为程序饰面试点接入，底框绘制抽离为 `FirstLevelHudChromeView`；仍使用原动态 Label 和按钮热区，且未加载上述新图片。右侧浏览器的初始 HUD 与首个落塔检查见 `docs/poc/phase-c-hud-chrome-regression.md`。

2026-09-26 地表视觉迭代：战场不再用高不透明度灰蓝格子覆盖底图。`BattlefieldSurfaceView` 从真实路径快照绘制连续的铜边石路，空格仅保留低对比细线，已建塔和布塔预览保持独立色块。因为路线随布塔动态改变，这里选择无贴图接缝的程序化地表，而不是生成固定路线切图；输入命中仍复用 `PhaseBLayout`。右侧浏览器已验证默认画面、布塔预览和落塔，正式路线材质/动效与单位动作资产仍待制作。

2026-09-27 路线预览对照：合法布塔预览中，从当前真实路线与候选路线的格子差集生成旧路斜线、新路实框；格子是否可建仍由原流场和经济事务判断。旧路上被塔位占据的格子不叠斜线，避免与塔预览相互遮挡。非法预览、取消预览、提交后的稳定画面都不保留差集标记。该表现是帮助首次玩家看懂改路的候选程序化效果，不等于已经通过真人理解率或正式路线材质验收。

2026-09-27 等长改路反馈修正：路线文案和提交后 0.9 秒描边按完整格序判断，而不是只比较长度；走向变化但总格数相同时显示“路线改道·长度不变”，真正未变才写“路线不变”。建造、开局撤销和波间出售共享同一展示规则。该反馈是短暂表现，不冻结战斗或输入。

2026-09-26 单位动态过渡：`UnitVisualMotion` 从格内进度生成步伐姿态，疾行机节奏快于步兵；炮塔从只读开火事件获得短暂后坐力。敌人身体与血条/减速提示分层，暂停时姿态不会继续漂移。该做法只为改善当前静态切图的战斗阅读性，仍不等于正式移动/攻击动作帧；后续切图契约保持不变。

2026-09-26 减速状态补强：被冷凝塔减速的敌人持续显示轻青色身体色调及四刻度冰环，强度随剩余时长淡出；Sprite 和灰盒回退共用冰环画法。第二波密集敌群的右侧浏览器候选可辨，但它仍只是程序反馈，不替代正式受击/移动动画资产。

2026-09-27 密集群控降噪：保留每只敌人的减速状态与冷色身体，同一区域相距不足 0.8 格的减速敌人只画一个冰环。Sprite 和灰盒回退共用只读选择器，避免后段重甲群的多重冰环盖住单位和路线；右侧浏览器在第六、七波检查，证据与边界见 `docs/poc/phase-c-slow-ring-density-regression.md`。

2026-09-27 首关亮度/尺寸试点：减弱底图与棋盘的双重暗罩，提高动态铜边石路对比，并将炮塔和敌人的显示尺寸抽到 `UnitDisplaySize`；显示调整不改变格子、索敌或触控。右侧浏览器首波检查与仍偏暗、空白占比偏大的主观差距见 `docs/poc/phase-c-battlefield-readability-regression.md`。本轮没有制作新切图，不能把显示放大当作正式资产完成。

同日命中反馈分层试点：独立 `CombatFeedbackView` 使用短枪口亮点、机枪前向火花与冷凝四向晶芒区分塔种，并沿现有反馈时间轴自动归零。右侧浏览器前三波与未验收边界见 `docs/poc/phase-c-combat-impact-layer-regression.md`；这是程序化候选效果，不代替正式弹道、受击和死亡切图。

## 第一张正式候选资产

| 字段 | 值 |
|---|---|
| ID | `level-one-backdrop` |
| 用途 | 第一关非交互底图 v1，当前作为 v2 加载失败时的兜底，位于战场 Graphics 下方 |
| 原图 | `art-source/first-level-backdrop-source.png`，941×1672 PNG |
| 运行时 | `assets/resources/level-one/backdrop.jpg`，941×1672 JPEG 82 |
| 来源 | 2026-09-25 OpenAI 内置 image_gen 生成；原始图片在本仓库留档 |
| 显示尺寸 / 锚点 | 1080×1920 设计坐标，中心锚点 |
| 透明 / 碰撞 | 不透明；无碰撞 |
| 拉伸 / 加载 / 降级 | 全屏等比例近似拉伸；启动时本地加载；失败时程序化背景继续运行 |
| 预算 | 单张运行时文件不超过 1 MiB；首屏纹理传输目标 ≤3 MiB |
| 状态 | 浏览器视觉样板；保留为可回退旧版，待主观评审和最终资产验收 |

生成提示词要点：原创 9:16 夜城屋顶塔防背景；中央 78% 宽、66% 高保持安静、无格线、无路径、无塔和单位；外缘布置铜管、屋顶、暖光窗和少量机械构件；顶部与底部保留 HUD 安全区；无文字、Logo、界面。光从左上方照入。

## 中央石板提亮候选 v2

2026-09-27 用项目自有 v1 原图作为**编辑目标**，只提高中央可玩区域的灰紫石板中间值和细节，保留夜城建筑边框、暖窗、天空、镜头及 HUD 安全区；没有把《Fieldrunners 2》截图交给生成器或复用其素材。源图 `art-source/first-level-backdrop-plaza-v2.png`，原生宽 390 的预览 `art-source/first-level-backdrop-plaza-v2-phone.png`，运行时 `assets/resources/level-one/backdrop-plaza-v2.jpg` 为 941×1672 JPEG 82、约 415 KiB。候选与旧版均按 SpriteFrame 导入；新图加载失败退回旧图，二者都不可用时继续由程序战场兜底。完整来源、提示词及右侧浏览器对照见 `art-source/first-level-backdrop-plaza-v2-manifest.json` 与 `docs/poc/phase-c-plaza-backdrop-v2-regression.md`。

中央取样区平均亮度从源图约 55 提至约 91（RGB 加权亮度，源图像素尺度）；这只描述图片变化，不代表设备实际观感。新图是**浏览器候选**，未获得最终美术、商业权利或首次玩家可读性批准；道路、格线、敌人和炮塔继续由运行时独立绘制。

## 第一组单位切图样板

| ID | 源文件 | 运行时文件 | 用途 |
|---|---|---|---|
| `rivet-gun` | `art-source/first-level-units/rivet-gun.png` | `assets/resources/level-one/units/rivet-gun.png` | 机枪塔、商店图标和布塔预览 |
| `frost-coil` | `art-source/first-level-units/frost-coil.png` | `assets/resources/level-one/units/frost-coil.png` | 冷凝塔、商店图标和布塔预览 |
| `clockwork-infantry` | `art-source/first-level-units/clockwork-infantry.png` | `assets/resources/level-one/units/clockwork-infantry.png` | 第一种敌人 |
| `clockwork-runner` | `art-source/first-level-units/clockwork-runner.png` | `assets/resources/level-one/units/clockwork-runner.png` | 第三波起出现的疾行机 |
| `iron-canister-hauler` | `art-source/first-level-units/iron-canister-hauler.png` | `assets/resources/level-one/units/iron-canister-hauler.png` | 第五波起出现的重装敌人候选 |

- 来源：2026-09-26 使用 OpenAI 内置 image_gen 原创生成；源 PNG 均为 1254×1254 透明图。机枪塔提示词为铜金色、双炮管、俯视 3/4 角度的玩具机械炮塔；冷凝塔为铜色底座、青蓝发光能量芯的同视角机械装置；步兵为铜色发条、青蓝配件的小型机械敌人。均要求单体、透明背景、无文字和场景。
- 规格：使用仓库 `ai-asset-pipeline/src/resize.py --size 128 --square` 缩到 128×128 RGBA；每张运行时约 20 KiB。`art-source/first-level-units-source-contact.png` 和 `art-source/first-level-units-runtime-contact.png` 分别保存源图与缩小后对照。
- 显示：塔在战场使用 108×108 设计坐标、敌人使用 78×78，中心锚点；商店图标 86×86。步兵按生成序号固定分到四个轻微错位的视觉位置，逻辑位置、寻路和索敌不变。无碰撞。Cocos 资源类型固定为 SpriteFrame，启动异步加载；任一单位图未就绪时由原 Graphics 灰盒整体兜底。
- 状态：右侧 Web Mobile 浏览器已确认两塔商店图标、布塔预览、战场塔和移动步兵可见；密集队列的静态图现在可稍微分开。命中短闪和死亡淡出由只读战斗事件驱动，不阻塞模拟；仍需正式分层炮身、待机/移动/受击/死亡动作，以及真人对密集画面的阅读性评审。
- 疾行机源图于 2026-09-26 用 OpenAI 内置 image_gen 以步兵源图作风格参考生成：铜金/海军蓝玩具机械材质、俯视 3/4 角度，改为低伏头部、双后掠鳍、青蓝眼缝和脚部涡轮；保留独立轮廓，不复制步兵造型。源图 1254×1254 透明 PNG，运行时经 `sips -Z 128` 归一为 128×128 RGBA、约 14 KiB；原图与运行时图均已入库，`art-source/first-level-enemy-variants-contact.png` 是游戏尺寸对照。两种敌人的身体轮廓可分，但密集战斗中辨识仍待真人验证。
- 新图片必须将 Cocos `.png.meta` 的 `userData.type` 设为 `sprite-frame` 并生成 `f9941` 子资源；默认导入成 `texture` 时，`resources.load(.../spriteFrame)` 会失败，整层单位图退回 Graphics。现有规则测试覆盖五种基础单位图的导入契约。战场塔图显示不超过格宽 90%，商店图标不跟随缩小。

## 铁罐搬运者候选

- 2026-09-26 使用 OpenAI 内置 image_gen 生成，已有步兵源图仅作**风格参考**，不直接改写。保持铜金/深蓝材质、左上暖光与 3/4 俯视；用宽方锅炉、两侧罐体、短粗活塞腿和小琥珀眼缝与步兵/疾行机区分。生成源图为 1254×1254 透明 PNG，运行时 `sips -Z 128` 归一成 128×128 RGBA、约 25 KiB。完整字段见 `art-source/first-level-units/iron-canister-hauler-manifest.json`。
- Cocos 以 SpriteFrame 导入；战场实际显示 92×92 设计单位，血条/冰环随尺寸同步调整；缺图时整层回退程序化战场，重装用方形而非圆形标识。右侧浏览器已确认第五波进场、旧单位仍显示、完整八波可结算；实际移动截图与首次玩家对密集混编的辨识尚不足，不批准为最终资产。
- 最终提示词：`Use case: stylized-concept. Asset type: original transparent enemy sprite for Nightwatch Tower Defense level one. The supplied clockwork-infantry image is a STYLE REFERENCE only, not the edit target: match its 3/4 top-down camera, painterly toy-mechanical finish, upper-left warm light, polished copper/brass and deep navy enamel palette. Create ONE new heavy enemy called an iron-canister hauler: clearly wider and more square than the infantry, squat large riveted boiler/canister body, broad plated shoulders and thick short pistons for legs, a small recessed amber visor, two visible dark navy side tanks with brass hoops, grounded weighty silhouette. Its body should read as a slow durable threat at approximately 80x80 pixels on a dark rooftop game board, distinct from round-headed infantry and sleek runner. Full body centered in square composition, modest transparent padding, genuinely transparent RGBA background and clean alpha. No scenery, floor, platform, baked shadow, UI, text, labels, border, duplicate characters, weapons, watermark, or cropped edges.`

## 机枪塔分层候选

- 2026-09-26 使用 OpenAI 内置 image_gen，以仓库原始 `art-source/first-level-units/rivet-gun.png` 为**编辑目标**分别生成 `rivet-gun-base-v2.png` 与 `rivet-gun-head-v2.png`；没有改写原图。底座提示词保留铜金铆钉圆盘和深蓝转轴座、移除上部双炮管；炮身提示词保留双炮管、齿轮面板和侧轴，移除大型落地圆盘，底部留转轴插销。两张均要求原有 3/4 俯视、左上光、深蓝/铜金玩具机械材质与透明背景，无文字、场景或新物件。
- 源文件均为 1254×1254 RGBA；运行时分别为 `assets/resources/level-one/units/rivet-gun-base-v2.png`（128×128，约 12 KiB）和 `rivet-gun-head-v2.png`（128×128，约 20 KiB）。`art-source/first-level-units/rivet-gun-layers-v2-contact.png` 是 128 像素对照，完整来源和检查字段见同目录 `rivet-gun-layers-v2-manifest.json`。
- Cocos 通过 SpriteFrame 导入，两个部件以完整透明画布配准并关闭 Sprite 自动裁边；通用 `LayeredTowerRig` 将画布扩大 1.4 倍恢复原塔格内轮廓，机枪炮身相对画布缩至 0.68 倍并略微右移、上移。底座固定在真实塔位，只有炮身消费开火后坐力。商店图标和预览仍沿用原静态图；任一分层图加载失败时，战场塔也退回原静态图，玩法照常运行。
- 右侧 Web Mobile 浏览器在约 377×600 视窗已检查单塔、四塔横墙和第一波；视觉尺寸和遮挡作为候选通过，尚待用户主观评审。头图 alpha 边界含极少透明边缘噪点、旋转炮身及独立枪口帧未制作，因此不标记为最终制作资产。

生成方式：OpenAI 内置 image_gen 的图片编辑模式，输入图均为 `art-source/first-level-units/rivet-gun.png`。最终提示词：

```text
Use case: precise-object-edit. Asset type: production transparent component sprite for the EXISTING Nightwatch Tower Defense rivet-gun. The supplied image is the EDIT TARGET, not merely style inspiration. Create the LOWER STATIONARY BASE ONLY: preserve the original large circular copper/brass riveted base ring and its lower central rotating collar exactly in the same position, size, 3/4 top-down perspective, copper/navy palette, lighting from upper left, and painterly toy-mechanical finish. Remove the upper twin-barrel gun housing, barrels, gear face and side cylinders entirely; reconstruct the small dark metal circular spindle/socket visibly inside the base where the upper assembly rotates. Do not redesign the base or add any new prop. Keep original square composition and transparent RGBA background with clean alpha; object remains centered in the bottom half at same apparent scale. No floor, shadow outside original base, UI, text, border, watermark, or duplicate component.
```

```text
Use case: precise-object-edit. Asset type: production transparent UPPER ROTATING TURRET component sprite paired with a separately extracted stationary base for Nightwatch Tower Defense. The supplied original rivet-gun is the EDIT TARGET. Keep ONLY the upper twin-barrel gun assembly: both navy barrels with brass muzzles, the central angular navy housing with gold gear face, side cylinders and the narrow lower swivel collar. Remove the entire large circular copper/brass riveted floor base ring and any ground shadow. Preserve the upper assembly's exact identity, proportions, original location and apparent scale within the 1254x1254 square, 3/4 top-down camera, painterly toy-mechanical details, upper-left lighting and copper/navy palette. At the bottom, make a clean dark metal swivel peg that can sit over the stationary base's socket; do not add a replacement floor base. Fully transparent RGBA background with clean alpha, no scenery, UI, text, border, watermark, duplicate guns, or cropped edges.
```

## 冷凝塔分层候选

- 2026-09-26 使用 OpenAI 内置 image_gen 图片编辑模式，以仓库原始 `art-source/first-level-units/frost-coil.png` 为编辑目标分别生成固定机架 `frost-coil-base-v2.png` 与青蓝能量芯 `frost-coil-core-v2.png`；原静态塔未改写，继续用于商店、预览及缺图回退。
- 两张源图均为 1254×1254 透明 PNG，运行时用 `sips -Z 128` 归一到 128×128 RGBA，分别约 20 KiB 与 5 KiB。`art-source/first-level-units/frost-coil-layers-v2-contact.png` 是游戏尺寸对照，`frost-coil-layers-v2-manifest.json` 记录来源与验收字段；商业权利复核和玩家主观确认仍待完成。
- `LayeredTowerRig` 复用机枪塔的节点生命周期、SpriteFrame 加载失败回退和完整透明画布配准。冷凝塔机架画布为格内尺寸的 1.4 倍，能量芯宽高为其 0.65 倍并略微上移；命中事件只驱动核心短暂外扩，固定机架、射程和伤害逻辑不变。当前只在战场塔上启用分层，其他入口保留原图。
- 右侧 Web Mobile 浏览器约 377×600 视窗已检查两塔并排、四塔横墙及第一波 6/6 击杀、核心 10/10；控制台 0 error / 0 warning。分层遮挡和小尺寸辨识作为候选通过，脉冲时长与玩家手感仍待主观评审，不能视作最终资产。

生成方式：OpenAI 内置 image_gen 图片编辑模式，输入图均为 `art-source/first-level-units/frost-coil.png`。最终提示词：

```text
Use case: precise-object-edit. Asset type: transparent stationary BASE component sprite for Nightwatch Tower Defense's existing frost-coil defense tower. The supplied frost-coil image is the EDIT TARGET. Preserve the original copper/brass riveted circular floor base, four blue-and-copper support arms, bolts, top golden cap and all exterior mechanical housing in the same composition, exact proportions, same 3/4 top-down viewpoint, original upper-left lighting, painterly toy-mechanical finish. Change ONLY the glowing cyan energy cylinder in the center: remove its cyan glow, bright rings, snowflake pattern and energetic contents, leaving a dark navy transparent-looking EMPTY central chamber/socket behind the support arms, with subdued metal/glass edges so a separate cyan energy-core sprite can be overlaid there. Do not move or redesign any exterior piece. Keep a square 1254x1254 composition, genuinely transparent RGBA background, clean alpha. No floor/scenery, text, UI, border, duplicate tower, or cropped edges.
```

```text
Use case: precise-object-edit. Asset type: transparent ANIMATABLE CYAN ENERGY-CORE insert for the existing frost-coil tower in Nightwatch Tower Defense. The supplied frost-coil image is the EDIT TARGET. Extract ONLY the bright inner cyan glass-energy cylinder with its two glowing horizontal ice rings, soft blue magical light and subtle snowflake patterns from the exact center of the original tower. Remove ALL copper/brass floor base, bolts, four outer support arms, dark blue outer frame, top golden cap, and any scenery; do not include those parts in this sprite. Preserve the core's original narrow cylindrical silhouette, original 3/4 top-down perspective, cyan color and upper-left lighting. Keep it in the SAME position and approximate size inside the original 1254x1254 square canvas (central inner chamber, not an enlarged hero icon), so it can overlay a separate empty-chamber frame sprite. Clean genuinely transparent RGBA outside the core, no floor shadow, text, UI, border, watermark, duplicate cores or cropped glow.
```

## 敌人步态候选

- 2026-09-26 使用 OpenAI 内置 image_gen 图片编辑模式，分别以 `clockwork-infantry.png` 和 `clockwork-runner.png` 原图为编辑目标，制作左右脚交替的 `clockwork-infantry-step-b-v2.png` 与 `clockwork-runner-step-b-v2.png`。原图不变，继续作为 A 帧；疾行机第一次候选腿位几乎未变，因此弃用，入库的是第二次定向编辑的版本。
- 两张源图都是 1254×1254 透明 PNG，运行时以 `sips -Z 128` 归一为 128×128 RGBA，分别约 18 KiB 和 14 KiB。`art-source/first-level-units/clockwork-gait-v2-contact.png` 对照两种敌人的 A/B 帧，`clockwork-gait-v2-manifest.json` 记录来源与审批字段。以 alpha>16 的有效像素检查，上下边界与各自原帧一致；步兵 B 帧外围存在极淡 alpha 噪点，正式资产前仍需修边。
- Cocos 按 SpriteFrame 导入；敌人 Sprite 关闭自动裁边，A/B 共用完整 128 方形画布。`enemyGaitFrame` 从格内进度和生成序号选帧，步兵每格两次步态周期、疾行机三次；暂停、减速与格间交接不引入独立动画时钟。B 帧可选加载，任一 B 帧失败只回退对应敌人的原图，不影响战斗或其他单位切图。
- 浏览器已确认第一至第五波可继续；只读诊断确认两张备用帧均实际加载，第四/五波捕到疾行机同屏画面。但 377×600 单帧截图不能证明玩家实际看到的切帧节奏无抖动，疾行机 `in_engine_reviewed` 暂保留 `false`；两帧步态也不等于正式跑动/受击/死亡全套动作。

2026-09-27 增补铁罐搬运者慢重步候选：以项目自有 `iron-canister-hauler.png` 为 A 帧与唯一编辑目标，`image_gen` 只交换左右前后脚得到 B 帧；1254 方透明原图与完整提示词在 `art-source/first-level-units/iron-canister-hauler-step-b-v1.png`、`iron-canister-hauler-walk-v1/prompt.md`。`character-motion-kit` 将 A/B 统一归一至 128 方 RGBA，产生可复核图集、接触表、预览和检查报告，运行时 B 帧为 `assets/resources/level-one/units/iron-canister-hauler-step-b-v1.png`，约 25 KiB。Cocos 按 SpriteFrame 实际导入，仍用格内进度每格一轮选帧；加载失败只退回重装原图。自动报告提示 B 帧原始边缘有微弱 alpha 像素，128 方有效范围 A `(12,8)-(116,120)`、B `(11,7)-(117,117)`，脚底约 3 像素差异尚需动态/人工修边复核。显式 QA 推荐构筑在右侧浏览器第五波看到重装同屏和 7 名活动敌人，只读诊断 `haulerGaitFrameLoaded=true`，0 error/warn；**这只证明加载与第五波可见，不证明无脚底抖动或正式动作完成**。详情见 `docs/poc/phase-c-heavy-gait-regression.md`。

生成方式：OpenAI 内置 image_gen 图片编辑模式。最终入库的两张 B 帧提示词：

```text
Use case: precise-object-edit. Asset type: alternate WALK CYCLE sprite frame for the existing Nightwatch Tower Defense clockwork-infantry. The supplied image is the EDIT TARGET, not just style inspiration. Keep exactly the same single small copper-and-navy clockwork robot identity: round brass head, two large glowing amber eye lenses, brass winding key behind the upper-right shoulder, navy chest armor with central brass gear, thick riveted arms and boots. Preserve its 3/4 top-down camera, forward facing, painterly toy-mechanical finish, copper/navy palette, upper-left lighting, outer silhouette scale and center position inside the original square canvas. Change ONLY the walking pose: exchange which boot is planted forward and which boot steps back, with a natural small opposite arm swing; keep torso/head/key design and viewpoint unchanged. This should be the complementary next step to the input pose, not a new robot, not a running leap. Exactly one full-body character, same apparent size, same baseline for feet and centered registration as the input, no crop. Genuinely transparent RGBA square background with clean alpha. No floor, environment, shadow outside original, motion trails, text, UI, border, duplicate frames, or watermark.
```

```text
Use case: precise-object-edit. Asset type: SECOND FRAME of a two-frame sprint animation, same clockwork-runner robot as the input. The supplied image is the EDIT TARGET. IMPORTANT required pose change: in the input, the long forward turbine boot extends diagonally DOWN-LEFT toward the lower-left edge while the other turbine leg is folded back on the RIGHT. For this alternate frame, make the RIGHT turbine leg extend diagonally DOWN-RIGHT to be the new foreground leading boot, and bend the LEFT leg up and back behind the torso; visibly exchange the front/back legs. Swing the arms opposite to the leg exchange. Keep the same body and head location, identical brass swept helmet, narrow cyan eye slit, two swept-back fins, navy chest with gold gear, cyan wheel-turbine details, painterly copper/navy materials, original 3/4 top-down view, direction and upper-left light. Same full-body scale, same transparent square canvas center and same ground baseline as the input, no jump or camera rotation. One robot only. Genuinely transparent RGBA outside the robot. No scenery, floor, floor shadow, trails, effects, text, UI, border, duplicate frame or watermark.
```

2026-09-27 补做重装 B 帧的运行时脚底配准：`UnitSpriteRegistration` 仅对**实际显示的** B 帧按 128 方图的 3 像素差作尺寸缩放偏移；B 帧缺失时保持 A 帧原位。重装身体的程序上下弹幅从 2.5 收到 0.6 设计单位，血条/冰环及模拟位置不动。1× 第五波浏览器连续画面中未见明显整身上跳，但密集敌群与减速环会遮挡落脚点；源图仍需人工修边与动态观感审批。

## 后续切图契约

| 类型 | 运行时目标 | 锚点 | 状态 |
|---|---|---|---|
| 机枪塔 | 底座/炮身分层候选已接入；真实开火触发的受限摆头已接入，完整枪口朝向、转轴修边仍待制作 | 底座中心；炮身连接轴约为原 128 方图 `(64,112)`，节点锚点 `(0.5,0.125)` 且零角保留原配准 | 浏览器候选，摆头手感待玩家评审 |
| 冷凝塔 | 固定机架/能量芯分层候选已接入；脉冲时长与最终修边待评审 | 共用透明画布中心，运行时配准 | 浏览器候选 |
| 发条步兵 | A/B 两步态和单次两帧倒地候选已接入；正式版仍需待机/受击、死亡修边及平滑运动评审 | 共用透明画布中心 | 浏览器候选，死亡源图边缘待人工复核 |
| 疾行机 | A/B 两步态候选已接入；正式版仍需跑动多帧/受击/死亡及速度尾迹 | 共用透明画布中心 | 浏览器候选，动态节奏待验 |
| 铁罐搬运者 | A/B 慢重步候选已接入；正式版仍需修边、脚底配准、受击/死亡与动态节奏评审 | 共用 128 方透明画布中心 | 浏览器候选，自动检查需人工复核 |
| 路线标记 | 32×32 可着色箭头，不烘焙到地图 | 中心 | 目前程序绘制 |
| 动态道路 | 石板面/暗槽/铜边/转角/稀疏接缝随当前路径重绘，不能烘焙到静态底图 | 格心连续连接 | 程序化视觉候选已接入；最终材质切图、重复接缝及高密度战斗验色待评审 |
| 敌军入口 | 铜金/深蓝低矮机械舱口，单张透明地标；不得烘焙敌人或固定道路 | `grid.entry` 格心，显示画布下移 0.08 个尺寸 | 浏览器候选，缺图保留原道路与刷怪；密集刷怪可读性待评审 |
| 出口核心 | 铜金/深蓝实体反应炉单图，生命状态继续由程序圆环和数字负责 | `grid.exit` 格心，显示画布上移 0.18 个尺寸 | 浏览器候选，缺图保留原目标；正式受损状态与玩家识别仍待评审 |
| HUD 图标 | 金币、核心、波次、速度；各态独立 | 中心 | 核心生命数字/分格条和出口圆环已程序化接入，正式切图仍待制作 |
| 命中/减速/漏怪 | 独立帧或粒子参数，不能烘焙进角色 | 效果中心 | 目前程序绘制 |

全部动态文字、路径和塔位由代码维护。正式切图入库前需检查透明边缘、实际手机尺寸可读性、锚点、重复格子的接缝与资源预算。

2026-09-27 表现层补充：机枪短暖色行进弹痕与冷凝细青色束线目前均由独立前景 Graphics 绘制，位于单位 Sprite 上、HUD 下；减速圈保持单位后景。它们是程序化候选，不是最终特效切图。若交叉评审认为小屏仍弱，正式弹丸、枪口闪光、命中/受击帧应按独立效果资源切出，不能烘焙到炮塔或角色原图。

2026-09-27 入场卡补充：普通入口预览直接复用 `rivet-gun`、`frost-coil`、`clockwork-infantry` 的现有 SpriteFrame，没有新生成图片；三图异步加载，缺图时保留底卡和名称，不能阻断“开始布防”。这只是首关单位识别候选，正式首页构图与素材权利仍需交叉评审。

2026-09-27 死亡动作补充：发条步兵以原图 A 帧和新增倒地 B 帧组成 0.3 秒内的单次两帧候选；B 帧缺失时继续走原有程序化倒地，详见 `docs/poc/phase-c-infantry-collapse-regression.md`。素材管线仍为 `needs-human-review`，不能按最终切图或完整死亡动画交付。

2026-09-28 四方向动作闸门：先生成朝下四帧代表种子，两版都保留在 `art-source/first-level-units/clockwork-infantry-down-walk-v1/`、`clockwork-infantry-down-walk-v2/`。共享画布加工、离线图集与 1× 深/浅底逐帧检查已完成，但头部/承重脚注册不稳、低 alpha 边缘有触边警告，因此明确拒收，不接入运行时、不批量扩展其他方向；四方向×四帧仍是缺口。完整记录见 `docs/poc/phase-c-walk-candidate-and-record-capacity-review.md`，不能用四张不同姿态或引擎构建成功替代动作验收。

同日后续代表单位比较：改用项目自有参考、Blender 固定机械模型渲染步兵四方向×四帧，全部姿态共用拟合/地面锚点；v2 的 512 方透明图集和布局在 `?unitArt=rig-candidate` 显式入口加载，默认仍保留上述 A/B 图。character-motion-kit 完成 128 方帧/图集/离线预览和无裁边警告检查；原生 1× 四朝向播放与浅底朝下逐帧已观察，Cocos 实际使用朝下/朝右四帧并验证暂停。它关闭的是代表步兵的固定模型生产/接入链路，不是家族动作、美术质感或主观手感验收；材质比原图简洁，候选没有同模型倒地/受击动作。源码模型、版本快照、复现命令和浏览器证据详见 `docs/poc/phase-c-fixed-rig-directional-walk-review.md`，不要把旧拒收改写为通过。

同日死亡衔接增补：候选入口现在有同一个 v2 源模型的四方向×四帧非循环倾倒，原 0.3 秒反馈寿命不变；宽画布按两倍尺寸恢复同一角色比例，地面锚点转换与所有姿态接地已检查，程序下沉/压扁/旋转不再叠加到模型死亡帧。资源解析/加载与纯选帧抽离复用，缺图不切回旧画风。1024 方透明 PNG 185,341 B、解码约4 MiB，仍是 draft；源 rig、逐帧、图集和现实验证边界见 `docs/poc/phase-c-fixed-rig-collapse-review.md`。此项替代候选的简单死亡淡出，默认旧版本仍保留；同模型受击、其他敌人、材质风格和主观手感尚未获批。

2026-09-28 预算档增补：`artBudget=compact` 显式选择同源全画布尺寸候选，步兵行走/死亡格80/160（32帧、锚点/时长/loop不变），主/回退底图768×1365；原高分源与默认档均保留。已统计图像RGBA集合12.19→7.14 MiB，不等于总显存验收。两档405×900真实布防/首波比较和可重复SHA记录见 `docs/poc/phase-c-compact-art-review.md`，独立 `FirstLevelArtProfile` 统一资源选择，不改玩法。仍draft、待画风/小图画质/权利批准，不据此扩正式家族。
