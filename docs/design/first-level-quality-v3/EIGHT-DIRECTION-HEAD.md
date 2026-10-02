# 八方向炮头代表稿

## 等级租约回收与CDN归档（当前构建）

试玩 `http://127.0.0.1:4176/?build=quality-v3-head-resource-leases`，主包 `assets/main/index.js` SHA256 `dbca0418d56f8f28b15dae1337ff81c339d334c75cf6108b38970a6674137533`。

复用 `VisibleAsyncAsset`，按当前已布置等级保留整组；塔换到本级帧或恢复旧图后才释放过时组，卖塔／结算／首页先清节点绑定再归还租约。旧请求迟到成对retain/release，不污染快速重建的新组；新开局可以重新请求。首页返回操作会结束原局，不增加战局保存功能。

普通770×597，1×，同一Lv1→Lv2→Lv3及基础冷凝配置：回收前资源缓存8304896字节、暂停GFX11635392；回收后缓存7256320、暂停GFX10586816，各降低1048576字节（1MiB）。暂停样本分别第3/4波，drawCalls54/55，不作严格帧耗时或FPS结论。总GFX仍约10.10MiB，8MiB门槛未过，未降低画质／变更预算。

最新构建重复普通升级流程，结束原局回首页后头组idle、方向样本空，缓存5196512、GFX8313792。新局两个一级头ready共用一组，缓存7256320；其中一塔升二级后一级／二级同时ready，缓存7780608；再升三级后一级／三级同时ready、缓存仍7780608，过时二级替换但未误释放仍布置的一级。三级东南向与一级西南向同帧可见，亦已观察一级西北向。`head-lease-coexist-state.json`及`head-lease-coexist-combat.png`同日志目录。完整八波三局验收仍0，不将这次自动行进到第4波的抽查算入。

非运行图片按既有授权上传 `audiopaytest.cos.tx.xmcdn.com`，81项新增归档逐项核验远程原字节；原图17419944字节，压缩预览5812584字节。归档原字节仍保留，预览压缩不会改动运行PNG。替换两个审阅页的动态图片引用后，移除81张项目内非运行图片约16.61MiB，以及压缩工作副本6823627字节约6.51MiB。`docs`与`art-source`下本地PNG/JPG余量0，运行资源不删。迁移脚本最初的deletedImages=520为全部历史清单条目数，并非本次删除数；已修正为只统计实际删除文件，新增条目差异核对81。

恢复入口 `art-source/cdn-image-manifest.json`／`scripts/design-image-store.cjs`；安装器支持CDN原始字节并拒绝错误域名、哈希不符或覆盖不同运行素材。删除后实际在线执行安装器2/3成功，字节与当前PNG一致。审阅页浏览器33/33展示图加载、0失败。源与中间切图路径继续作为来源索引；可恢复，不依赖本地源PNG。

验证254/254、美术10/10、运行类型检查及构建通过。截图／数据日志目录仍为 `/private/tmp/nightwatch-confirmation-fidelity-aeMb8G/`。待：全八向实战覆盖、预算与最终视觉收尾。本波设计改动仍不标记完成。

## 三级机枪家族接入（最新构建）

试玩 `http://127.0.0.1:4176/?build=quality-v3-three-level-heads`，主包 `assets/main/index.js` SHA256 `18bfb34f9700cb1a83514c4564eedeaf6bee980db2b469d68919e6f8c256248f`。独立切图对照：`eight-direction-family.html`，提供三级×八方向128px炮口／轴点标记及64px家族对照。

二级源图 `rivet-head-level-two-source-v1.png`，内置image_gen输出ID `exec-c4c95f6c-2a01-4ede-9018-01545ea501c7`，以已认可基础绿底源为编辑目标；三级源图 `rivet-head-level-three-source-v1.png`，输出ID `exec-d7404092-3966-45d6-b6f2-c9d5e39b36fb`，以二级源为编辑目标。均1774×887，项目既有切图管线2×4、128px、square、chroma、无autocrop。源图／候选在docs PNG忽略范围，不进入Git和运行包；唯一来源未删除，CDN归档待完成。

运行二/三级分别在 `assets/resources/level-one/units/rivet-head-eight-level-2-v1/`、`rivet-head-eight-level-3-v1/`，每级8张128×128 RGBA及独立UUID，完整透明画布、不参与动态合图、无mipmap。安装器参数2/3保留不同字节拒绝覆盖和meta复用。基础级＋两升级级共24张，解码上界1.5MiB，不代表总预算通过。

家族提示规范（实际内置编辑调用）：

- 二级：以基础4×2八向源为编辑目标，保留每格位置、N/NE/E/SE/S/SW/W/NW顺序、双炮口位置与宽度、物体比例、固定俯视正交相机、左上暖光、深蓝搪瓷／铜金材质和不透明绿底；仅每根炮管中段加一道粗铜金加固环、两侧接头加小肩甲。无底座、文字、额外炮管、发光、弹迹或绿底投影。
- 三级：以二级源为编辑目标，保留全部布局、原炮管及加固环、炮口位置、画布、相机／光照／材质；仅小肩板替换为厚阶梯铜金装甲（深蓝嵌板），后部齿轮之后增加低矮散热脊。三级在64px应更厚重而非整图放大，仍只有两炮管。无冷凝青光、炮火、文字、标注或背景投影。

