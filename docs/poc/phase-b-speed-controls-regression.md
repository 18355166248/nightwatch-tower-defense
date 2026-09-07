# Phase B 速度与波间控件回归

> 执行时间：2026-09-07  
> 环境：Codex 右侧内嵌浏览器  
> 构建：Cocos Creator 3.8.8 Web Mobile 调试构建；完整流程 `phase-b-speed-controls-1450`，最终冒烟 `phase-b-speed-controls-final-1452`

## 目标与边界

把灰盒中的“暂停”和“提前开波”拆成不同动作，并增加 1×/2× 时间倍率：

- 播放按钮与 `Space` 只负责开战、暂停和继续；
- 右下按钮与 `N` 只负责倒计时期间提前开波，其他阶段拒绝；
- 左下按钮与 `X` 循环切换 1×/2×；
- 统一模拟时钟同时驱动波间倒计时、刷怪、移动、攻击和反馈生命周期；
- 速度按钮、塔按钮和提前开波按钮的触控矩形互不重叠。

## 代码边界

| 模块 | 职责 |
|---|---|
| `SimulationClock` | 校验支持倍率、循环切速、限制真实长帧并生成游戏时间 |
| `PhaseBDebugInput` | 将 `X`/`N` 翻译为命名动作，不调用状态机 |
| `PhaseBLayout` | 集中维护三个底部控件的输入矩形 |
| `PhaseBCanvasRenderer` | 只根据快照绘制按钮启用态 |
| `PhaseBHudView` | 显示倍率与倒计时，按展示签名跳过无变化的 Label 写入 |
| `NightwatchPocBootstrap` | 协调动作与系统；不自行计算时间倍率 |

## 自动化与构建

| 检查项 | 实际 | 结论 |
|---|---|---|
| 模拟时钟倍率 | 1× → 2× → 1× | 通过 |
| 2× 时间换算 | 0.02 秒真实时间 → 0.04 秒游戏时间 | 通过 |
| 长帧保护 | 3 秒真实长帧在 2× 下只推进 0.10 秒 | 通过 |
| 触控区域 | 左速度 / 中炮塔 / 右提前开波互不重叠 | 通过 |
| 规则测试 | 22/22 | 通过 |
| Cocos TypeScript | 无错误 | 通过 |
| Web Mobile 调试构建 | 构建完成 | 通过 |

## 右侧浏览器证据

初始状态显示 `speedMultiplier=1`，按 `X` 后：

```json
{"phase":"preparing","speedMultiplier":2,"canStartNextWaveEarly":false,"status":"游戏速度已切换为 2×"}
```

2× 下第一波清场后，底部右侧按钮转为绿色激活态：

```json
{"phase":"countdown","wave":1,"countdownSeconds":7.2018,"speedMultiplier":2,"canStartNextWaveEarly":true,"coreHealth":8,"spawnedEnemyCount":8,"defeatedEnemyCount":6,"leakedEnemyCount":2}
```

连续两次采样间隔约 0.5 秒，倒计时从 `7.4666` 降到 `6.4354`，推进约 `1.0312` 秒游戏时间，符合 2× 预期。倒计时中按 `N` 后进入下一波，`countdownSeconds=0`、`canStartNextWaveEarly=false`，整局累计统计继续增长。控制台 0 error / 0 warning。

最终构建增加 HUD 变更签名和无障碍语义后重新发布；右侧浏览器复验初始 1×、`X` 切换 2× 和控制台状态，结果仍为 0 error / 0 warning。

## Review 提示

- 所有需要受速度影响的玩法系统应只消费 `SimulationClock.gameDeltaSeconds()`，不得各自读取真实帧时间再乘倍率。
- 页面隐藏仍由战斗状态机暂停；长帧上限是额外兜底，不能替代生命周期暂停。
- 提前开波必须通过 `BattleStateMachine.startNextWaveEarly()`，不能直接修改波次号或启动生成器。
- 当前倍率不跨页面持久化；在单局重置和重新部署时保留，刷新页面后恢复 1×。
- 这批完成的是灰盒可用性和输入边界，正式按钮图标、按压反馈与音效留到视觉资产阶段。
