# 首关运行时尺寸候选：保留动作，降低图像占用

日期：2026-09-28。状态：浏览器候选、待用户画风/画质批准；默认仍是旧档，不是正式资产或首关完成。

## 改动与契约

- 复用已有固定模型透明源帧，由 character-motion-kit 对应的 `ai-asset-pipeline/src/asset_bundle.py` 全画布缩放/打包。行走格128→80（图集512→320），死亡格256→160（图集1024→640），各四方向×四帧，未删帧、未逐帧裁主体、未修改模型源。
- 保留两套归一化地面锚点、动作行序、125ms行走元数据、75ms死亡元数据、walk循环/collapse非循环。运行时行走仍按既有格内进度选帧，死亡仍300ms；两倍死亡画布/显示比例保持，不改世界单位大小、伤害、碰撞或寻路。
- 主/回退底图均由现有941×1672 JPEG全图Lanczos归一到768×1365，quality90。原JPEG、原生图及旧候选图集不覆盖。线性采样、无mipmap；底图禁止动态合图，atlas仍由既有适配层创建不合图SpriteFrame。
- `FirstLevelArtProfile` 只配置资源路径；装配层一次选择，底图与单位层消费同一档。显式 `artBudget=compact` 才启用，`unitArt=rig-candidate` 仍独立控制是否启用模型步兵。未知尺寸参数回退原档；compact的主/回退都用小尺寸，不偷偷加载旧高分图。
- 新资产完整包、透明帧、manifest/aseprite/grid、深浅底预览、源SHA与配方在 `art-source/first-level-runtime-budget-v1/`。现有权利/审美待评审状态继承，缩放不构成授权批准。

## 复现

使用现有Pillow/NumPy解释器；无需联网或新生图：

```bash
/Users/xmly/Swell/code/game-workspace/ai-asset-pipeline/.venv-cutout/bin/python \
  /Users/xmly/Swell/code/game-workspace/nightwatch-tower-defense/scripts/art/build_runtime_art_profile.py \
  --pipeline /Users/xmly/Swell/code/game-workspace/ai-asset-pipeline \
  --out /private/tmp/NEW-NIGHTWATCH-BUDGET-BATCH
```

输出必须是此前不存在的目录。`--install` 仅允许所有独立候选目标均不存在时入库，拒绝覆盖已存在资源；复现不加install。Cocos与原画文件没有迁移/删除。

本次另在 `/private/tmp/nightwatch-budget-repro.9X0Rjq/batch` 无install重跑：两张atlas及主/回退JPEG的SHA256与入库候选逐张一致。再次向原批次执行install被明确拒绝（exit2），未覆盖原批次；不是用手工缩图冒充可复现管线。

```bash
npm run verify
./node_modules/.bin/tsc --noEmit --lib es2020,dom
npm run build:web
npm run report:assets -- --profile compact --out docs/poc/phase-c-compact-asset-budget.json
```

预算默认仍校验所有档，保留的original候选超8 MiB会返回1；`--profile compact` 只选择compact常驻组合，但整包仍计入全部比较资源，没有隐藏旧资源的传输成本。

## 实际构建预算

| 已统计图像集合 | 原档 | compact | 差异 |
| --- | ---: | ---: | ---: |
| 模型步兵候选RGBA8 | 12,781,472 B / 12.19 MiB | 7,486,464 B / 7.14 MiB | −41.4% |
| 图像文件payload | 1,081,919 B | 753,102 B | −30.4% |
| 主/回退各自RGBA8 | 同为12.19 MiB | 同为7.14 MiB | 一张底图常驻 |
| 原A/B+底图RGBA8 | 7.19 MiB | 5.19 MiB | 默认仍原档 |

当前整包8,620,129 B / 8.22 MiB（包括两档比较图），仍低于20 MiB。源图片与原生发布产物SHA一致。compact已统计图像集合低于8 MiB，图像payload低于3 MiB，脚本退出0；**并非总GPU内存或完整首屏HAR通过**。字体/动态合图/渲染目标/CPU/音频尚未计入，与上一轮报告的边界一致。

