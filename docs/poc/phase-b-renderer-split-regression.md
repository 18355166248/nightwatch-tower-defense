# Phase B 战场 Renderer 拆分回归

> 执行时间：2026-09-07  
> 环境：Codex 右侧内嵌浏览器  
> 构建：Cocos Creator 3.8.8 Web Mobile 调试构建，`phase-b-renderer-final-1303`

## 目标与边界

将网格、路径、塔、敌人、战斗反馈、控制区和结算遮罩的程序化绘制从 `NightwatchPocBootstrap` 移入 `PhaseBCanvasRenderer`。

Renderer 只允许接收以下只读展示数据：

- 当前网格、塔位、可显示路径和落塔预览；
- 敌人的位置与生命展示字段；
- 短生命周期战斗反馈快照；
- 金币、播放按钮状态和结算视图模型。

Renderer 不接收 `FlowField`、`BattleStateMachine`、`EconomyLedger` 或输入控制器，也不推进任何玩法状态。`NightwatchPocBootstrap` 从 793 行降到约 500 行。

## 验证结果

| 检查项 | 实际 | 结论 |
|---|---|---|
| 规则与纯表现工具测试 | 19/19 | 通过 |
| Cocos TypeScript | 无错误 | 通过 |
| Web Mobile 调试构建 | 构建完成 | 通过 |
| 初始画板 | 9×13、金币 120、路径 12 | 通过 |
| 短折线 fixture | 4 塔、路径 16、`pathDelta=4` | 通过 |
| 战斗画面 | 路径、塔、敌人和生命条正常 | 通过 |
| 胜利冻结值 | 8 生成、6 击毁、2 漏怪、核心 8、金币 24 | 通过 |
| 结算画面 | 遮罩、标题、统计、重新部署按钮正常 | 通过 |
| 浏览器控制台 | 0 error / 0 warning | 通过 |

最终快照：

```json
{"gold":24,"towerCount":4,"pathLength":16,"phase":"victory","wave":1,"coreHealth":8,"spawnedEnemyCount":8,"defeatedEnemyCount":6,"leakedEnemyCount":2,"resultVisible":true,"retryAvailable":true}
```

## Review 提示

- `PhaseBCanvasRenderState` 是后续 Sprite/Prefab Renderer 的替换契约，新增玩法字段前先判断是否真为展示所需。
- HUD 仍在每帧接收快照；后续接完整波次时应增加脏标记或事件桥，避免正式 UI 继续轮询。
- 本提交不改变第一波配置、伤害、寻路、经济或触控语义。
