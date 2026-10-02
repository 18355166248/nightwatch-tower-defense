# Phase C 重装敌人双帧步态候选（2026-09-27）

## 本轮改动

- 只完善第一关第五波起出现的铁罐搬运者：现有原图继续作为 A 帧，以原图编辑生成左右脚换位的 B 帧；没有使用《Fieldrunners 2》截图或素材。
- `art-source/first-level-units/iron-canister-hauler-walk-v1/` 保留提示词、1254 方 A/B 输入、128 方图集/逐帧/接触表、离线预览、配方、来源与报告。运行时仅接入 B 帧 `assets/resources/level-one/units/iron-canister-hauler-step-b-v1.png`，A 帧路径不变。
- `PhaseBUnitSpriteView` 复用已有可选步态帧加载/回退机制，`UnitVisualMotion` 原有重装每格一轮节奏直接生效；减速、暂停、格间交接不另设动画时钟。`BrowserBattleDiagnostics` 增加只读 `haulerGaitFrameLoaded`，不提供玩法修改入口。

## 核验

- 运行时 B 帧 128×128 RGBA、约 25 KiB，Cocos `.meta` 为 `sprite-frame` 且含 `f9941` 子资源。`npm run verify` 97/97，含三种敌人的选帧连续性和重装资源契约；Web Mobile 发布构建通过，`git diff --check` 通过。
- 右侧浏览器构建 `http://127.0.0.1:4176/?build=phase-c-hauler-gait-2001`：普通入口手动四塔 `140→10` 金、路径 `12→16`、第一波正常开战；只读诊断显示三种敌人的 B 帧均实际加载。自由模式 2× 未赶上波间补塔，第三波漏怪，不作为平衡或完整通关证据。
- 为单独观察重装，另用显式 `?qa=1&qaNaturalCountdown=1` 推荐购买夹具、2× 实际推进到第五波：`wave=5`、`spawned=50`、第五波 9/9 已生成、7 名活动敌人、6 名减速、核心 9/10，画布上可见重装与局部 `×5` 徽标；暂停时只读诊断 `haulerGaitFrameLoaded=true`，控制台 0 error / 0 warn。此 QA 只复用真实购买/战斗规则，不代表普通玩家首次体验。
- 素材检查报告为 `needs-human-review`：B 原图边缘有低 alpha 像素；归一后 A/B 的可见边界分别 `(12,8)-(116,120)` 与 `(11,7)-(117,117)`。128 方接触表看得到左右脚替换，但不能据此认定脚底接触点一致。

## 交叉评审重点与边界

请优先看 `art-source/first-level-units/iron-canister-hauler-walk-v1/bundle/contact-walk.png` 的身份/腿位，再在右侧普通入口体验第五波：重装是否比步兵有重量感、减速和受击时双帧是否突兀、脚底是否跳动、暗色战场下能否认出重装。当前只有两帧和短时静帧观察，未录制逐帧动效或做无指导玩家评审；不批准为最终动画，也不据此认定首关达标或应迁移 Godot。按用户要求不做 Android 真机测试。

## 后续：脚底配准与一倍速复核

- A 帧前脚在 128 方画布约到 y=120，B 帧到 y=117。新增纯函数 `UnitSpriteRegistration.enemySpriteRegistrationY`：只在 B 帧实际加载并显示时将身体按 `-3×显示尺寸/128` 视觉偏移；缺图回退 A 帧偏移严格为零。重装身体原有上下弹幅 2.5→0.6 设计单位，避免图像差与程序弹跳叠加；敌人逻辑位置、血条、冰环、速度、减速和伤害不变。
- `npm run verify` 98/98；新增测试以 A/B 的前脚边界和 92 显示尺寸检查基线一致、缺帧无偏移。Cocos Web Mobile 发布构建和 `git diff --check` 通过。
- 浏览器 `http://127.0.0.1:4176/?qa=1&build=phase-c-hauler-grounding-2013`：QA 推荐构筑逐波真实推进，第一至第三波全灭、第四波漏 1，停在第五波前再切 1× 开波；第五波 9/9 重装已生成、6 名活动、6 名减速、核心 9/10，三种备用帧均显示已加载，控制台 0 error/warn。连续短间隔截图可见重装随路线移动，当前画面没有明显的大幅上下跳；但人群/冰环遮挡且没有逐帧脚点测量，**不能声称已证明无抖动**。
- 本轮属于切图配准的表现层修正。原图 alpha 边缘和人工修边待办仍保留；QA 运行不替代普通入口八波、首次玩家或正式美术验收。
