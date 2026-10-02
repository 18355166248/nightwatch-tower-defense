# 贴图采样独立对照 / B 已确认并接入

## 当前接入结果（2026-10-02）

用户回复“那就用B”。已将六图 B 接入，批准指的是相对原图的采样清晰度，不表示最终预算或整阶段验收通过。下面原评审过程作为历史保留。

运行入口：`http://127.0.0.1:4176/?build=quality-v3-sampling-b`。main SHA256：`422e5baafd0d64a77848569d0246513f3557b2e3693ac1ba51a6d8ea8b849bab`。未冻结最终验收构建。

- 五张 UI 采用无量化 PNG 编码，背景采用无损 WebP（785,262字节），全部逐像素核对与获批 B 的 RGBA 一致。采样本身不称无损；格式编码没有追加画质损失。
- 保留逻辑资源路径与 UUID，删除旧 JPEG 避免同资源重复。原 JPEG 和旧六图元数据备份于`/private/tmp/nightwatch-sampling-b-originals-20261002`；独立原图/A/B评审按既有 CDN 归档机制保存。
- 面板 inset 从42源像素调整为31.5，节点边框补偿4/3，保持原设计42的显示宽度；显式边框宽度同样保持。没有缩放字体、页面矩形或输入热区。
- 首页资源缓存实测8,107,232字节（7.73MiB），离开首页后战场/暂停/设置6,732,032字节（6.42MiB），与理论减量一致。正常布塔两塔、金币70、路线14格，暂停计时停在0.1秒。405宽和320窄屏设置页无裁切，浏览器warn/error捕获0。
- 224项规则测试通过，10项美术契约通过，运行脚本类型检查通过。Creator发布构建完成，已有配置诊断不能冒称无构建告警。
- **静态43图全集仍为9,090,272字节（8.67MiB），全集传输3,371,846字节（3.22MiB）**；整包11,981,188字节（11.43MiB）。保守8MiB/3MiB合集门禁仍失败，20MiB整包通过；未改预算。分阶段资源缓存不等于含标签/动态图集的全部GPU内存，也不等于首屏网络实测。

截图与日志：`/private/tmp/nightwatch-confirmation-fidelity-aeMb8G/sampling-b-{home,battle,pause,settings,settings-320}.png`，`sampling-b-webp-budget.json`及`sampling-b-final-tests.log`。需要继续核对首屏实际请求、结算/重开峰值与预算作用域，之后才冻结三局普通1×八波；本次短回归不能计入最终三局。

QA 2×失败短回归：第二波16/18击杀、漏2、核心0/2，结算七图加载成功，缓存7,387,392字节（7.05MiB）；重新部署下一帧降回6,732,032，结算不可见。仅验证资源和共用面板，不算普通1×八波。截图`sampling-b-defeat-qa.png`。

18张评审附件已逐一上传、下载核对 SHA256，CDN 原字节地址保存在`texture-review-generated/manifest.json`及`art-source/cdn-image-manifest.json`。已删除项目本地附件7,639,198字节，可按原字节 URL 恢复；运行图片没有改成联网加载。页面固定读取原字节 URL，不把 TinyPNG 量化预览冒充批准的 B。压缩服务末项等待过久，归档脚本新增30秒超时回退；补齐归档后再删除，保留未验证文件。

### 历史评审（接入前）

用户已允许先制作采样对照、确认后再接入。原图、运行代码、发布构建与预算均未改变。

入口：`http://127.0.0.1:4190/docs/design/first-level-quality-v3/texture-sampling.html`。
原图 / A / B 可切换，提供游戏宽度335、320、390、405px。两栏不擅自缩小；视口不够时横向滚动。不是横屏游戏适配，也不是用运行截图替代设计稿。

## 候选尺寸

| 资源 | 原尺寸 | A 保守 | B 较小 |
| --- | --- | --- | --- |
| 背景 | 941×1672 | 768×1365 | 640×1137 |
| HUD | 1440×232 | 1024×165 | 864×139 |
| 塔栏 | 982×226 | 768×177 | 640×147 |
| 启用按钮 | 332×277 | 240×200 | 160×133 |
| 禁用按钮 | 205×184 | 192×172 | 160×144 |
| 面板 | 512×496 | 448×434 | 384×372 |

全画布等比Lanczos3采样到PNG，隔离JPEG重编码影响；不改构图、颜色设定或生成新美术。九宫格面板只做源纹理对照，不假装CSS完整图缩放就是Cocos九宫格还原。接入时需按采样比例调整inset并保持最终边框宽度，再逐页实测。

六图RGBA理论值：原10,052,000字节，A6,514,688，B4,516,096。基于上一批实测基础缓存12,267,936字节，单纯替换六图的理论基础缓存A8,730,624（8.33MiB）、B6,732,032（6.42MiB）；这不是引擎实测，不能据此宣布通过。

B的全43图静态合集仍约9,090,272字节（8.67MiB），保守合集门禁仍会失败。生命周期分阶段驻留和静态全集是不同口径，不能通过偷删资源、修改预算或只选好看的指标伪造通过。确认采样后须同时报告静态合集、首屏实际请求与各阶段引擎缓存，明确预算合同，再冻结验收。

## 无损留白审计

`audit-ui-texture-padding.cjs`校验预算中的源图SHA256，审核normal集合23张quality UI图，保留一像素过滤安全边界后，理论裁边上限156,624字节（约0.15MiB）。不足以解决当前缺口；透明像素RGB/过滤边缘与原画布锚点仍需验证，不因alpha=0就擅自裁掉。222项规则测试通过，其中新增4项审核边界/输入校验测试；当前运行构建仍为前一批，不冒称新游戏功能已发布。

浏览器实测A/B切换、335/320宽度切换正常；12张当前对照图全部加载成功，错误提示为空，捕获warn/error为0。默认原图/B完整截图`/private/tmp/nightwatch-confirmation-fidelity-aeMb8G/texture-sampling-B-full.png`。页面只审核材质采样，不宣称文字、九宫格或GPU保真已通过。

## 复现与文件边界

```sh
node scripts/preview-texture-sampling.cjs /Users/xmly/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp
node scripts/audit-ui-texture-padding.cjs /private/tmp/nightwatch-confirmation-fidelity-aeMb8G/result-lease-budget-before-build.json /Users/xmly/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp /private/tmp/nightwatch-confirmation-fidelity-aeMb8G/ui-padding-audit.json
```

仅写`texture-review-generated/`评审附件；该目录和图片被Git忽略。生成的manifest包含源图SHA256、尺寸、理论字节和候选状态，源文件位于原有`assets/resources`。本批不上传/删除源图，不把候选当正式切图交付；批准后的最终规格及CDN归档另行处理。附件缺失时网页明确提示重新生成，不显示空板冒充已完成。

## 接入前的人工决策与后续门禁

请决定原图/A/B在实际显示尺寸下的清晰度。B不是默认获批方案；原图仍是正式游戏基线。若都不认可，保持原图并重新评估优化路径，不能自动循环降尺寸。

获准后按小批接入、同尺寸对照，重点检查边框铆钉、城市边缘、石砖纹理、字体遮挡及320窄屏；资源失败和回退也应在已批准档内。重新测量驻留、传输与性能，再冻结同一构建完成三局普通1×八波、胜败、重开、动态改路与异常恢复。用户视觉确认和工程验收分开，所有要求未满足前不标记阶段完成。
