# 贴图采样独立对照 / 待清晰度确认

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
