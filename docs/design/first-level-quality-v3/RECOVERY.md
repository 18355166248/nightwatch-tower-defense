# 后台恢复 / 寻路异常设计与接入

范围：复用已确认第3稿材质、暂停四按钮菜单与确认页双按钮布局，不新增素材、关卡、系统或引擎迁移。独立源稿：[recovery.html](recovery.html)，样式：[recovery.css](recovery.css)，交互：[recovery.js](recovery.js)。标题17、正文12、次要11、脚注10，390基准整体缩放；源稿数据是排版示例。

## 状态及语义

- 后台等待：继续按钮禁用；原有设置、重新部署及首页确认入口保留。
- 已返回：仍停战，显示“已返回 · 战斗仍暂停”；手动继续才恢复。恢复来源跨设置返回保留，显式继续或清局后清掉，不增加新的阻塞原因。
- 路线异常：不能继续原局、不自动判胜败；恢复战前塔位、等级与金币后回到布防，敌人/波次/本局统计清掉。退出结束本局，但历史纪录与设置保留。

纯文案抽离到`FirstLevelRecoveryPresentation.ts`；`PauseOverlayRuntime`只保存恢复来源。绘制复用`PhaseBPauseOverlayView`原生标签与既有九宫格；异常页触控与绘制同用`firstLevelConfirmationLayout`。后台画面采用现有暂停布局，未新增常驻占位。

## 审核边界

浏览器夹具必须显式`qa=1&qaRouteFault=1&qaLifecycle=1`：K注入流场错误，L/O复用真实生命周期处理入口。普通模式不注册这些键。夹具页面检查不等于浏览器真实切后台或三局完整八波验收。

最终冻结入口：`http://127.0.0.1:4176/?build=quality-v3-recovery-final`。
`assets/main/index.js` SHA256：`8b768c024f2c13418f37212d620eb6a856d67fcdc555bcee08c869f3e49353e0`。
规则211/211、美术10/10、全部运行源码ES2020类型检查通过。默认全量tsconfig历史环境限制未修；不以该独立检查宣称所有项目配置可用。

审核结果与临时图片见根目录`design-qa.md`。图片不加入Git，使用已有CDN原图与运行本地贴图，无新增资源预算或网络依赖。页面家族接入完成不代表真人视觉验收、完整试玩或原始成品目标完成。

最终构建追加复验：手动继续后再注入异常，返回首页恢复home/preparing、wave0、elapsed0、故障空、恢复来源false；浏览器未捕获warn/error。该结果不是八波通关证明。
