# 胜利 / 失败结算重设计

沿用已选第3稿「深蓝珐琅 + 暖铜」。两张独立稿分别为 `concepts/victory-quiet-enamel.png`、`concepts/defeat-quiet-enamel.png`，不是运行截图。

## 固定边界

- 不增加评分、星级、经验、额外奖励或下一关。
- 四项统计、三项局内记录与最佳纪录全部来自原有 `BattleResultViewModel`。
- `FirstLevelResultView` 独立持有饰面、徽章及原生文字；旧 HUD 不再创建结算文字。
- 图片仅包含无字材质和图标。两种结果共用布局，只有徽章、文案和危险数值变化。
- 两个按钮改为纵向排列，仍调用原有重开检查点 / 返回首页；绘制与命中均用 `fitRect`。320宽设计比例下热区至少44px。
- 原生文字：标题54、统计40、正文28、局内值32、操作36，统一随1080×1920参考画布等比缩放，不再叠加两次字号系数。

## 资源与验证状态

`result-slice-manifest.json` 记录九张透明切图的裁切、尺寸、RGBA解码体积与源哈希。徽章256²，统计及记录图标128²，合计983040字节；这不是整包性能达标结论。复用现有共用材质，不把整张设计图贴入游戏。

已生成失败页同尺寸对照 `defeat-fidelity-comparison.png`。生成图的示例数值不参与玩法与存档，实际截图是普通1×止步第2波。

## 增量审查与证据

最终入口：`http://127.0.0.1:4176/?build=quality-v3-result-fidelity`。

主包 SHA256：`4c3e42caae9d8afd58b8c0c6bb6d6cac229fc3fb359c79c7418a96ab864ec649`。

- 字体：保留用户要求的小字号，标题加粗，四项统计左对齐；没有用烘焙文字。源稿标题更大、字体轮廓不同，属于待用户确认的视觉差异。
- 布局：四项统计分两行，三项过程数据降为紧凑条，两个操作纵向排列。390 / 320宽截图分别保存，不拉伸源图来掩盖差异。
- 配色：初次实装遮罩过暗，已从215调整为150；危险数值克制红色，失败核心用红色徽记。背景来自真实战场，不复制稿中敌群。
- 图片：九张透明图标和现有铜框材质已实际加载。源稿的独立心形与实装的小盾徽、铜边细节及图标比例仍有差异；分隔线中心菱形尚未还原。
- 文案：保留真实漏怪、金币、用时、建塔、升级和已有最佳纪录；没有把稿中的失败提示替换掉真实纪录。

196项规则及7项资源/设计契约通过，运行时类型检查通过，Creator发布构建成功（构建尾部存在本机MachPort告警，不冒称无告警）。

此前2210构建：普通1×失败、390/320截图、返回首页及纪录保留通过；显式QA失败后点击重新部署恢复检查点通过。QA长路线13塔未升级在后期失败，**不是胜利分支验证通过**。QA采用FIXED_HEIGHT，截图单独保留 `runtime-defeat-qa-390.png`，不能混作普通SHOW_ALL证据。

最终fidelity构建：普通1×再次真实失败于第2波（击毁2/18、漏怪10、核心0/10、金币66、用时00:43、建塔3、升级0），390 / 320截图重新捕获并覆盖最终文件，重新生成并共同查看设计/实装对照。320宽点击重新部署恢复3塔、路径14格、金币50、速度1倍的战前准备态。浏览器错误为空。主包及逐项结果记录在状态索引。

胜利页已接入但实际胜利截图尚缺；没有同构建三局普通1×完整八波、整包预算或用户视觉认可。此增量不能标记全页面阶段完成。

## 完整生成提示词

### 胜利稿

```text
Create an independent high-fidelity portrait mobile tower-defense VICTORY results screen, 941x1672. Use attached approved pause screen as strict art-direction reference: polished hand-painted deep midnight blue enamel, aged warm bronze bevels, finely restrained teal light, ivory small crisp Chinese typography. Same original night-city plaza world, not an existing game clone. Full completed design, not wireframe. Dimmed real-looking night plaza battlefield backdrop with a few towers. Central large framed navy enamel panel within safe margins, around 80% width, centered vertically. Clean hierarchy with a small exquisite bronze shield protecting a luminous teal heart at top; NOT a flat checkmark. Heading 防线守住了 in restrained ivory type, small subtitle 第一关 · 八波防线已守住. Bronze line with small center diamond. Four stats in elegant 2x2 recessed fields: 击毁 132/132, 漏怪 0, 核心 10/10, 金币 54. Below a compact 3-column quieter strip: 局内用时 04:32, 建塔 12, 升级 8. Small record line 最佳用时 04:32 · 最佳核心 10/10. Bottom two vertically stacked wide controls, teal primary 重新部署 with restart icon, navy secondary 返回首页 with home icon. No stars, no XP, no added rewards, no new levels, no locked towers, no extra buttons, no English. Leave breathing room, modest font sizes comparable to secondary text in reference. Metal ornament is carefully detailed but functional, all elements same material family.
```

### 失败稿

```text
Design a polished portrait mobile tower-defense DEFEAT result screen, 941x1672. Strictly match attached victory results screen structure and attached selected pause art direction: original night-city plaza, midnight navy enamel, warm worn bronze bevels, ivory small crisp Chinese native-looking typography. This is the defeat sibling, not a redesign of the family. Dimmed night plaza with remaining enemies, no gore. Central large ornate navy enamel framed panel, same position/proportions as victory source. Top small bronze shield with a cracked dark ruby heart, restrained ruby glow; no flat X. Main title 核心失守. Small subtitle 第一关 · 止步第 6 / 8 波. Two by two stats in compact enamel recessed panels: 击毁 86/101, 漏怪 10, 核心 0/10, 金币 24, each with appropriate finely painted warm bronze small pictorial icon. Small three-column strip 局内用时 03:18, 建塔 9, 升级 5. Quiet record line 调整火力覆盖，再守一次. Bottom two vertically stacked controls, teal primary 重新部署 with restart icon, navy secondary 返回首页 with home icon. No extra currency, stars, XP, advertisements, locked content or next-level button. Keep identical bronze and navy materials as reference, use ruby only for cracked shield and danger values, not a giant red overlay. Balanced generous spacing, avoid huge text and clutter. Completed independent design mockup, not game screenshot or wireframe.
```

### 无字透明图标源

```text
Create a transparent-background production game UI sprite sheet, EXACT square grid of THREE columns by THREE rows, 1024x1024. All nine cells equally sized, generous transparent margin, one centered isolated pictorial item per cell, no text or labels anywhere. Art direction match attached victory and defeat design: polished warm bronze beveled metal, hand-painted high-end tower-defense UI, dark blue enamel, ivory highlights, teal crystalline heart. Row1 col1 victory shield with teal glowing heart and bronze laurel, row1 col2 defeat shield with cracked ruby heart and bronze laurel, row1 col3 crossed bronze swords. Row2 col1 small bronze skull with dark eye sockets, row2 col2 small bronze heart frame with teal crystal heart, row2 col3 neat stack of warm gold coins. Row3 col1 bronze stopwatch, row3 col2 small bronze rook-like fortified tower, row3 col3 two bronze upgrade chevrons. Each isolated silhouette fully inside its cell, transparent empty background no panels no baked glow background no ground no shadows outside icon; soft localized glow inside heart shapes only. Badges rows1c1/c2 same scale, other icons similarly scaled for thumbnail readability. Production asset sheet, not screenshot.
```

来源：内置imagegen，参考本项目已选稿。商用发布前仍需复核服务条款与资源授权。
