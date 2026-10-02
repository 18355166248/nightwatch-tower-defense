# Phase C 发条步兵倒地双帧候选（2026-09-27）

## 范围与实现

- 只为首关发条步兵补一个死亡倒地 B 帧。第一帧沿用项目原图，第二帧以原图为唯一参考生成；没有使用《Fieldrunners 2》截图或切图。原图、完整提示词、配方、128 方逐帧、图集、接触表和来源报告保留在 `art-source/first-level-units/clockwork-infantry-collapse-v1/`；管线登记见工作区 `ai-asset-pipeline/assets-manifest.json` 的同名 draft 条目。
- 运行时仅新增 `assets/resources/level-one/units/clockwork-infantry-collapse-v1.png` 这一张 B 帧 SpriteFrame。`UnitVisualMotion` 的纯函数按死亡剩余时长选择 A/B：前 0.133 秒为原图，后段为倒地图，非循环。`PhaseBUnitSpriteView` 可选异步加载 B 帧；缺图时继续使用原图和原有程序化倒地姿态，不影响战斗、伤害或结算。已加载时不叠加旧的纵向压缩和倾斜，避免把绘制好的倒地动作再次变形。
- `BrowserBattleDiagnostics` 仅增加 `infantryDeathFrameLoaded` 与 `activeInfantryCollapseCount` 两个只读观察字段，不提供改变玩法的入口。

## 已做核验

- 资产处理报告为 `needs-human-review`：第二帧的源图有微弱透明像素触边警告；128 方有效主体边界 A 为 `(23,9)-(109,118)`，B 为 `(28,26)-(108,117)`。接触表能看出低头屈腿、身份和朝向大致一致，但边界检查不等于脚点或动态质量验收。
- `npm run verify` 99/99、`git diff --check`、Cocos Creator 3.8.8 Web Mobile 构建通过；B 帧作为 `sprite-frame` 导入。纯逻辑测试覆盖步兵选帧时序与旧姿态回退。
- 右侧浏览器 `http://127.0.0.1:4176/?qa=1&build=phase-c-infantry-death-trace-2131` 使用显式 QA 推荐构筑、1× 第一波实战：`infantryDeathFrameLoaded=true`，首杀时 `activeInfantryCollapseCount=1`；第一波 9/9 击毁、0 漏、核心 10/10、54 金，控制台 0 error/warn。QA 仅用于可重复观察，非普通入口玩家体验。

## 交叉评审与边界

请先看 `art-source/first-level-units/clockwork-infantry-collapse-v1/bundle/contact-death.png`，再在普通入口观察实战：死亡前后身份是否连续、脚底是否滑移、倒地是否能在小屏战场上辨认、密集敌群是否过于闪烁。当前浏览器的只读计数证明 B 帧被加载并进入显示期；小尺寸截图和两帧接触表不能证明动态手感，尚无单独保存的游戏内动效证据，因此资产清单 `runtimeEvidence` 保持空、发布状态保持 draft。正式视觉/商业权利、完整当前构建八波和至少 5 名无指导首次玩家仍未验收。按用户要求不做 Android 真机测试；本候选不足以决定是否迁移引擎。

## 后续：同构建 QA 完整八波复验

- 同一发布构建 `phase-c-infantry-collapse-final-2131`，右侧浏览器独立测试页使用显式 `?qa=1&qaNaturalCountdown=1`、推荐真实购买和 2× 速度。第六波进行中累计 93 生成、78 击毁、漏 1、核心 9/10；第八波截图可见上方路线的两组 `×6` 敌群、局部冰环和下段塔位，交火仍明显集中在上半屏。
- 最终诊断 `phase=victory`、213 生成、212 击毁、漏 1、核心 9/10、348 金、10 塔、两座塔已升级、局内 `470.15s`、活动敌人 0、活动反馈 0。胜利卡显示 07:50、10 建塔和 4 次升级；“两座已升级塔”与“4 次升级操作”不是同一个计数。浏览器控制台 0 error/warn。
- 这补齐上文“当前构建未完整跑八波”的 **QA 自动推荐构筑** 缺口，不补齐普通入口 1× 熟练作者操作，更不补齐 5 名无指导首次玩家、正式动作观感和素材权利。第八波画面里单位仍偏小、路线外大面积地表较空，值得下一轮对照参考图专项做视觉节奏评审；两帧倒地在群战连续观看中的辨识度依旧不能由终局数字推断。按用户要求不做 Android 真机测试。
