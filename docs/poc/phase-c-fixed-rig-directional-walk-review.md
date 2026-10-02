# 固定模型步兵四方向动作 review（2026-09-28）

## 可玩入口与范围

普通入口候选：<http://127.0.0.1:4176/?unitArt=rig-candidate&build=phase-c-directional-walk-review>。
去掉 `unitArt=rig-candidate` 即恢复现有 A/B 美术。只替换发条步兵，不改变关卡、伤害、碰撞、经济、存档分区或模拟速度；没有迁移游戏引擎。

这是一个可玩的美术比较版本，不是正式方向动画验收。疾行机和搬运者仍使用现有两帧，步兵尚没有同模型受击/倒地动画；新候选死亡沿用最后朝向帧短淡出，避免突然切回旧画风。

## 为什么改用固定模型

前一轮逐帧生图的承重脚/头部注册失败，拒收记录保留不覆盖。本轮按 create-game-assets 的本地 3D 资产路径，参考本项目原有步兵身份，使用已安装 Blender 5.2.0 LTS 脚本建模、机械关节摆姿；character-motion-kit 负责统一打包、透明检查和离线预览。

铜头、双琥珀眼、深蓝甲、胸前齿轮和背部发条钥匙共用一个模型；背面结构为原创推定。没有下载第三方模型、使用 Fieldrunners 商业切图、安装新引擎或调用付费外部生成接口。运行时仍是 Cocos 3.8.8 的 2D Sprite，不加载 Blender/GLB。

v1 比例稳定但原生尺寸偏瘦、亮度不足，v2 扩大头盔/手臂轮廓，换真实齿廓、提亮眼睛、圆润靴头。它比现有绘画质感简洁，需要用户判断是否接受这个方向，不能称为原图的精确复刻。

## 源文件与可复用边界

- `art-source/first-level-units/clockwork-infantry-rig-v2/model/`：可编辑 `.blend`、单动作 GLB。
- 同目录 `build-source.py`、`clockwork_walk_motion.py`、`render-source.py`：该版本的建模/运动/渲染源码快照；通用执行入口在 `scripts/art/`。
- `frames/`：4 方向 × 4 个真实姿态的 256 方透明帧；`render-manifest.json` 记录实际重新导入 GLB 后的脚底高度和地面投影锚点。
- `bundle/`：128 方逐帧、512 方图集、manifest、Aseprite descriptor、接触表、离线 `preview.html`、检查报告与输入 SHA256。原始版本 v1 也保留。
- `DirectionalWalk`：纯方向/相位/配准/manifest 校验，规则测试不依赖 Cocos。
- `DirectionalSpriteAtlas`：Cocos 加载/切格/纹理引用与销毁；全部 16 帧就绪才切换，损坏/缺图回退旧动作。
- `PhaseBUnitSpriteView`：只读已承诺路段和格内进度同步身体，血条/冰环/地面接触斑独立；新帧不叠加旧整身弹跳。

源模型导出五个关键相位，末相与首相闭合。重新导入 GLB 后帧范围 1–13，采样 1/4/7/10；不是复制四张静态图。四个朝向与所有姿态只做一次 union 拟合，不按每帧 bbox 裁切缩放。

## 技术数据与复现

正交俯角 35°，固定世界光源；共享 ground-anchor `(0.5, 0.82830057)`。16 个重新导入的姿态均至少一只鞋底接地（误差阈值 0.001），没有整身上下漂移来补脚底。该检查证明模型空间接地，不证明玩家感觉自然。原图尺寸变化/透视下不同脚的屏幕最低点不应被当成锚点。

运行时 PNG 112,278 B，布局 JSON 3,763 B；512×512 RGBA 纹理解码约 1 MiB，16 个 SpriteFrame 共用纹理。PNG SHA256：`00f0cb2fd91f78ccbc14fbacf17d9a2e79dad368dadf69f6704bd618205e4c39`。图集报告 `warnings=[]`，状态仍为 `needs-human-review`。

在项目根运行；输出必须选择新的空目录，脚本拒绝覆盖已有源资产：

```bash
/Applications/Blender.app/Contents/MacOS/Blender --background --python scripts/art/build_clockwork_infantry_rig.py -- --out /private/tmp/nightwatch-rig-review/model
/Applications/Blender.app/Contents/MacOS/Blender --background --python scripts/art/render_clockwork_directional_walk.py -- --model /private/tmp/nightwatch-rig-review/model/clockwork-infantry-walk.glb --out /private/tmp/nightwatch-rig-review/frames --pipeline /Users/xmly/Swell/code/game-workspace/ai-asset-pipeline
/Users/xmly/Swell/code/game-workspace/ai-asset-pipeline/.venv-cutout/bin/python /Users/xmly/Swell/code/game-workspace/ai-asset-pipeline/src/asset_bundle.py --recipe art-source/first-level-units/clockwork-infantry-rig-v2/recipe.json --input /private/tmp/nightwatch-rig-review/frames --out /private/tmp/nightwatch-rig-review/bundle
npm run verify
npm run test:art
npx tsc --noEmit -p tsconfig.json --lib ES2020,DOM
npm run build:web
```

本机 Blender 在沙箱内首次遇到 Metal 设备检测崩溃，同命令获得本地执行权限后正常导出/渲染；不是 Cocos 运行时问题。没有降低网络/TLS 安全策略。直接 `tsc -p tsconfig.json` 的默认库存在项目已有 ES 版本报错，上述显式 ES2020 库检查通过，不修改引擎生成配置掩盖差异。

## 当前验证与待评审

- 规则与适配边界 122/122；额外运动数学测试 1/1；完整运行时 TS 和 Web Mobile 发布构建通过。新增三项接口替身测试覆盖完整就绪、损坏/加载失败与销毁早于回调；替身不是实际 Cocos 引擎测试。
- 离线浏览器原生 1×、深底四朝向、浅底朝下逐帧检查：模型身份/头部位置一致，左右脚交替，无裁切警告。临时 4177 服务/标签页检查后关闭。
- 显式 QA 长蛇形 1× 真实开战：图集 `ready`；首三个清场后第四波采样共生成 35、击毁 33、活动 2、核心 10/10、无漏怪。实际使用朝下/朝右各四帧，控制台 0 error/warn。没有在该夹具捕获向上运动，不能称为四方向实战全覆盖。
- 普通入口保留旧图，诊断 `disabled`；候选普通引导通过真实点按四塔：金币 140→110→80→40→10，路径 12→14→14→14→16，1× 开波。首波交火截图 `phase-c-directional-walk-wave-one.jpg`。
- 普通入口暂停时局内 15.7167 秒、3 名活动敌人；停留后局内时间及方向帧采样集合保持一致，按钮恢复战斗。它证明共享移动时间冻结，不代表逐帧视频手感验收。
- 同候选普通入口 1× 第一波最终 9/9 击毁、零漏、核心 10/10、54 金、四塔、局内 32.95 秒，清场后无敌人/反馈，0 error/warn。当前留在第二波前教学等待，不能当成完整八波。底栏坐标受浏览器视口/输入映射影响，临时 405×900 校准后完成真实点按，结束恢复默认尺寸；未做真机输入验收。

待补：普通最终 1× 完整八波、向左/向上实战转弯、模型同画风受击/死亡、另两类敌人的方向动作、密集战斗可读性、人工美术/权利审批及 5 名无指导首次玩家。仅做右侧浏览器，按用户范围不做 Android 真机。先比较代表单位效果，再决定是否推广；动作来源不稳和材质差异都不能直接归因于引擎。
