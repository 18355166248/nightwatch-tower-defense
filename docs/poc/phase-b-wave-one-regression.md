# Phase B 第一波右侧浏览器回归

> 执行时间：2026-09-06  
> 环境：Codex 右侧内嵌浏览器  
> 构建：Cocos Creator 3.8.8 Web Mobile 发布构建，`phase-b-wave-one-1500`

## 本次竖切

只验证第一关第一波的最小战斗闭环：开战门槛、刷怪、路径运动、索敌攻击、击杀回款、暂停恢复与胜利结算。后续波次、正式美术和音效不在本次范围。

## 结果

| 检查项 | 期望 | 实际 | 结论 |
|---|---|---|---|
| 空场开战 | 至少 2 塔，否则拒绝 | `phase=preparing`，提示至少建造 2 塔 | 通过 |
| 短折线准备 | 4 塔且路径至少 +2 | 4 塔，12→16 格 | 通过 |
| 第一波生成 | 8 名敌人按间隔生成 | 生成完成后 `spawningCompleted=true` | 通过 |
| 索敌与击杀 | 稳定索敌并回款 | 8 次击杀，金币 0→32 | 通过 |
| 暂停冻结 | 等待期间波次状态不变 | 1.4 秒前后快照一致 | 通过 |
| 恢复 | 回到暂停前阶段继续推进 | `paused→spawning`，继续出现敌人 | 通过 |
| 胜利结算 | 生成完成且场上清空 | `phase=victory`，核心 10 | 通过 |
| 控制台 | 无错误与警告 | 0 error / 0 warning | 通过 |

最终快照：

```json
{"gridId":"grid-9x13","gold":32,"mapVersion":4,"towerCount":4,"pathLength":16,"phase":"victory","wave":1,"coreHealth":10,"activeEnemyCount":0,"spawningCompleted":true}
```

## 代码边界

- `PhaseBCombatConfig`：敌人、塔和波次冻结配置。
- `EconomyLedger`：建塔消费与击杀回款共用的经济账本。
- `WaveCombatRuntime`：只负责生成、运动、索敌、伤害，并以事件上报击杀/漏怪。
- `BattleStateMachine`：只负责波次阶段、核心生命和胜负。
- `PlacementModel`：只负责落塔事务、流场校验和地图版本。
- `PhaseBDebugInput`：只把浏览器键盘输入映射成调试动作，不承载业务规则。
- `NightwatchPocBootstrap`：Cocos 场景装配、触摸输入适配和程序化渲染。

该拆分保证后续替换正式 HUD、敌人 Sprite 或音效时，不需要改动寻路、经济与战斗规则。

## 未覆盖风险

- 浏览器实战漏怪与失败画面尚未走查；规则层已有漏怪和核心归零测试。
- 当前首波数值用于验证闭环，不代表正式平衡。
- Android/iOS 真机 smoke 与性能测试按项目决策延后到发布前。
