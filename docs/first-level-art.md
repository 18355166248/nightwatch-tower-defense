# 第一关视觉样板与资产记录

## 方向

夜城屋顶防线：俯视的玩具质感建筑、铜色机械件、青蓝屋顶和暖黄窗光。中央战场保持低对比，路线、敌人、塔与射程由运行时独立叠加。参考《Fieldrunners 2》的信息层级和布塔改路体验，不沿用其美术资产。

当前完成底图、三种敌人和两种塔的单位切图、两塔分层，以及步兵/疾行机的第二步态帧候选。路线、特效和 HUD 仍是程序化表现；敌人尚缺完整待机/受击/死亡动作，不能称作完整美术落地。

2026-09-26 地表视觉迭代：战场不再用高不透明度灰蓝格子覆盖底图。`BattlefieldSurfaceView` 从真实路径快照绘制连续的铜边石路，空格仅保留低对比细线，已建塔和布塔预览保持独立色块。因为路线随布塔动态改变，这里选择无贴图接缝的程序化地表，而不是生成固定路线切图；输入命中仍复用 `PhaseBLayout`。右侧浏览器已验证默认画面、布塔预览和落塔，正式路线材质/动效与单位动作资产仍待制作。

2026-09-27 路线预览对照：合法布塔预览中，从当前真实路线与候选路线的格子差集生成旧路斜线、新路实框；格子是否可建仍由原流场和经济事务判断。旧路上被塔位占据的格子不叠斜线，避免与塔预览相互遮挡。非法预览、取消预览、提交后的稳定画面都不保留差集标记。该表现是帮助首次玩家看懂改路的候选程序化效果，不等于已经通过真人理解率或正式路线材质验收。

2026-09-27 等长改路反馈修正：路线文案和提交后 0.9 秒描边按完整格序判断，而不是只比较长度；走向变化但总格数相同时显示“路线改道·长度不变”，真正未变才写“路线不变”。建造、开局撤销和波间出售共享同一展示规则。该反馈是短暂表现，不冻结战斗或输入。

2026-09-26 单位动态过渡：`UnitVisualMotion` 从格内进度生成步伐姿态，疾行机节奏快于步兵；炮塔从只读开火事件获得短暂后坐力。敌人身体与血条/减速提示分层，暂停时姿态不会继续漂移。该做法只为改善当前静态切图的战斗阅读性，仍不等于正式移动/攻击动作帧；后续切图契约保持不变。

2026-09-26 减速状态补强：被冷凝塔减速的敌人持续显示轻青色身体色调及四刻度冰环，强度随剩余时长淡出；Sprite 和灰盒回退共用冰环画法。第二波密集敌群的右侧浏览器候选可辨，但它仍只是程序反馈，不替代正式受击/移动动画资产。

## 第一张正式候选资产

| 字段 | 值 |
|---|---|
| ID | `level-one-backdrop` |
| 用途 | 第一关非交互底图，位于战场 Graphics 下方 |
| 原图 | `art-source/first-level-backdrop-source.png`，941×1672 PNG |
| 运行时 | `assets/resources/level-one/backdrop.jpg`，941×1672 JPEG 82 |
| 来源 | 2026-09-25 OpenAI 内置 image_gen 生成；原始图片在本仓库留档 |
| 显示尺寸 / 锚点 | 1080×1920 设计坐标，中心锚点 |
| 透明 / 碰撞 | 不透明；无碰撞 |
| 拉伸 / 加载 / 降级 | 全屏等比例近似拉伸；启动时本地加载；失败时程序化背景继续运行 |
| 预算 | 单张运行时文件不超过 1 MiB；首屏纹理传输目标 ≤3 MiB |
| 状态 | 浏览器视觉样板；待主观评审和最终资产验收 |

