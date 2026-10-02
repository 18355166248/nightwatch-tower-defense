# 安全恢复页面设计还原 QA

范围仅后台等待/返回与路线异常。教学上一批报告见 [QA-TEACHING.md](docs/design/first-level-quality-v3/QA-TEACHING.md)。本批内部通过不代表真人视觉确认或首关总体完成。

## 真值与冻结版本

- 独立源稿：docs/design/first-level-quality-v3/recovery.html、recovery.css、recovery.js；不是游戏运行截图。
- 实装普通入口：http://127.0.0.1:4176/?build=quality-v3-recovery-final。
- SHA256：8b768c024f2c13418f37212d620eb6a856d67fcdc555bcee08c869f3e49353e0。
- 页面夹具同构建附加qa=1&qaRouteFault=1&qaLifecycle=1，已有K/L/O键分别注入流场错误、调用后台/返回入口；不冒称真实外部生命周期切换。
- 临时证据目录：/private/tmp/nightwatch-confirmation-fidelity-aeMb8G/，不加入Git图片。
- 源稿原生视口770×597：后台面板裁left68/top257/302×294；异常裁left47/top158/344×394。后台实装390×693，裁left44/top187/302×294；异常实装390×844，裁left23/top258/344×394。均以390宽源坐标直接比较，不拉伸面板。
- 背景、HUD、敌人和真实数值不属于这批源稿复制范围；QA灰盒HUD不是普通入口最终HUD。

## 审核记录 / 五项表面

1. Typography：标题17、异常正文12/11、按钮13、脚注10，同390比例；后台菜单继承原已批准小字号。最终合成图无截断；字重/原生抗锯齿为P3。
2. Layout：异常统一344×394双按钮正文布局，视图与触控共用firstLevelConfirmationLayout；后台保持已批准四项菜单，不新增占位。源稿双列文字偏上已校正。几何测试保留320缩放44px热区，不降低门槛。
3. Colors：正文#F4E9CD，次要#A9BDCA，层级#C6A876。源稿错误绿色禁用/中性退出已修成暂停家族暗色禁用/暗红退出。CSS禁用文字比原生略暗、后台细分隔线对比及图标数像素偏移为P3，未冒称逐像素一致。
4. Assets：9项既有本地素材全部加载，失败0，无新图片；设计稿引用已有CDN素材。来源与图片/原生文字边界不变。
5. Copy：异常明确不能继续、检查点恢复范围、本局统计重置及保留历史纪录；返回不再丢失暂停来源说明。无障碍等待文案修成同一数据源；不是一面禁用一面说继续。

## 浏览器 / 工程结果

最终构建：异常注入时1敌、0.2秒，phase=paused，无胜败；重新部署恢复4塔、0金币、0敌、wave0、elapsed0，保持preparing。后台在0.1667秒冻结；点击禁用继续无效；O解除来源后仍paused、同计时、恢复说明保留，手动继续才恢复。早期构建另验证路线异常返回首页，无故障残留；最终构建两个出口再回归记录见RECOVERY.md追加。
320×900实际异常页捕获无截断，按钮完整；该窄屏截图为同内容的审核前构建，最终版本仅诊断/无障碍变更，仍不把它写成最终完整验收。
211/211规则、10/10美术；运行源码ES2020配置通过，默认tsconfig历史环境限制未解决。发布构建退出0；Cocos退出清理噪声保留。

全景源稿/运行页已打开审查；同尺寸局部组合为recovery-route-comparison.png、recovery-waiting-comparison.png、recovery-returned-comparison.png，最终构建重新采集并重看。内部无可执行P0/P1/P2，停止P3反复打磨。

## 未完成边界

还需普通入口真实背景切换验证、同构建三局普通1×完整八波、全页面真人视觉确认。页面族接入不等于游戏达到Fieldrunners 2成品品质；不做横屏或Android。后续转向冻结验收，不无限扩展页面。

final result: passed
