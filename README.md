# 夜城防线（Nightwatch Tower Defense）

这是《夜城防线》第一关的渐进式竖切。Phase A 已验证自由落塔、动态改路和绕路价值；Phase B 已把刷怪、索敌、攻击、奖励、漏怪、波间倒计时、胜负结算与重新部署接成可玩的闭环。第一关已有原创底图（中央石板提亮 v2 为浏览器候选，v1 留作回退）、单位静态切图和四枚 HUD 图标候选，其余 HUD 饰面仍以程序绘制为主，不代表最终美术。

## 本地运行

环境要求：Cocos Creator 3.8.8、Node.js、npm。

```bash
npm install
npm run verify
npm run poc:automated
npm run build:web
npm start
```

浏览器访问 `http://127.0.0.1:4176/` 查看第一关；添加 `?qa=1` 可显示测试地图和样例控件。Cocos 工程入口是 `assets/scenes/Main.scene`。

四方向步兵动作比较入口：`http://127.0.0.1:4176/?unitArt=rig-candidate&build=phase-c-directional-walk-review`。同一固定模型渲染 16 帧，只替换步兵；去掉参数恢复默认 A/B 美术。源模型、切图、验证和待评审项见 [本地 review](docs/poc/phase-c-fixed-rig-directional-walk-review.md)。这仍是视觉候选，游戏引擎未迁移。

同模型单次倾倒已加入该候选入口：另 16 帧、0.3 秒内播放，不放大角色、不叠加旧程序压扁，缺图沿用最后行走帧。当前动作/资源复用及验证见 [死亡衔接 review](docs/poc/phase-c-fixed-rig-collapse-review.md)，正式视觉与整局玩家验收仍待完成。

血条整理前的同模型候选已在普通教学入口真实点按、全程1×完成八波：212/213、核心9/10、06:54，重开恢复初始四塔。逐波扣费、结算清理、截图及视觉缺口见 [普通整局review](docs/poc/phase-c-normal-one-x-final-run-review.md)；不直接作为后续改动构建的整局验收，也不替代无指导首次玩家。

最新版本按脚下地面排序角色，受伤血条独立绘制并局部避让；不隐藏真实血量、不改战斗。密集波采样及同构建QA八波见 [血条与遮挡review](docs/poc/phase-c-health-layer-review.md)。普通试玩地址：`http://127.0.0.1:4176/?unitArt=rig-candidate&build=phase-c-health-layer-review`。

完整目标差距与后续顺序见 [首关完成度审计](docs/poc/first-level-completion-audit-2026-09-28.md)。新增 `npm run report:assets -- --out docs/poc/phase-c-asset-budget.json`：当前候选已统计图像RGBA估算 **12.19 MiB，超过8 MiB门槛，报告退出码1**；不是游戏运行故障。先收敛代表素材预算与画风，再扩敌人家族，不将规则测试或文件压缩体积当作精制验收。

新增低占用比较：`http://127.0.0.1:4176/?unitArt=rig-candidate&artBudget=compact&build=phase-c-budget-review-v1`。全部32帧、锚点和动作时序保留，已统计图像集合降至7.14 MiB；`npm run report:assets -- --profile compact` 单独校验此档，仍计入两档整包。普通1×首波、同尺寸对照、来源与限制见 [尺寸候选review](docs/poc/phase-c-compact-art-review.md)。默认未切换，完整GPU/首屏及用户画质批准仍待验证。

实际GFX计数补充：compact首页仍25.96 MiB；显式加 `renderBudget=small-atlas` 后降到10.96 MiB，首页批次同为35。只限制动态合图，不再缩图、不改默认；首波后12.25 MiB，**实际总纹理仍未满足8 MiB**。独立计数、同视口对照、退回与验证见 [渲染预算review](docs/poc/phase-c-render-budget-review.md)。

后续生命周期修复：同状态初始布防额外释放首页文字1.47 MiB，设置关闭实际释放约1.60 MiB；首页/暂停共用独立可见资源模块。此前首波与暂停/取消/继续/返回、浏览器横屏安全提示见 [视图生命周期review](docs/poc/phase-c-view-lifecycle-review.md)。临时HUD普通1×首波后再减少约300 KiB，见 [HUD生命周期review](docs/poc/phase-c-hud-lifecycle-review.md)。1303构建修复320px首页/声音/跳过/引导裁切，完整棋盘使用共享安全宽度，普通1×首波与外列真实落塔、撤销、升级通过，见 [响应式布局review](docs/poc/phase-c-responsive-entry-review.md)。历史1312试玩构建 `phase-c-crowd-spacing-1312`：有界脚点避让独立于战斗/寻路，暂停和尸影位置保持；165项、实际极窄屏QA八波/重开与普通1×首波通过。密集身体遮挡与最低逻辑队距仍未关闭、纹理预算仍超8MiB；见 [密集群review](docs/poc/phase-c-crowd-spacing-review.md)，未宣布首关完成。

默认入口会引导用 140 金摆出上路改道与中段火力组成的四塔防线。教学模式每波清场后暂停，玩家可用回款补塔，再点底栏“开始下一波”继续；“跳过引导”保留原有自动倒计时。高亮位置是通关参考，不限制自由布塔。

## 操作

