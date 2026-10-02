# 第3稿 · 设置页落地

日期：2026-10-01。沿用用户已选 quiet-enamel，不重新请求风格选择。

## 独立设计与实施边界

源稿：`concepts/settings-quiet-enamel.png`。内置图像生成工具，以已选暂停稿为唯一视觉参考；不是运行截图。原图留存在生成目录，项目保存副本。

生成要求：同一深蓝珐琅、细铜边、米白文字、青绿选中态；设置包含声音关/开、四档音量、减弱动态关/开、战斗速度1×/2×、返回暂停。标题54设计单位、正文34–40、提示28–30；不增加其他功能。

实施调整：生图把音量四档挤在右侧，不能满足320宽44px热区，因此改成整行四档。声效/动态/速度保留左标题右选择。源稿额外的声音、音符、闪烁、快进装饰图标不直接切取，以免同一张图片烘焙文案；目前保留独立齿轮标题图标，正文采用原生文字和同家族按钮。此差异须明确审查，不声称逐像素一致。

面板、选中/未选按钮、齿轮复用`slice-manifest.json`中的9张切图，不新增整页贴图。文字、状态、热区和控制逻辑均原生。音量选择仍保留原声音开关，静音不会被调整音量意外解除。

## 代码分层

- `FirstLevelSettingsPresentation.ts`：纯函数，首页/战斗设置的标签、带类型动作、选中态和共同热区。
- `PhaseBPauseOverlayView.ts`：只负责原生排版与共用图片饰面。
- `NightwatchPocBootstrap.ts`：命中动作后调用设置存储或统一时钟，不拥有设置几何。
- `FirstLevelSettingsStore.ts`：幂等直接选择、版本化存储、异常内存回退。
- `SimulationClock.ts`：直接选倍率，不重置累积步长，不解除暂停。

## 验证状态

新增3项测试覆盖两入口热区、无重叠、选中态、幂等持久化、静音独立、倍率与步长保持；规则195/195通过，运行时代码类型检查通过。

浏览器截图、对照与最终构建记录补充在本文件下方。全页面交付及三局正常1×八波验收仍未完成；本页通过不表示整体成品视觉通过。

## 最终浏览器对照

构建：`quality-v3-settings-reviewed-1855`，主包SHA256 `c905abb8325f6120c653991681083c285484b8b0a7a5a944b904a219ab753123`。

首页/战斗设置各有390×844和320×844实际截图；对照图`settings-fidelity-comparison.png`已把独立稿与实装等比并排后实际查看。首版页脚贴铜边[P2]已修复：面板底从−595扩至−640，保留所有热区及字号。

与稿件尚有差异：实装面板比稿件更高，以容纳320宽44px以上的直接选择热区；音量整行；正文装饰图标/返回图标和齿轮铜质底徽未补；原生分隔线较淡，缺少稿件中心菱形。以上为可见差异，不声称高度还原已验收。标题390宽约19.5px、选项12.3px、说明10.1px，按1080画布比例缩小。

真实输入检查：主键刷新保持静音/50%/减弱动态开；随后恢复原偏好声音开/100%/减弱动态关。正常入口真实建3机枪1冷凝，改路12→16格；1×开第一波并暂停，直接选2×两次仍为2×，再选1×。设置操作前后计时均为0.016666666666666666秒，核心10、金币10、塔数4、第1波未变化。已检查返回首页、返回暂停。9资源已加载、失败列表及浏览器错误日志均空。

资源诊断记录：设置首页观察到整个渲染纹理约35.35MB（含底层首页文字），没有拿新增切图1.9MiB声称8MiB整包预算通过；整体性能与资源预算问题仍保留。

浏览器中途旧标签导航/截图接口超时，通过新的同一右侧浏览器标签恢复；没有切换浏览器或使用头测截图代替实际画面。临时视口测试后恢复默认。

## 完整生成提示词

工具：内置imagegen，transparent_background=false，referenced_image_paths仅含`concepts/pause-quiet-enamel.png`；原图`exec-9b984a05-cb63-4950-ba6b-d3db3147ad99.png`。下列为生成时原文。

```text
Create one independent high-fidelity SETTINGS screen for the same original steampunk tower defense mobile game in the reference. Portrait 1080x1920 composition. Match approved quiet navy enamel, fine restrained copper bevels, ivory Chinese typography, teal selected controls, dim rooftop battlefield behind. NOT another pause menu. Settings panel centered, occupies x120..960 y380..1540 roughly, thin copper corners and no excessive ornament. Header small ivory gear at upper left, Chinese 战斗设置 at modest 54 design-unit size, muted subtitle 声音与画面 · 偏好自动保存 at 30 design-unit size. Body structured with generous breathing room, NOT five large full-width equal menu buttons. Four rows/groups: 声音 with two compact equal choice buttons 关 and 开, 开 teal selected; next 音量 with brief hint 音乐与音效共用 and a single row of four equal choice buttons 25%, 50%, 75%, 100%, last teal selected; next 减弱动态 with short hint 减少震动与闪烁 and choice buttons 关 (selected teal) and 开 (navy); next 战斗速度 with 1× selected teal and 2× navy. Every choice has a single fine bronze rounded-chamfer border, same material as reference secondary buttons. Do not add unavailable settings or slider knobs. Label sizes 34-40 design units, secondary notes 28, no oversized labels. Four volume buttons must each remain comfortably touchable 155x150 design units, panel inner width730. Footer single full-width teal subtle return button 返回暂停, secondary footnote 战斗仍暂停 · 设置不会改变战斗数值. Background tower card HUD remains dim and secondary. This is a visual design mockup, not a screenshot of the existing runtime. Cohesive production game UI, all required Chinese text accurately written, no decorative English logos.
```
