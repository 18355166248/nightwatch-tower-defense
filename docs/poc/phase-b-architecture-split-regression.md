# Phase B 表现边界拆分回归

> 执行时间：2026-09-07  
> 环境：Codex 右侧内嵌浏览器  
> 构建：Cocos Creator 3.8.8 Web Mobile 调试构建，`phase-b-structure-split-1600`

## 目标

在扩展 8 波、第二塔种和敌人变体前，先把程序化灰盒中可复用的表现边界从 `NightwatchPocBootstrap` 拆出，同时保持第一波行为与冻结数值不变。

## 新边界

| 模块 | 单一职责 | 不允许承担 |
|---|---|---|
| `PhaseBLayout` | 设计分辨率、控制矩形、网格尺寸与坐标换算 | 输入状态、战斗规则、Cocos 节点 |
| `PhaseBHudView` | HUD/帮助/结算 Label 生命周期与文案呈现 | 胜负判断、经济结算、触摸路由 |
| `BrowserBattleDiagnostics` | 将只读快照发布到 Canvas 属性供 QA 读取 | 调试写接口、规则推进、画面绘制 |
| `NightwatchPocBootstrap` | 场景装配、输入路由、运行时协作 | 重复实现 HUD 与坐标规则 |

## 自动化结果

- Cocos 工程 TypeScript：通过。
- 规则测试：19/19 通过。
- 新增布局往返测试：9×13 全部 117 个单元格的“中心点→输入格”映射一致；画板外坐标拒绝。
- Web Mobile 调试构建：通过。

## 右侧浏览器回归

| 检查项 | 结果 | 结论 |
|---|---|---|
| 初始 HUD 与画板 | 9×13、金币 120、路径 12、准备态正常显示 | 通过 |
| 短折线 fixture | 4 塔、路径 16、`pathDelta=4` | 通过 |
| 第一波中段 | `phase=spawning`，已生成 2、场上 2 | 通过 |
| 胜利冻结值 | 8 生成、6 击毁、2 漏怪、核心 8、金币 24 | 通过 |
| 结算视觉 | 遮罩、统计与“重新部署”正常显示 | 通过 |
| 重新部署 | 恢复 4 塔、金币 0、路径 16、核心 10 | 通过 |

胜利快照：

```json
{"gold":24,"towerCount":4,"pathLength":16,"phase":"victory","wave":1,"coreHealth":8,"spawnedEnemyCount":8,"defeatedEnemyCount":6,"leakedEnemyCount":2,"resultVisible":true,"retryAvailable":true}
```

重新部署快照：

```json
{"gold":0,"towerCount":4,"pathLength":16,"phase":"preparing","wave":0,"coreHealth":10,"resultVisible":false,"retryAvailable":false}
```

## 下一步

下一批先把剩余程序化绘制从 Bootstrap 抽成战场 Renderer，再接入配置驱动的 8 波编排。重构与波次规则分两个提交，便于交叉 Review 和回归定位。
