# 同模型死亡衔接 review（2026-09-28）

## 这轮改动

继续 Cocos 3.8.8，只为 `unitArt=rig-candidate` 入口的发条步兵补四方向单次倾倒。正常入口仍使用原有 A/B 行走和两帧倒地，其他敌人不变；不增加关卡、不修改伤害/经济/索敌/碰撞、不改变死亡反馈的 0.3 秒寿命。

当前右侧普通试玩入口：<http://127.0.0.1:4176/?unitArt=rig-candidate&build=phase-c-rig-collapse-review>，首页/1×/减弱动态关，行走与死亡均 `ready`；去掉参数后两者均 `disabled`，旧版本保留。当前页面没有 QA 自动布塔或自动购买。

沿用 create-game-assets 的固定模型路径和 character-motion-kit 的确定性加工：直接读取上一轮 `clockwork-infantry-rig-v2/model/clockwork-infantry.blend`，保留铜蓝材质、部件和世界比例，四帧倾倒角为 0°/26°/61°/86°，琥珀眼逐渐熄灭。不是新身份、逐帧生图、重复静态帧或游戏引擎迁移。

## 配准与单次播放

倒地占幅大于站立，不能为了塞入原 128 方画布而缩小尸体。本次源画布 512、切图 256，镜头覆盖扩大两倍；模型本身缩放和 35°机位不变。运行时按行走帧/死亡帧的尺寸比例以两倍画布显示，角色实际像素比例不变。

行走地面锚点 `(0.5, 0.82830057)`，死亡为 `(0.5, 0.6641503)`。满足 `(死亡 anchorY − 0.5) × 2 = 行走 anchorY − 0.5`；同一地面接触斑对应同一世界地面。16 个模型姿态最低几何点与地面误差均通过 0.001 阈值：承重点由鞋底转到身体/头盔。该检查不是把每帧 bbox 裁边到相同位置，也不能证明玩家觉得有重量。

每帧 75ms、总 300ms、非循环；消费端按导出时长累计选帧，末帧停住，暂停读取同一个反馈剩余时间。前段保持不透明，仅末 75ms 淡出；减弱动态直接使用末姿态，不额外翻倒/压扁/旋转。死亡开始时锁定朝向和是否有完整兼容动作，缺图或晚加载只使用最后行走帧短淡出，不在尸影中途突然重播站立首帧。

## 复用与源资产

- `DirectionalSpriteLayout`：从行走文件抽离共享四方向 manifest 校验，显式区分循环行走与单次死亡。
- `DirectionalSpriteAtlas`：原加载器按 clip 参数复用，仍是全部 16 帧就绪后切换、共享纹理、幂等销毁与失效 owner 回调拦截。
- `DirectionalCollapse`：纯累计选帧、淡出与跨画布兼容校验，不依赖 Cocos 或战斗对象。
- `PhaseBUnitSpriteView`：同步 Sprite 与有限的活动/短尸影缓存；不反向修改模拟状态。

源目录 `art-source/first-level-units/clockwork-infantry-rig-collapse-v1/` 保留 brief、配方、渲染源码快照、可编辑死亡 `.blend`、512 方透明源帧、渲染证据、256 方帧、1024 方图集、manifest/aseprite/grid、接触表、离线预览和来源哈希。

原行走 `.blend` SHA256：`e86f058822aeac948d545fc9298978a498d00d776b7f487b4b5fe638e747e1a5`。
运行时 PNG SHA256：`40929b74b4b3e9823bad50e711494acc5177f52b573157cf87016c286467648b`。
PNG 185,341 B、JSON 3,798 B；共享 1024×1024 RGBA 解码约 4 MiB，加行走约 5 MiB。GLB/Blender 不进游戏包；检查报告无警告，但资产仍 `needs-human-review`，台账 draft，不称为正式发布素材。

项目根可复现，输出必须使用未存在的新目录：

```bash
/Applications/Blender.app/Contents/MacOS/Blender --background --python scripts/art/render_clockwork_directional_collapse.py -- --source art-source/first-level-units/clockwork-infantry-rig-v2/model/clockwork-infantry.blend --walk-manifest art-source/first-level-units/clockwork-infantry-rig-v2/frames/render-manifest.json --pipeline /Users/xmly/Swell/code/game-workspace/ai-asset-pipeline --out /private/tmp/nightwatch-collapse-review/render
/Users/xmly/Swell/code/game-workspace/ai-asset-pipeline/.venv-cutout/bin/python /Users/xmly/Swell/code/game-workspace/ai-asset-pipeline/src/asset_bundle.py --recipe art-source/first-level-units/clockwork-infantry-rig-collapse-v1/recipe.json --input /private/tmp/nightwatch-collapse-review/render/frames --out /private/tmp/nightwatch-collapse-review/bundle
npm run verify
npm run test:art
npx tsc --noEmit -p tsconfig.json --lib ES2020,DOM
npm run build:web
```

## 验证与边界

- 126/126 规则/资源接口替身测试、额外运动数学 1/1、ES2020 全运行时 TS、Web Mobile 发布构建和 diff 检查通过。新增覆盖单次循环语义、75ms 边界、不重播、损坏/尺寸/锚点/寿命不兼容的降级，以及同一资源适配器加载死亡图集。接口替身不是引擎渲染证据。
- 离线原生 1×、深/浅底、四朝向与逐帧接触表已检查；预览能停在末帧，不重新站起。截图 `phase-c-rig-collapse-preview.jpg` 只是离线证据。临时 4177 服务和标签页已关闭。
- 右侧浏览器 `?qa=1&qaNaturalCountdown=1&unitArt=rig-candidate&build=phase-c-rig-collapse-v1`，真实 A/Space 1× 第一波清场 9/9、零漏、核心 10/10；自动推荐购买后自然进入第二波，活动死亡数归零。实际 Sprite 已使用朝下/朝右全部四帧；第五波实际使用朝左全部四帧。之后 X 改 2× 检查密集波，不能把该局记为完整普通入口 1× 实玩。
- 截至第五波：核心 9/10，已有三种敌人同屏；控制台 0 error/warn。四朝向接触表和单次 manifest 齐全不等于向上实战覆盖。
- 同构建完整八波结束：213 生成、212 击毁、漏 1、核心 9/10、348 金、10 塔，结算显示累计 4 次升级（2 座塔被升级），局内 470.15 秒/07:50。敌人、战斗反馈、活动模型尸影均归零；0 error/warn。首波1×、第二波起改2×，QA推荐购买/自然波间，不能标为普通入口1×八波。第八波 363.4 秒采样活动模型尸影1，截图 `phase-c-rig-collapse-combat.jpg`；第七波密集场景 `phase-c-rig-collapse-dense.jpg`，终局 `phase-c-rig-collapse-victory.jpg`。
- 真实 Enter 重新部署恢复四塔/10金/局内0秒，死亡采样集合与活动尸影数清零，未继承旧尸体；速度仍保留玩家选定的2×，不是暗自重置偏好。
- 重开后通过真实暂停设置开启减弱动态，第二波51.2833秒采样：13击毁、核心10/10，死亡采样只有 `down:3/right:3`，没有倾倒前段。检查后已恢复QA的减弱动态为关；普通玩家设置分区不受影响。

仍待验：完整普通入口 1× 最终八波、向上实战、低帧率下倾倒辨识、同模型受击/其他敌人多方向、用户美术与音效主观审批、正式权利审查和 5 名无指导首次玩家。按范围不做 Android 真机；不宣布首关完成，不以素材来源问题或测试数量决定迁移。
