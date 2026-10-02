# 金币 HUD 切图种子：引擎内验证

日期：2026-09-27。设计稿与来源见 `phase-c-hud-direction-v1.md`，逐项资产信息见 `art-source/first-level-hud/gold-coins-v2-manifest.json`。这是一枚候选图标的切图—导入—实景链路，不代表 HUD 全套资产通过。

- 原图：`art-source/first-level-hud/gold-coins-source-v2.png`；运行时：`assets/resources/level-one/ui/gold-coins.png`，128×128 RGBA，23,499 B。资产报告确认 alpha 最小 0、最大 255，透明像素 8,050，非透明内容边界 `(7,15)–(121,118)`，无尺寸/alpha 报错。
- 导入：第一次 Creator 导为普通 Texture，`resources.load(.../spriteFrame)` 不可用；将 PNG `.meta` 的 `userData.type` 设为 `sprite-frame` 后重建，生成 `f9941` 子资源。88 项规则测试覆盖图片尺寸、色彩类型、预算和导入契约，并覆盖切图未就绪时完整“金币 N”文字回退。
- 表现：`HudResourceIconView` 只管理图片加载、卡片内定位和显隐；`PhaseBHudView` 继续持有动态金币数值。资源卡与标签仍由 `PhaseBLayout` 共用安全宽度。图标加载失败时隐藏图片、保留原有完整文字；资源数值/消费逻辑不依赖图片。
- 右侧浏览器：Web Mobile 发布构建 `http://127.0.0.1:4176/?build=phase-c-gold-icon-seed-1241`，默认窗口及临时 360×780、430×932 视口均见图标与数字同卡，未见遮挡。430×932 下点机枪塔、同格两次确认后，金币 140→110、机枪 0→1；图标保持可见，浏览器 0 error/warn。临时视口已恢复默认。纯文字回退函数抽离后重建最终包 `http://127.0.0.1:4176/?build=phase-c-gold-icon-final-1243`，再次确认初始金币卡与浏览器 0 error/warn；落塔检查来自前一构建，最终改动不涉及交易或输入。最终试玩页已保留。
- 尚未证明：缺图/损坏图在发布包中实际触发回退、真实设备字体和物理点击尺寸、至少 5 名新玩家可读性、商业权利、持续性能。剩余三种资源图标与 UI 底框尚未批量制作；先等方向与本图主观评审。
- 本轮按用户要求不进行 Android 真机测试；仍保留 Cocos 实现，不启动引擎迁移。
