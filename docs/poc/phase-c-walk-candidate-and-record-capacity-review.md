# 首关行走样本与战绩容量 review（2026-09-28）

## 本轮结果

继续 Cocos 3.8.8，不迁移、不增加玩法。本轮实际上线的是结算文案修复：历史最佳核心容量和本局初始生命分开；四帧朝下步兵仅生成/打包为 review 候选，未通过注册闸门，未复制到运行目录。

总方案 §8.3 的四方向×四帧仍未完成，不能把本轮四张姿态当成完整方向动画。

## 战绩修复

- `FirstLevelBestHealthStore` 导出纪录容量 10，同步用于有效范围校验和结算装配。
- `BattleResultContext` 独立传入 `bestCoreHealthCapacity`；视图模型不读存储、不推断历史容量。
- 本局摘要继续使用 `initialCoreHealth`。低生命夹具的本局仍是 0/2，历史纪录是 9/10。
- 未修改存储 key/schema、玩家/QA 隔离、胜负判断或战斗数值。

`npm run verify` 115/115、完整运行时 TypeScript (`--lib es2020,dom`) 和 `git diff --check` 通过；10:50:36 Web Mobile 发布构建完成。编辑器布局/网络环境警告未处理，不关闭 TLS 校验。

右侧浏览器同构建 `?qa=1&qaNaturalCountdown=1&build=phase-c-record-registration-1050`，真实按 H/Space/X：第二波失败，16/18 击毁、漏 2、0/2、72 金、00:41；画面与无障碍文案均是“最佳核心 9/10”，0 error/warn。证据 `phase-c-record-capacity-defeat.jpg`。

## 动作素材

使用 create-game-assets → 内置 image_gen → character-motion-kit 的现有项目加工线，未调用未安装的 sprite-gen。项目自有 `clockwork-infantry.png` 为身份参考；没有使用 Fieldrunners 2 的商业角色素材。

候选原件、精确提示词、配方和拒收理由：

- `art-source/first-level-units/clockwork-infantry-down-walk-v1/`
- `art-source/first-level-units/clockwork-infantry-down-walk-v2/`

各为 1254×1254 RGBA，2×2 均匀切成 627 方画布，再用同一变换缩放为 128 方；不逐帧自动裁切、缩放或增加重复帧。公开 Aseprite descriptor 只是本地均匀切格输入格式，不是运行了 Aseprite/sprite-gen。

v2 `bundle/` 含 atlas、manifest、aseprite/grid JSON、四个透明帧、125ms/帧循环和离线 preview。素材管线台账记录 `rejected-candidate`，无运行时发布路径。已在浏览器以 1× 实际像素正常播放，暂停逐帧并检查深/浅底。

不通过原因：上下行头顶相差约 4.90 个输出像素，最下沿最大差约 14.29px；bbox 不等于承重脚，但逐帧也未确认稳定接触基线和完整承重/经过循环。打包器另报告第二/第三帧低 alpha 边缘触边。一次定向修正仍不足，停止批量扩展其他方向，保留现有 A/B 动作。

## review 边界

普通试玩地址 `http://127.0.0.1:4176/?build=phase-c-first-level-review-1050`，非 QA、1×、保留正常引导和玩家战绩分区。
同构建普通入口真实点击开始、逐塔双击落塔：三机枪/一冷凝、10 金、路径 16 格；首波 9/9、零漏、核心 10/10、54 金、32.95 秒。波间中段机枪升级扣 24 金，再补右上机枪扣 30 金，路线改道但长度仍 16 格。第二波实际战斗截图 `phase-c-normal-first-level-review.jpg`，动作仍是旧 A/B，并非本轮拒收候选。
第二波亦 9/9 零漏：累计 18/18、核心 10/10、42 金、五塔/一次升级、局内 47.1167 秒。音乐仅两条源、启动一次，浏览器 0 error/warn；右侧最终停在第三波前教学等待，玩家可以继续，不是完整八波验收。素材临时预览服务 4177 已关闭，游戏 4176 保留。
本轮素材被拒收，不以程序摆动或切图数量宣称四方向完成；生成注册问题本身不是迁移引擎的证据。
正式美术/音频主观 review、全三类敌人方向动作、最终普通入口 1× 完整八波和 5 名无指导玩家验收仍待完成。只测浏览器，不测 Android 真机，不宣布首关完成。