128px叠点审查发现并修正基础注册的南／西南／西／西北炮口误差，三级源保持原炮管位置，逐级复核后共用同一坐标；注册页与程序坐标有一致性测试。此项修正不能替代全8向实际战斗验证。

等级资源仅已布置时请求，每级8帧就绪才发布；一级完整不受二级缺图影响。新等级未齐／失败时明确恢复旧图、旧轴点和旧尺寸。当前仍缓存已请求等级到视图销毁；过时等级卸载和总预算复测尚未完成。

测试253/253、美术契约10/10、全部运行类型检查与构建通过。普通770×597、非QA、1×：机枪Lv1→Lv2→Lv3，冷凝基础塔，金币依次110→86→44→4，路径14格；二级北向ready，三级东北向及东向可见，三级双管0/1实际绘制端点已观察。最新主包重载后再次验证升级及普通首波。截图／DOM样本在 `/private/tmp/nightwatch-confirmation-fidelity-aeMb8G/`：`rivet-level-two-game.png`、`rivet-level-three-combat.png`、`three-level-native-size-review.png`、`three-level-head-observed.json`。不是三局完整八波验收。

仍待：全方向实战覆盖、资源回收和预算复测、源／预览图CDN归档、最终人工视觉验收。冷凝三级现有外观未在本次重绘，不宣称全部塔家族或本阶段完成。

## 双管交替接入（当前构建）

试玩 `http://127.0.0.1:4176/?build=quality-v3-double-barrel`，主包 `assets/main/index.js` SHA256 `bf9839d59ac30e58370639d107b591025f0e01361d11cf9505fc9987e33df7bd`。

`CombatFeedbackRuntime` 为每座机枪保留0/1交替序列，同一射击的弹迹、枪口亮点与命中火花共用该编号；冷凝维持单个发射点。暂停/停火/升级不推进或重置序列，出售成功释放对应格，重开清空。八向炮头将两个注册枪口使用同一轴点、缩放、后坐力变换后发布；旧图/加载失败时副管回退主炮口。表现层不修改射击事件、伤害或射速。

验证：规则与真实视图源码绘制测试249/249，美术契约10/10，运行类型检查通过。右侧770×597普通非QA首波、1×，观察东向及东南向；东南向炮管0实际起点(28.933,333.984)、目标enemy-1身体点(65.45,261.500)，炮管1实际起点(12.252,323.010)、目标enemy-3身体点(65.45,170.739)。这些是不同射击时刻，不能据此假设两发后坐力完全相同。

截图 `/private/tmp/nightwatch-confirmation-fidelity-aeMb8G/double-barrel-combat.png`；逐帧DOM绘制端点样本 `double-barrel-observed.json` 同目录。仅首波抽查，不计最终完整八波三局验收。

仍待：三级独立外观、全8向小尺寸校准、资源回收/预算复测与源图CDN归档。下文为基础组及代表稿的历史记录，其“尚未接入/等待认可”描述不是当前状态。

## 基础组实际接入验证

基础八帧已安装 `assets/resources/level-one/units/rivet-head-eight-v1/`。首次机枪塔出现时请求整组，八帧完整就绪才切换；当前仍保留旧炮头作为失败降级，不宣称资源预算已达标。

`EightDirectionTowerFrames` 管资源，`EightDirectionTowerAim` 管方向/纯几何，`RivetHeadRegistrations` 管逐方向坐标，`EightDirectionTowerView` 管Cocos节点；固定底座，只有独立炮头换帧，不旋转整图。现阶段先使用主炮口，双管交替尚未接入；三级独立外观尚未制作，不能宣称整套完成。

验证构建：`http://127.0.0.1:4176/?build=quality-v3-eight-direction-base`，主包 `assets/main/index.js` SHA256 `5b0d4ee62e8f2d765c58a8bd3385c39356a6692f215ecf021eaff78d83c3dd83`。

规则246/246、美术契约10/10、运行类型检查通过。普通浏览器770×597、非QA、1×两塔：八方向资源ready，首波6.617秒实际方向south-east；18.617秒机枪绘制炮口(31.685,335.573)、目标enemy-7身体点(65.45,131.047)。已保存实际战场截图 `/private/tmp/nightwatch-confirmation-fidelity-aeMb8G/eight-direction-base-combat.png`。本轮不是全8向覆盖，未计最终八波验收。

下一步：制作升级帧、复核各帧体量/轴点及炮口、双管交替、按需资源回收、全方向与升级/重开浏览器验证、设计原图CDN归档。旧资源保留期间会有增量占用，不把功能测试通过当作8MiB资源门禁通过。

## 代表稿认可后的生产进展

用户回复“认可”，代表稿已通过方向审阅。采用 create-game-assets 的小批次／确定性标准化流程，不直接将生成图作为生产图集。

