# 夜城防线（Nightwatch Tower Defense）

这是第一关正式制作前的 Phase A 风险 POC。当前只验证三件会推翻方案的事：竖屏自由落塔是否可操作、战斗中改路是否稳定、绕路长度是否足以形成玩法价值。画面采用程序色块，不代表最终美术。

## 本地运行

环境要求：Cocos Creator 3.8.8、Node.js、npm。

```bash
npm install
npm run verify
npm run poc:automated
npm run build:web
npm start
```

浏览器访问 `http://127.0.0.1:4176/`。Cocos 工程入口是 `assets/scenes/Main.scene`。

## 操作

- 顶部三块：切换 9×13、10×14、8×13 候选网格。
- 中下两块：重置、开始运行/回准备态。
- 样例两块：一键加载短折线与长蛇形路径。
- 底部金色炮塔：拖到格子松手提交；或点击炮塔、点格子预览、再点同一格提交。
- 准备态点击已有塔可全额撤销；运行态禁止出售。

## 当前结论

- 自动化规则与 100 次动态改路回放已通过。
- Cocos Web Mobile 发布构建和 390×844 浏览器核心交互走查已通过，控制台 0 error / 0 warning；按钮可读性与统计层遮挡已复验关闭。
- Phase A 自动化与右侧浏览器工程门禁已通过，可继续第一关灰盒开发；首次玩家评审仍需收集。
- Android/iOS 真机测试延后到移动端发布前，不得把“未阻断开发”表述为“真机已通过”。
- 详细证据见 `docs/poc/phase-a-report.md`、`docs/poc/phase-a-browser-regression.md` 与 `docs/validation.md`；交叉评审按 `docs/poc/phase-a-review-checklist.md` 执行。
