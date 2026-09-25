# 夜城防线（Nightwatch Tower Defense）

这是《夜城防线》第一关的渐进式竖切。Phase A 已验证自由落塔、动态改路和绕路价值；Phase B 已把刷怪、索敌、攻击、奖励、漏怪、波间倒计时、胜负结算与重新部署接成可玩的闭环。第一关已有原创底图与单位静态切图，HUD 仍以程序绘制为主，不代表最终美术。

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

默认入口会引导用 140 金摆出一段四塔横墙。教学模式每波清场后暂停，玩家可用回款补塔，再点 ▶ 继续；“跳过引导”保留原有自动倒计时。高亮位置是通关参考，不限制自由布塔。

## 操作

- 顶部三块：仅在 `?qa=1` 下切换 9×13、10×14、8×13 候选网格。
- 中下两块：重置、开始运行/回准备态。
- 样例两块：仅在 `?qa=1` 下一键加载短折线与长蛇形路径。
- 底部金色炮塔：拖到格子松手提交；或点击炮塔、点格子预览、再点同一格提交。
- 点击已建塔可持续查看射程和属性；准备态再点同一塔才全额撤销，战斗中再次点击仅关闭查看。
- 右上角可切换音效；网页浏览器需要首次触摸后才能启用发声。
- 浏览器调试快捷键只在 `?qa=1` 下生效：`F` 短折线、`G` 长蛇形、`H` 低核心失败样例、`R` 重置、`Space` 开战/暂停/继续、`X` 切换 1×/2×、`N` 波间提前开波、`Enter` 重新部署。
- 胜利或失败后，点击结算层唯一主按钮“重新部署”，恢复开战前塔位和金币后再次调整。

## 当前结论

- 自动化规则与 100 次动态改路回放已通过。
- Cocos Web Mobile 发布构建和 390×844 浏览器核心交互走查已通过，控制台 0 error / 0 warning；按钮可读性与统计层遮挡已复验关闭。
- Phase A 自动化与右侧浏览器工程门禁已通过，可继续第一关灰盒开发；首次玩家评审仍需收集。
- Phase B 第一波运行时已接入：8 个敌人依次生成，塔按接近出口优先索敌；弹道、命中、死亡、奖励与核心受损反馈均由独立表现层消费事件。短折线当前冻结为 6 杀 2 漏、核心剩余 8。
- Phase B 八波框架已接入：波次由连续编号配置表驱动，波间等待 8 秒，等待期间可提前开波；第一波进入倒计时并提前开启第二波已完成浏览器回归。当前数值只用于验证编排，不代表八波已完成通关平衡。
- Phase B 时间与波间控制已独立：底部速度按钮循环切换 1×/2×，提前开波按钮只在倒计时激活；统一模拟时钟同时驱动敌人、炮塔、战斗反馈和倒计时，长帧先截断再乘倍率。
- Phase B 终局闭环已接入：胜败结算层独占输入，重新部署恢复开战检查点，不继承本轮击杀收益；失败样例以核心 2 验证 2 次漏怪后立即终止。
- Phase B 表现边界已拆分：`PhaseBLayout` 统一输入与绘制坐标，`PhaseBCanvasRenderer` 只消费只读绘制快照，`PhaseBHudView` 管理 HUD/结算节点，`BrowserBattleDiagnostics` 隔离浏览器 QA 快照；战斗规则不依赖这些适配层。
- Android/iOS 真机测试延后到移动端发布前，不得把“未阻断开发”表述为“真机已通过”。
- 详细证据见 `docs/poc/phase-a-report.md`、`docs/poc/phase-a-browser-regression.md`、`docs/poc/phase-b-wave-one-regression.md`、`docs/poc/phase-b-eight-wave-transition-regression.md`、`docs/poc/phase-b-speed-controls-regression.md`、`docs/poc/phase-b-result-loop-regression.md` 与 `docs/validation.md`；交叉评审按 `docs/poc/phase-a-review-checklist.md` 执行。
