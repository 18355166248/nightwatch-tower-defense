# 第一关视觉样板与资产记录

## 方向

夜城屋顶防线：俯视的玩具质感建筑、铜色机械件、青蓝屋顶和暖黄窗光。中央战场保持低对比，路线、敌人、塔与射程由运行时独立叠加。参考《Fieldrunners 2》的信息层级和布塔改路体验，不沿用其美术资产。

当前完成底图和第一组静态单位切图样板。路线、特效和 HUD 仍是程序化表现；单位尚无动作帧和分层，不能称作完整美术落地。

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

- 来源：2026-09-26 使用 OpenAI 内置 image_gen 原创生成；源 PNG 均为 1254×1254 透明图。机枪塔提示词为铜金色、双炮管、俯视 3/4 角度的玩具机械炮塔；冷凝塔为铜色底座、青蓝发光能量芯的同视角机械装置；步兵为铜色发条、青蓝配件的小型机械敌人。均要求单体、透明背景、无文字和场景。
- 规格：使用仓库 `ai-asset-pipeline/src/resize.py --size 128 --square` 缩到 128×128 RGBA；每张运行时约 20 KiB。`art-source/first-level-units-source-contact.png` 和 `art-source/first-level-units-runtime-contact.png` 分别保存源图与缩小后对照。
- 显示：塔在战场使用 108×108 设计坐标、敌人使用 88×88，中心锚点；商店图标 86×86。无碰撞，寻路和索敌仍只使用玩法坐标。Cocos 资源类型固定为 SpriteFrame，启动异步加载；任一单位图未就绪时由原 Graphics 灰盒整体兜底。
- 状态：已在右侧 Web Mobile 浏览器确认两塔商店图标、布塔预览、战场塔和移动步兵可见；仍需分层炮身、待机/移动/受击/死亡动作以及多敌人拥挤时的辨识优化。

## 后续切图契约

| 类型 | 运行时目标 | 锚点 | 状态 |
|---|---|---|---|
| 机枪塔 | 静态样板已接入；正式版底座/炮身/枪口至少分层 | 底部中心 | 分层待制作 |
| 冷凝塔 | 静态样板已接入；正式版底座/能量芯分层 | 底部中心 | 分层待制作 |
| 发条步兵 | 静态样板已接入；正式版至少待机/移动/受击/死亡 | 底部中心 | 动作待制作 |
| 路线标记 | 32×32 可着色箭头，不烘焙到地图 | 中心 | 目前程序绘制 |
| HUD 图标 | 金币、核心、波次、速度；各态独立 | 中心 | 待制作 |
| 命中/减速/漏怪 | 独立帧或粒子参数，不能烘焙进角色 | 效果中心 | 目前程序绘制 |

全部动态文字、路径和塔位由代码维护。正式切图入库前需检查透明边缘、实际手机尺寸可读性、锚点、重复格子的接缝与资源预算。
