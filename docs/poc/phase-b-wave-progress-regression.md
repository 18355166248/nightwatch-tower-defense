# 第一关波内真实进度回归 · 2026-09-26

## 问题与边界

旧横幅仅写“第一关 · 守住夜城入口”。玩家在混编波的组间暂时看不到敌人时，无法区分“这一波真正清场”与“下一组还未生成”。本轮只补反馈：不改刷怪间隔、敌人血量、经济、波间规则或局长目标。

`WaveCombatRuntime.waveSpawnProgress` 保存本波生成数/总数；全局累计仍在 `totals`，两者不混用。表现层 `FirstLevelWaveBanner` 根据生成数、总数、场上数和战斗阶段生成文案；HUD 的变更签名只在数字变化时更新 Label。`completeWave()` 保留本波数字供结算待命显示，下一波 `start()` 归零，重新部署创建新运行时。

## 验证

- `npm run verify`：52/52，包括单波计数跨波重置、同波两组之间场上 0 但生成未完成时仍显示“已来 1/2 · 场上 0”。
- `npm run build:web`：Cocos Creator 3.8.8 Web Mobile 发布构建成功。
- 右侧浏览器 `http://127.0.0.1:4176/?build=wave-progress-1043`，约 377×600：四塔开局后的首波横幅实际显示“第 1 波 · 已来 1/6 · 场上 1”；同一时点只读画布诊断为 `phase: spawning`、`waveSpawnedEnemyCount: 1`、`waveTotalEnemyCount: 6`、`activeEnemyCount: 1`。首波清场后横幅显示“第 1 波守住 · 下一波待命”；控制台 0 error / 0 warning。

本轮只验证信息准确与当前视口未挤压。是否让首次玩家更容易判断“何时结束、何时继续”仍需无口头指导试玩；局长约 110 秒纯战斗的缺口仍见 `phase-b-duration-baseline.md`。
