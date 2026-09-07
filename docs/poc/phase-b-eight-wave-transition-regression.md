# Phase B 八波编排与首段过渡回归

> 执行时间：2026-09-07  
> 构建：Cocos Creator 3.8.8 Web Mobile 调试构建，`phase-b-eight-wave-transition-1355`  
> 浏览器：主机 Chrome；右侧内嵌标签已进入不可导航错误页，本轮未把它记录为通过

## 本次范围

本批只建立可复用的多波编排骨架，并打通第一波到第二波的真实运行链路：

- 8 波配置集中维护并在加载时校验连续编号；
- 单波模拟结束后显式交还控制权，不重置整局累计统计；
- 波间等待固定为 8 秒，可自然结束，也可由玩家提前开波；
- 场景入口只负责协调配置、状态机、模拟和表现，不持有波次规则细节。

本批不承诺 8 波已经完成通关平衡，也不加入第二塔种、敌人属性变体或正式美术。

## 当前波次配置

| 波次 | 敌人数 | 生成间隔（秒） |
|---:|---:|---:|
| 1 | 8 | 0.60 |
| 2 | 8 | 0.58 |
| 3 | 10 | 0.56 |
| 4 | 10 | 0.54 |
| 5 | 12 | 0.52 |
| 6 | 12 | 0.50 |
| 7 | 14 | 0.48 |
| 8 | 16 | 0.46 |

数量采用两波一阶的锯齿节奏，间隔逐步缩短。它目前是验证编排和压力增长的灰盒数据，后续必须结合塔种、升级和敌人差异重新平衡。

## 代码边界

| 模块 | 单一职责 |
|---|---|
| `PhaseBCombatConfig` | 提供只读波次数据；保留第一波别名，避免旧调用点复制配置 |
| `WaveCatalog` | 校验并按 1-based 波次号读取配置，不推进时间 |
| `BattleStateMachine` | 决定准备、刷怪、清场、倒计时和胜负阶段，提供提前开波状态迁移 |
| `WaveCombatRuntime` | 模拟当前单波；`completeWave()` 清理单波状态并保留整局累计值 |
| `NightwatchPocBootstrap` | 在阶段切换时协调上述模块，并向 HUD/诊断层发布只读快照 |

## 自动化结果

| 检查项 | 实际 | 结论 |
|---|---|---|
| 波次目录连续性与第一波冻结值 | 8 波连续，第一波仍为 8 人 / 0.60 秒 | 通过 |
| 倒计时提前开波 | 仅 `countdown` 阶段接受，波次加一并进入 `spawning` | 通过 |
| 单波交接 | 清场前拒绝交接；交接后允许启动下一波 | 通过 |
| 累计统计 | 第二波开始后保留第一波生成、击杀与漏怪累计值 | 通过 |
| 规则测试 | 21/21 | 通过 |
| Cocos TypeScript | 无错误 | 通过 |
| Web Mobile 调试构建 | 构建完成 | 通过 |

## 浏览器证据

短折线 fixture 用 4 座塔启动第一波，清场后的诊断快照：

```json
{"phase":"countdown","wave":1,"totalWaves":8,"countdownSeconds":5.1509,"coreHealth":8,"spawnedEnemyCount":8,"defeatedEnemyCount":6,"leakedEnemyCount":2,"resultVisible":false}
```

倒计时期间按 `Space`，1 秒后的诊断快照：

```json
{"phase":"spawning","wave":2,"totalWaves":8,"countdownSeconds":0,"coreHealth":8,"activeEnemyCount":2,"spawnedEnemyCount":10,"defeatedEnemyCount":6,"leakedEnemyCount":2,"resultVisible":false}
```

控制台为 0 error / 0 warning。快照证明第一波不再错误进入胜利、倒计时可见、提前开波生效，且整局累计统计没有被单波交接重置。

## 交叉 Review 重点

- `WaveCatalog` 应继续保持纯配置读取，不加入生成计时、敌人创建或 UI 文案。
- `completeWave()` 只能在“生成结束且场上无活敌”时调用；它不得清空整局 totals 和敌人 ID 序列。
- 自动倒计时与提前开波最终都必须汇入 `startCurrentWave()`，避免两套启动逻辑分叉。
- 独立倒计时/提前开波按钮和 1×/2× 速度控制已在下一批完成，证据见 `phase-b-speed-controls-regression.md`。
- 下一阶段加入第二塔种与敌人变体，最后做第三至第八波完整通关和平衡回归。