也不能据此认为完整家族预算已经解决：仅余0.86 MiB，另两类若各新增同样80方四方向行走图集，会再占0.78 MiB，几乎没有字体/正式塔外观余量。后续须先测引擎实际纹理分配、拆分类预算，再比较生命周期释放、图集布局与背景采样；不要等全家族产出后才提高上限或盲目再缩角色。

## 浏览器与视觉证据

- 同构建普通入口、405×900、真实四塔购买，compact与original均有对照截图。底图差异很小；compact步兵小尺寸头部/躯干/肢体仍可分，工作尺寸有更多细节损失，因此只作为预算档候选，不自动替用户批准画质。
- compact普通全程1×首波：9/9击毁、零漏、核心10/10、54金、32.95秒，清场敌人/反馈/模型尸影归零，浏览器0 error/warn。13.67秒实战采到朝下/朝右行走及死亡各四帧；截图不是逐帧连续动画证明。
- original对照14.95秒：5击毁/活动4；与compact截图13.67秒不是同一模拟时刻，不能作逐像素差分或证明连续动态完全一致。两张布防图同布局/同视口，可比较底图清晰度。
- 离线检查四方向行走/死亡逐帧联络表；未出现管线触边/重复单姿态警告，源/安装图集、锚点、逐帧时长、loop与源SHA的测试通过。向上方向仍只有离线证据，首关实际路径未覆盖。

| 证据 | 原档 | compact |
| --- | --- | --- |
| 同布局布防 | `phase-c-budget-original-ready.png` | `phase-c-compact-ready.png` |
| 普通1×首波 | `phase-c-budget-original-wave-one.png` | `phase-c-compact-wave-one.png` |

本次141/141、完整运行时TS与Web Mobile发布构建通过；构建初次受限启动退出null，授权运行同一个已安装Creator后实际产物完成。没有把受限失败当通过。

密集波/暂停/终局回归已补在下节。普通完整八波、全首屏/显存预算、用户质感批准、另两类家族和无指导玩家仍待验；不做Android真机。

## 密集波回归

- 同构建 `qa=1&qaNaturalCountdown=1`，A加载真实四塔推荐购买、自然波间补塔；主要2×，第五波短暂1×观察/暂停后恢复2×，未提前开波。QA用于高密度表现回归，不计入普通首次玩家样本。
- 第五波150.3667秒暂停：行走/死亡资源ready、6条血条/0冲突；跨素材复现检查后再次读取，时钟/血条未推进，Space恢复。
- 核对真实波表后，第五波为9只重装，不是三类同屏混编；观察时的“混编”说法不准确，截图已正名 `phase-c-compact-hauler-wave-five.png`。第六/八波配置包含三类分组，也不能据此推断任意采样画面同时存在三类。
- 第八波417.8333秒：213已生成、196击毁、活动16、核心9；16条真实受伤条、11避让、0重叠采样。截图 `phase-c-compact-wave-eight.png`；不保证所有帧零重叠，也不把血条避让当角色本体已完全分离。
- 自然八波胜利：212/213、漏1、核心9/10、348金、10塔、累计4次升级，470.15秒/07:50。敌人/反馈/模型尸影/血条/音乐声部全为0；浏览器0 error/warn。`phase-c-compact-victory.png` 保留结果。
- Return重开恢复4塔/10金/16格路线/时钟0/血条0、死亡采样清空、保留QA速度2×和compact档。随后恢复默认视口与普通候选链接，临时original比较标签已关闭。
- 这证明当前尺寸档的局内工程兼容与部分小尺寸观感；不替代普通全程1×八波、连续三局压力/内存趋势或5名无指导玩家。

## 试玩与退回

普通候选：`http://127.0.0.1:4176/?unitArt=rig-candidate&artBudget=compact&build=phase-c-budget-review-v1`。

删除 `artBudget=compact` 即回原高分候选；删除 `unitArt=rig-candidate` 回A/B步态。不会影响玩法配置、已存设置与最佳纪录。先批准代表画风/画质，再按当前预算统一另外两类；保持第一关范围。