生成提示词要点：原创 9:16 夜城屋顶塔防背景；中央 78% 宽、66% 高保持安静、无格线、无路径、无塔和单位；外缘布置铜管、屋顶、暖光窗和少量机械构件；顶部与底部保留 HUD 安全区；无文字、Logo、界面。光从左上方照入。

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

生成方式：OpenAI 内置 image_gen 图片编辑模式。最终入库的两张 B 帧提示词：

```text
Use case: precise-object-edit. Asset type: alternate WALK CYCLE sprite frame for the existing Nightwatch Tower Defense clockwork-infantry. The supplied image is the EDIT TARGET, not just style inspiration. Keep exactly the same single small copper-and-navy clockwork robot identity: round brass head, two large glowing amber eye lenses, brass winding key behind the upper-right shoulder, navy chest armor with central brass gear, thick riveted arms and boots. Preserve its 3/4 top-down camera, forward facing, painterly toy-mechanical finish, copper/navy palette, upper-left lighting, outer silhouette scale and center position inside the original square canvas. Change ONLY the walking pose: exchange which boot is planted forward and which boot steps back, with a natural small opposite arm swing; keep torso/head/key design and viewpoint unchanged. This should be the complementary next step to the input pose, not a new robot, not a running leap. Exactly one full-body character, same apparent size, same baseline for feet and centered registration as the input, no crop. Genuinely transparent RGBA square background with clean alpha. No floor, environment, shadow outside original, motion trails, text, UI, border, duplicate frames, or watermark.
```

```text
Use case: precise-object-edit. Asset type: SECOND FRAME of a two-frame sprint animation, same clockwork-runner robot as the input. The supplied image is the EDIT TARGET. IMPORTANT required pose change: in the input, the long forward turbine boot extends diagonally DOWN-LEFT toward the lower-left edge while the other turbine leg is folded back on the RIGHT. For this alternate frame, make the RIGHT turbine leg extend diagonally DOWN-RIGHT to be the new foreground leading boot, and bend the LEFT leg up and back behind the torso; visibly exchange the front/back legs. Swing the arms opposite to the leg exchange. Keep the same body and head location, identical brass swept helmet, narrow cyan eye slit, two swept-back fins, navy chest with gold gear, cyan wheel-turbine details, painterly copper/navy materials, original 3/4 top-down view, direction and upper-left light. Same full-body scale, same transparent square canvas center and same ground baseline as the input, no jump or camera rotation. One robot only. Genuinely transparent RGBA outside the robot. No scenery, floor, floor shadow, trails, effects, text, UI, border, duplicate frame or watermark.
```

## 后续切图契约

| 类型 | 运行时目标 | 锚点 | 状态 |
|---|---|---|---|
| 机枪塔 | 底座/炮身分层候选已接入；枪口、瞄准转向与最终修边仍待制作 | 共用透明画布中心，运行时配准 | 浏览器候选 |
| 冷凝塔 | 固定机架/能量芯分层候选已接入；脉冲时长与最终修边待评审 | 共用透明画布中心，运行时配准 | 浏览器候选 |
| 发条步兵 | A/B 两步态候选已接入；正式版仍需待机/受击/死亡及平滑运动评审 | 共用透明画布中心 | 浏览器候选 |
| 疾行机 | A/B 两步态候选已接入；正式版仍需跑动多帧/受击/死亡及速度尾迹 | 共用透明画布中心 | 浏览器候选，动态节奏待验 |
| 路线标记 | 32×32 可着色箭头，不烘焙到地图 | 中心 | 目前程序绘制 |
| HUD 图标 | 金币、核心、波次、速度；各态独立 | 中心 | 核心生命数字/分格条和出口圆环已程序化接入，正式切图仍待制作 |
| 命中/减速/漏怪 | 独立帧或粒子参数，不能烘焙进角色 | 效果中心 | 目前程序绘制 |

全部动态文字、路径和塔位由代码维护。正式切图入库前需检查透明边缘、实际手机尺寸可读性、锚点、重复格子的接缝与资源预算。
