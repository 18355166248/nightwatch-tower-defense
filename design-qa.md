# 教学 / 波间设计还原 QA

仅覆盖获批教学轻卡、波前敌情和跳过按钮。旧面板报告保留在 [QA-TOWER-PANEL.md](docs/design/first-level-quality-v3/QA-TOWER-PANEL.md)，全页面历史差距仍见 [QA-BEFORE-CONFIRMATIONS.md](docs/design/first-level-quality-v3/QA-BEFORE-CONFIRMATIONS.md)。本批passed不证明成品视觉或首关整体完成。

## 视觉真值、构建与归一化

- Source：`docs/design/first-level-quality-v3/teaching.html`；独立稿，不是运行截图。
- Implementation：`http://127.0.0.1:4176/?build=quality-v3-coach-final-1130`。
- SHA256：`c7502346cf64113698a52c3c8840900656dd9216e18f76ba66d30b14508a4556`。
- 浏览器1280×720，1×截图。源内容390×693.33，DOM left174/top376.98；整页按left174/top377裁390×693。实装Cocos显示区405×720，按left438/top0裁405×720，再按宽度等比到390×693。半像素边界取整不作假精确结论。
- 首动作与四塔就绪同140/10金币、0波；升级建议源45金币，实际首波后54金币（击杀36+清场8），不篡改经济凑稿。自由倒计时源是第2波后、实际第1波后；比较该相同倒计时组件，编队和塔位不是同一状态，不将背景差异归为面板缺陷。
- 稿件场景/塔肖像仅情景，实装高亮来自真实格子、路线与按钮。既有HUD/塔栏不在本批重设计范围。

## 审核与比较历史

1. 规则回归发现新同比跳过按钮越过长竖屏安全边界。修复为视图/触控共用布局，24设计单位安全边距和HUD下方顶限；保留实际44px门槛，不调低标准。参考16:9下按钮比稿上移2px，P3，避免侵入棋盘边缘。
2. 升级高亮旧坐标已修复：实际选中推荐塔才在新面板真实升级按钮绘制；高亮置于面板上方，不被图片底板遮住。
3. 输入审核发现普通模式旧重置按钮被隐藏但留热区。关闭该旧热区；普通重部署仍走暂停确认，QA快捷重置保留。最终版本四塔10金币点击旧位置，塔/金币未变化。
4. 最终重新抓取普通1×首动作、四塔就绪、真实首波待命/升级、自由倒计时；组合源与实装逐项打开检查。轻卡无可执行P0/P1/P2差距，不循环追磨P3。

## 五项必查表面

- Typography：PingFang SC，标题13/正文11/辅助10/状态9，统一390比例，无旧0.72二次缩放。无正文截字；原生字重、抗锯齿与像素取整为P3。
- Layout：366×74轻卡、距常驻塔栏12、内边距和三行层级一致。首动作/开波建议不额外增加中央CTA。预览/选塔、战斗、真正暂停隐藏轻卡，不留空槽。320/长竖屏44px由几何测试覆盖，不宣称实际窄浏览器验收。
- Colors：正文#F4E9CD、辅助#A9BDCA、状态#C6A876，与源稿统一；跳过使用既有中性铜边按钮，未另起材质。
- Assets：复用本地第三稿无字九宫格，无新增图片/联网依赖；推荐格与升级热区为原生状态高亮，不伪造图片。场景、塔位、HUD差异为真实上下文。
- Copy：开波指令沿实际waveStartActionText；升级从真实建议生成，使用“点高亮炮塔”以兼容后期冷凝，不硬编码中段机枪。源示例的迎敌/建议Lv.2与运行通用句式差异显式保留，语义一致。待命/倒计时由真实held/phase生成，不用假计时器。

## 最终证据

临时目录 `/private/tmp/nightwatch-confirmation-fidelity-aeMb8G/`，不加入Git图片。

- 全景：`coach-select-comparison.png`、`coach-ready-comparison.png`、`coach-upgrade-comparison.png`、`coach-countdown-comparison.png`。
- 局部：对应`coach-*-focused.png`（左源、右实装）。
- 状态：`coach-runtime-upgrade-target.jpg`、`coach-runtime-after-upgrade.jpg`、`coach-runtime-preview-hidden.jpg`、`coach-runtime-combat.jpg`、`coach-runtime-paused-hidden.jpg`。
- 冻结版本普通1×：140→110→80→40→10完成3机枪/1冷凝，路线12→16；旧热区不清局；首波9敌全部清场、核心10、金币54；等待操作期间未自动开波；中段升级54→30，面板收起并进入补塔建议；预览让位、取消不扣费；跳过恢复8秒真实倒计时；暂停下新标签/皮肤槽清空。
- 209/209规则、10/10美术，运行源码ES2020独立配置通过；默认全量tsconfig旧ES2015/Bun限制不冒称已解决。
- 发布构建退出0且加载，仍有Creator退出MachPort/worker清理噪声；浏览器没有捕获warn/error，面板九项资源加载失败0。

## 边界与停止

未完成三局完整八波、实际窄浏览器、真人视觉确认。后台恢复/寻路异常下一批继续；不做横屏或Android。内部通过不是用户视觉确认，原始Fieldrunners 2成品品质目标未宣称全部完成。

final result: passed