透明工具候选 V1/V2 存在红色边缘残留（主体alpha主要253/255，接近实心，不是严重透明）。改用内置image_gen生成纯绿色底源，再运行项目既有 `ai-asset-pipeline/src/run.py`，2行4列、128px、square、chroma、无autocrop，以保留统一画布。

源文件：`/Users/xmly/.codex/generated_images/01a06f75-de58-76b0-97c7-d4f7220e4583/exec-f9a2a223-c099-4e16-80bb-054fe5103310.png`。

本地8张切图：`output/exec-f9a2a223-c099-4e16-80bb-054fe5103310/resized/`，顺序 N/NE/E/SE/S/SW/W/NW，均128×128 RGBA。当前处于 docs 下被 PNG 忽略规则排除，不进运行包/Git。质量联络表在同目录上层 `contact_resized.png`；源与候选待CDN归档，未删除唯一来源。

像素检查：每帧3946–4605个完全不透明像素，10670–11620个完全透明像素；强绿残留（G>150且大于R/B各1.7倍、alpha>32）均0。红色阈值同样会计入铜金材料，不能用它宣称红边绝对为0；联络表人工检查未见原先明显红色外轮廓。实际战场小尺寸仍待验收。

八帧单级解码内存524288字节，三级机枪预计1572864字节，不含底座/图集/冷凝；现有纹理预算仍失败。必须替换旧炮头且按需加载，不能把增量当作免费资源。

新增纯表现模块 `EightDirectionTowerAim`：八向选择、边界4°迟滞、每帧独立注册的双炮口坐标。尚未挂到正式Cocos渲染器；具体炮口/轴点仍须对实际切图测量，不能使用猜测注册值。三级家族和冷凝外观尚未制作。

生成源提示：保留认可的八个深蓝铜金双管炮头，4×2顺序与固定光照，纯不透明绿色背景；无底座、标注、网格、炮火和弹迹；用于确定性切图去背，禁止重设计。

用户选择“八方向”，并确认推进。该确认批准制作代表稿，不等于批准尚未生成的稿件或完整美术家族。

本轮仅制作机枪塔代表审稿板，保持铜金、深蓝搪瓷、双炮管与固定夜城光照。底座不随朝向旋转；炮头八方向应通过重新绘制透视表达，不以整张图平面旋转替代。冷凝塔与三级外观在代表稿确认后再扩展。

内置 image_gen；参考输入：本地 rivet-gun-head-v2.png、rivet-gun-base-v2.png、普通实际战场截图。审稿板为设计稿，不能直接当运行图集，不能把示意弹迹作为已验证的真实炮口坐标。

## 生成提示

Use case: stylized-concept. Asset type: standalone eight-direction turret art approval board, not a runtime sprite atlas. Use image 1 as turret identity/material reference, image 2 as fixed base reference, image 3 as the actual game's environment/palette reference. Produce one polished landscape design board with exactly eight equal cells, four columns by two rows, ordered N, NE, E, SE / S, SW, W, NW relative to screen. Each cell contains the same small brass-and-dark-navy-enamel twin-barrel rivet turret on the same stationary circular base, genuinely redrawn in the appropriate yaw perspective, with two parallel barrels aiming outward toward that screen direction. Camera remains fixed elevated three-quarter orthographic; northward barrels recede, southward barrels foreshorten toward viewer, east/west barrels show side profiles. Preserve the recognizable cog emblem where visible, brass rims, rivets, scale, pivot and worn navy housing. Base orientation and world-space warm upper-left light remain invariant across cells; do NOT rotate the entire image. Dark restrained slate-blue board, no ornate panel chrome. Within every cell a tiny warm muzzle glint at an anatomically plausible barrel tip and one thin short amber trajectory aligned with the firing axis demonstrates intended attachment, not a long laser. Small plain English direction labels outside art only. Render consistent detailed hand-painted game-quality material, no flat vector placeholders, no background buildings, no enemies, no extra towers or upgrade tiers, no clipped barrels, no watermark. Prioritize readable eight-way silhouettes and mechanically plausible twin-barrel geometry over decoration. This is a new concept derived from the existing identity, not a screenshot or final production asset.

## 验收边界

已生成独立板 `eight-direction-head-board-v1.png`（1536×1024），本地页面 `eight-direction-head.html`。图片被 docs PNG 忽略规则排除，不进 Git/运行包；候选未获批时不批量切图。生成文件原始路径：`/Users/xmly/.codex/generated_images/01a06f75-de58-76b0-97c7-d4f7220e4583/exec-c88099fa-0d19-4c79-8e7d-fe3fc1d4a8a4.png`。

初审：八方向轮廓可辨，材质延续；各方向炮头体量、齿轮布置和底座透视存在漂移，不能直接当生产图集。正式生产底座固定、炮头单独透明导出，剔除烘焙火花及弹迹。代表稿等待人工认可。

需人工确认造型与八方向可读性；生成后逐项检查方向、透视、固定光照与双炮管结构。正式接入仍需透明切图、稳定轴点、各方向独立炮口坐标、实际小尺寸浏览器对照、预算与战斗验证。本轮不修改正式贴图，不冻结最终版本。