- 顶部三块：仅在 `?qa=1` 下切换 9×13、10×14、8×13 候选网格。
- 中下两块：重置、开始运行/回准备态。
- 样例两块：仅在 `?qa=1` 下一键加载短折线与长蛇形路径。
- 底部金色炮塔：拖到格子松手提交；或点击炮塔、点格子预览、再点同一格提交。
- 点击已建塔可持续查看射程和属性；准备态再点同一塔才全额撤销，战斗中再次点击仅关闭查看。
- 右上角“声音”统一切换音乐与音效；网页浏览器需要首次触摸后才能启用发声。布防与前四波使用夜城基础循环，第五波起在音乐小节边界加入机械节奏，2× 不加快音乐；暂停保留播放位置，重开重新起句。当前音色与 40 秒双层 BGM 仍是原创程序合成试听候选。
- 浏览器调试快捷键只在 `?qa=1` 下生效：`F` 短折线、`G` 长蛇形、`H` 低核心失败样例、`R` 重置、`Space` 开战/暂停/继续、`X` 切换 1×/2×、`N` 波间提前开波、`Enter` 重新部署。
- 胜利或失败后，点击结算层唯一主按钮“重新部署”，恢复开战前塔位和金币后再次调整。

## 当前结论

- 最新试玩 `phase-c-route-guard-1342`：在双列基础上增加独立路线看门狗、成功事务/格心尾迹与占格版本，异常暂停只能重新部署或首页，不静默删敌。188项通过、正常八波规则回放与逐边重建通过；右侧320×900控制故障的冻结/无法继续/真实重试/首页已验。正常八波及边界见 [路线保护review](docs/poc/phase-c-route-diagnostics-review.md)。1326及以前均保留为历史，正式美术/显存/性能/真人门禁仍开放。
- 同一1342实际QA自然波间八波212/213、核心9/348金、461.7333秒，无路线误报；1822事件及11占格版本与规则尾迹非时间字段顺序一致。普通真实1×首波9杀0漏、24.55秒；升级/补右上塔后留第二波待命。不是无指导玩家、普通1×全局或三局性能通过。
- 1326阶段试玩构建 `phase-c-two-lane-1326`：双路队伍、同列最小0.7格、入口满时等待、安全超越，复用既有寻路/经济；176项通过。实际320×900 QA八波212/213、漏1/核心9/348金、461.7333秒及重开保持规则通过；普通1×真实四塔首波9杀0漏、24.55秒，升级并补右上机枪后留在第二波准备。旧1312记录保留为历史，最新review见 [双路队距review](docs/poc/phase-c-two-lane-traffic-review.md)。无进度诊断/事件日志、正式美术/设计批准、GFX8MiB、三局压力、普通1×全局和五名首次玩家仍待验，不宣布首关完成。
- 2026-09-28 普通入口仍保留 A/B 动作；低生命测试的最佳核心分母已修正。先前逐帧生图种子拒收，新增固定模型四方向×四帧在显式候选入口可玩，材质/动态手感与其余敌人家族尚未通过正式评审。新记录见 `docs/poc/phase-c-fixed-rig-directional-walk-review.md`，历史拒收记录仍保留。
- 自动化规则与 100 次动态改路回放已通过。
- Cocos Web Mobile 发布构建和右侧浏览器核心交互走查已通过；自动化与作者操作不是首次玩家验收。
- Phase A 自动化与右侧浏览器工程门禁已通过，可继续第一关灰盒开发；首次玩家评审仍需收集。
- Phase B 教学前两波各生成 9 个敌人；当前双段推荐开局前两波均零漏，第 4 波有一次核心损失压力。塔按接近出口优先索敌；弹道、命中、死亡、奖励与核心受损反馈由独立表现层消费事件。
- Phase B 八波由连续编号配置表驱动；教学波间可不限时补塔，点底栏“开始下一波”直接开波，跳过教学后仍使用 8 秒自动倒计时。旧移动规则历史10塔双段构筑由作者1×及波前预告构建2×完成八波，均为212/213、核心9/10、战斗6分54秒，加七次自然波间约7分50秒；记录见 `docs/poc/phase-c-pivot-final-eight-wave-regression.md` 与 `docs/poc/phase-c-dense-wave-briefing-regression.md`。最新双列时长见上条，不把历史全局或作者操作当无指导新玩家验收。
- 战斗横幅实时显示本波已生成/总数和场上敌人数；分组之间暂时清屏不会误报清场，真实结算后才显示下一波待命。
- 底部速度按钮循环切换 1×/2×；统一模拟时钟以固定 60 Hz 步进驱动敌人、炮塔、战斗反馈和倒计时，长帧先限制再乘倍率。完整八波回放在 20/30/60 FPS 输入与 2× 下逐波一致。
- Phase B 终局闭环已接入：胜败结算层独占输入，重新部署恢复开战检查点，不继承本轮击杀收益；失败样例以核心 2 验证 2 次漏怪后立即终止。
- Phase B 表现边界已拆分：`PhaseBLayout` 统一输入与绘制坐标，`PhaseBCanvasRenderer` 只消费只读绘制快照，`CombatFeedbackView` 独立绘制开火、命中与死亡等短特效，`PhaseBHudView` 管理 HUD/结算节点，`CoreObjectiveView` 显示出口核心状态，`BrowserBattleDiagnostics` 隔离浏览器 QA 快照；战斗规则不依赖这些适配层。
- 按当前范围先在右侧浏览器验证；不做 Android 真机测试，也不得把“未阻断开发”表述为“真机已通过”。
- 当前证据先看 `docs/validation.md`、`docs/poc/phase-b-fixed-step-regression.md` 与 `docs/poc/phase-b-core-objective-regression.md`；历史阶段记录仍保留在 `docs/poc/`。Phase A 交叉评审按 `docs/poc/phase-a-review-checklist.md` 执行。
