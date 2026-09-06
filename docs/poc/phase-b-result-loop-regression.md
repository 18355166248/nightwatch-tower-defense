# Phase B 胜负结算与重新部署回归

> 执行时间：2026-09-06  
> 环境：Codex 右侧内嵌浏览器，344×602 竖屏窗口  
> 构建：Cocos Creator 3.8.8 Web Mobile 发布构建，`phase-b-result-final-1552`

## 范围

验证第一关第一波的终局闭环：胜利结算、失败结算、结算层输入独占，以及从开战检查点重新部署。Android/iOS 真机按当前决策不在本轮范围。

## 结果

| 检查项 | 实际 | 结论 |
|---|---|---|
| 空场路径基线 | 由当前网格空场流场计算，短折线为 `12→16`，`pathDelta=4` | 通过 |
| 胜利结算 | 8 出怪、6 击毁、2 漏怪、核心 `8/10`、金币 24 | 通过 |
| 胜利视觉 | 遮罩、标题、统计与唯一主按钮“重新部署”均可见 | 通过 |
| 重新部署 | 恢复开战前 4 塔、路径 16、金币 0、核心 10；击杀收益不继承 | 通过 |
| 失败结算 | 低核心样例在第 2 次漏怪后进入 `defeat`，核心 `0/2` | 通过 |
| 失败视觉 | 红色语义标题、统计与“重新部署”按钮均可见 | 通过 |
| 结果输入 | 结果层存在时拦截战场和顶部控制输入；`Enter` 已验证恢复检查点 | 通过 |
| 结果按钮触控 | Cocos `TOUCH_START` 命中矩形已实现；内嵌浏览器自动化无法指定 Canvas 内坐标 | 进行中 |
| 发布构建兼容 | `Set` 塔位通过 `Array.from` 捕获，修复 Cocos loose Babel 展开异常 | 通过 |

胜利快照：

```json
{"gold":24,"towerCount":4,"pathLength":16,"pathDelta":4,"phase":"victory","coreHealth":8,"spawnedEnemyCount":8,"defeatedEnemyCount":6,"leakedEnemyCount":2,"resultVisible":true,"retryAvailable":true}
```

失败快照：

```json
{"gold":24,"towerCount":4,"pathLength":16,"pathDelta":4,"phase":"defeat","coreHealth":0,"spawnedEnemyCount":8,"defeatedEnemyCount":6,"leakedEnemyCount":2,"resultVisible":true,"retryAvailable":true}
```

重新部署快照：

```json
{"gold":0,"mapVersion":4,"towerCount":4,"pathLength":16,"pathDelta":4,"phase":"preparing","wave":0,"coreHealth":10,"resultVisible":false,"retryAvailable":false}
```

## 解耦边界

- `BattleResultViewModel` 只把规则快照转成胜败文案，不参与状态推进。
- `BattleRunCheckpoint` 只捕获和恢复开战瞬间的部署与经济。
- `NightwatchPocBootstrap` 只装配终局遮罩、输入路由与运行时切换。

因此后续替换正式结算 Prefab、动画或音效时，不需要改动战斗状态机、经济账本和波次模拟。

## 仍未覆盖

- 正式素材、结算动效、音效、玩家首次理解和发布性能。
- Android/iOS 真机触控与安全区验收延后到移动端发布前。
- “重新部署”按钮的真实指针命中需在右侧浏览器手工点击或发布前真机验收；本轮自动化仅证明同一动作的 `Enter` 路径。
