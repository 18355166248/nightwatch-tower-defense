# Phase B 横屏安全暂停与失焦输入回归（2026-09-27）

## 实现边界

- `ViewportSafety` 只判定“粗指针 + 横向视口”；桌面宽屏不因此暂停。浏览器 `qa=1&qaCoarse=1` 可模拟粗指针进行回归，默认玩家入口不启用该开关。
- `PauseOverlayRuntime` 增加 `orientation` 原因，与用户暂停、页面隐藏原因叠加；横屏期间所有画布触控被拦截，转回竖屏也必须主动点“继续”。
- 横屏提示使用独立的宽卡片和放大的文字；恢复竖屏后切回普通暂停菜单。画布/浏览器窗口失焦时取消待放置或拖拽预览，不提交购买；监听在场景销毁时成对解除。

## 验证

- `npm run verify`：75 项规则测试通过，包括触控横屏判定、三种暂停原因交错、阻断期间不可继续，以及原有布局和战斗规则。
- `npm run build:web`：Cocos Creator 3.8.8 Web Mobile 发布构建通过；`git diff --check` 通过。
- 右侧浏览器 QA 粗指针、默认 1280×720：第一波刚开时立即进入 `paused`，`runElapsedSeconds=0`、已生成敌人 0、`orientationBlocked=true`、`canContinuePause=false`。点击横屏提示不继续。
- 同一浏览器先切 390×844：`orientationBlocked=false`，但 `phase=paused`、`pauseMenuVisible=true`；点击“继续战斗”后才回到 `spawning`，局内计时和出怪继续。
- 第一波中途再切 844×390：在 `runElapsedSeconds=5.2833`、已生成 7、场上 3、反馈 9 的同一帧进入 `paused`，数值不回退；横屏提示卡在该尺寸下无遮挡。转回 390×844 后显示正常尺寸的暂停菜单。
- 不带 `qaCoarse` 的桌面 QA 1280×720 可正常进入 `spawning`，`orientationBlocked=false`，证明没有把所有横屏浏览器都挡住。最终浏览器无 error/warning。

## 未验证

- 右侧 in-app 浏览器开新标签、切标签及尝试地址栏焦点时，旧 WebView 继续运行且未发出失焦/隐藏事件；因此失焦取消的实际 DOM 回调与系统后台事件尚未得到该容器实证。代码和原因状态测试不能替代真实触控设备验收。
- QA 粗指针开关只模拟 CSS 指针类型，不等于真实手机旋转、系统安全区或 Android 真机表现。按当前要求不做 Android 真机测试。
- 首次玩家无指导理解率、1× 真人中位局长与正式动作素材仍未验收，Phase B 不能宣布完成。
