# 首关敌人血条按受伤显隐（2026-09-27）

## 对齐目标与实现

- 总方案 §4.3 要求“敌人短暂闪白，受伤后才显示血条”。旧实现把绿色满血条画在每一名敌人头顶；第八波密集敌群的细横线压住单位轮廓，也占用了原方案留给合法建造和减速的绿色语义。
- 新增纯函数 `EnemyHealthIndicator.enemyHealthBarRatio`，仅对生命在 `(0, maxHealth)` 内的敌人返回比例。Sprite 切图层和 Graphics 灰盒回退层复用同一规则；生命为满、零、负数或非法数值时不画血条。受伤后的填充色改为中性暖白，保留暗色底轨。逻辑生命、伤害、索敌、减速、计数均不改动。
- 浏览器只读诊断 `visibleEnemyHealthBarCount` 与该纯函数同源，用于把“场上敌人数”和“应出现血条数”区分开；它不提供修改玩法的入口。

## 回归证据

- `npm run verify` 100/100（含满血、受伤、重装低血量、死亡和无效值），`git diff --check` 与 Cocos Creator 3.8.8 Web Mobile 发布构建通过。
- 右侧浏览器显式 QA 推荐四塔、1× 首波：刚生成第 1 只敌人时诊断 `activeEnemyCount=1`、`visibleEnemyHealthBarCount=0`；受击后的一个实战快照 `activeEnemyCount=3`、`visibleEnemyHealthBarCount=3`，画面可见淡暖白血条。最终边界修正构建 `phase-c-injury-bars-final-2155` 再次跑完首波，9/9 击毁、0 漏、核心 10/10、54 金，敌人和血条均归零，控制台 0 error/warn。普通玩家入口：`http://127.0.0.1:4176/?build=phase-c-injury-bars-final-2155`，首页三卡正常加载。

## 边界与下一步

本次只减少满血常驻信息噪声。仍需在当前最终构建的第八波、普通入口与多个视口主观比较轮廓和血条可读性；浏览器定点 QA 不是 5 名无指导首次玩家，也不能证明战场空白比例或正式美术已达标。按用户要求不做 Android 真机测试。
