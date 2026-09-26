# Phase B 敌人 A/B 步态候选回归（2026-09-26）

## 本轮范围

- 以现有发条步兵和疾行机透明原图作为 A 帧，各编辑出一张左右腿互换的 B 帧；保留原图、身份特征、视角与画布。
- 表现层按格内位置和生成序号选帧，Sprite 使用完整画布配准。B 帧是可选资源，缺图退回对应原图；寻路、伤害、减速与波次配置未变。

## 验证

- 源图 1254×1254 透明 PNG；运行时两张均为 128×128 RGBA，分别小于 32 KiB；Cocos `.meta` 为 SpriteFrame 并含 `f9941` 子资源。128 像素接触表见 `art-source/first-level-units/clockwork-gait-v2-contact.png`。
- alpha>16 的有效像素上下边界：步兵 A/B 均为 y=12..116，疾行机 A/B 均为 y=11..117；步兵 B 的 alpha>0 触到画布边缘，属于极淡边缘噪点，正式制作仍需修边。
- `npm run verify`：49/49 通过，含切帧周期、暂停重复输入、格间交接、透明资源和导入契约。
- `npm run build:web`：Web Mobile 发布构建成功。
- 右侧浏览器约 377×600：候选构建从任务卡与四塔开局连续走到第五波，疾行机群出场时角色可见，控制台 0 error / 0 warning；四塔未补强导致第五波核心失守，属于该构筑的玩法结果。最终构建 `http://127.0.0.1:4176/?build=enemy-gait-final-0954` 复核第一波 6/6 击杀、核心 10/10、控制台 0 error / 0 warning。
- `http://127.0.0.1:4176/?build=enemy-gait-diagnostic-1011` 的只读画布诊断直接返回 `infantryGaitFrameLoaded: true`、`runnerGaitFrameLoaded: true`；同一构建首波 `spawned: 6`、`killed: 6`、`leaked: 0`、`core: 10`，控制台 0 error / 0 warning。这证明备用 SpriteFrame 在浏览器实际加载，不把构建收录误当成加载成功。

## 尚未证明

- 单张浏览器截图和资源加载诊断不能证明 A/B 动态切换的节奏、脚底是否完全无抖动，也不能替代真人在实际游戏尺寸下的主观评审。尤其疾行机仍待动态视觉确认；不得标为最终动画。
- 仍缺正式待机、受击、死亡动作，以及 Android 真机和发布性能验收；本轮按用户要求只用右侧浏览器测试。
