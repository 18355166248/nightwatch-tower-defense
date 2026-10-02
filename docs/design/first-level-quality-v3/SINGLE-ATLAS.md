# 单张小动态图集：已接入，非全阶段预算通过

当前普通入口：`http://127.0.0.1:4176/?build=quality-v3-single-atlas-final`。
当前main SHA256：`b329a8c14036b91241fd3d6c6952fdd831bc5320f8c6676bc4a834cbc62c9a58`。
候选/控制组同构建SHA256：`cfc9bb8c50e9a247521774d081aae00014af233d0e8229eda8ad899e2719daa7`。

## 为什么调整

上一轮已释放背景、隐藏文字，但往返首页仍由1张变2张512²动态图集，多驻留1,048,576字节。只为确实测出的额外分配调整上限：默认`textureSize=512,maxAtlasCount=1,maxFrameSize=128`；显式`renderBudget=double-atlas`保留上一版对照，`legacy-atlas`保留旧引擎默认对照。不会开启原来禁用的图集，已有图集拒绝迟到修改，不重置图集、不清全局缓存、不改图片尺寸/像素/字号。

Cocos Creator 3.8.8本地`atlas-manager.ts`的`insertSpriteFrame`容量不足返回null；`packToDynamicAtlas`仅在成功时替换帧，所以满容量的精灵继续用原纹理，不丢失按钮或图标。策略由独立模块/测试维护，Bootstrap只在视图创建前应用。

## 发布浏览器实测

1280×720浏览器内竖屏游戏；普通自由布防，机枪(4,3)/冷凝(4,7)，70金，14格路线，普通1×开局后暂停，再确认返回首页。不是QA布阵/2×，也不是完整八波验收。

| 场景 | 双图集上限 | 单图集上限 |
| --- | ---: | ---: |
| 首波暂停总GFX纹理字节 | 11,111,104 | 10,062,528 |
| 暂停Draw calls | 44 | 47 |
| 返回首页总GFX纹理字节 | 9,362,368 | 8,313,792 |
| 返回首页图集张数 | 2 | 1 |

减少1MiB额外图集。首页冷启动和本次往返均约7.93MiB，低于8MiB；暂停约9.60MiB仍超预算，战斗/选塔/胜败等未因此放行。Draw calls增加3，未测帧时间，不据此称FPS改善或无性能代价。

## 视觉对照

候选首页、无塔战场、返回首页与上一版截图逐RGBA相同。同一候选构建开关对照的暂停面板区域（x484..795,y196..531）变化0；全图变化2,945通道、最大差31，两次时钟0.1167/0.1秒不同，**不称全图逐像素一致**。

正式默认无需候选参数，实测暂停1张图集/10,062,528字节/47draw calls；返首页1张/8,313,792/20draw calls。正式首页及返首页与候选截图逐RGBA一致，正式暂停面板与双图集控制组变化0。浏览器本轮warn/error0。

证据目录：`/private/tmp/nightwatch-confirmation-fidelity-aeMb8G/`，截图`single-atlas-home.png`、`single-atlas-battle.png`、`single-atlas-pause.png`、`single-atlas-control-pause.png`、`single-atlas-home-return.png`、`single-atlas-final-home.png`、`single-atlas-final-pause.png`、`single-atlas-final-home-return.png`。232项规则、10项美术契约、全运行类型和diff检查通过；发布构建完成，既有Creator诊断保留。

仍需处理战斗/暂停/结算预算、炮头/弹道/命中位置与锁定、真实后台恢复，冻结最终同构建后普通1×三局八波及用户最终视觉确认。本阶段不冻结，最终普通三局仍0。
