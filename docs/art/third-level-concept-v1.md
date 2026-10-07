# 钢铁堡垒代表画面 v1

日期：2026-10-07；对应规格 v1.1 / T01。

- 本地预览：`../poc/third-level-steel-fortress-concept-v1.png`（941×1672，按仓库约定忽略概念截图，不作为运行资源提交）。
- 来源：内置 imagegen，现有 `assets/resources/level-one/backdrop.jpg` 为画风参考；没有使用参考截图里的游戏素材。
- 定位：第三关场景、坦克／护盾兵、穿甲炮／电弧塔与四选项建造环的概念真值。
- 状态：已生成，待用户视觉反馈；未生产整套角色资源，未导入运行时。
- 保留方向：铜／钢轮廓、深蓝夜景、青色能量、暖色工坊灯光；背景细节集中于两侧。
- 已发现差异：生成图未准确落实 9×13 格；顶部生命、金币、波数是生成的示意值；坦克履带轮廓需要加强；菜单按钮遮住相邻格，实际布局必须留出点击空间。
- 实现边界：背景、单位、菜单分别生产，整张效果图禁止直接充当可交互战场。手机可读性、锚点、动画与资源预算尚未验证。

## 最终生成提示词

```text
Use case: ui-mockup. Create one high fidelity portrait mobile tower-defense battle concept for Nightwatch, third stage Steel Fortress. Reference image is existing game's night-city background; preserve illustrated steampunk copper, teal, warm amber versus deep navy art direction. New distinct industrial fortress scene: steel floor, armored workshops and thick pipes at side edges, warning lamps, heavy foundry gateway above and reactor below on central vertical axis. Orthographic playable central board exactly 9 columns by 13 rows, subtly readable low-contrast square cells, straight entry and exit outside board centered. A few small treaded heavily armored tanks and shield-bearing mechanical guards on winding forecast route, clearly readable bronze and cyan silhouettes. Show rivet machine gun tower, frost tower, long barreled piercing cannon, twin-pronged electrical arc tower. Show a selected empty build site near middle and compact copper circular radial build menu with FOUR square illustrated tower portraits and black gold price badges reading 30,40,60,65. Menu center transparent shows selected cell. Leave substantial distance so adjacent rows visible. No rectangular text cards. Restrained small dark HUD at top, compact four tower tray below. Polished hand painted stylized game illustration, readable silhouettes at mobile scale, atmospheric side decorations but uncluttered middle. This is a representative concept only; not a production background. Avoid watermarks, logos, exaggerated bloom, copied fantasy castles, arbitrary skill branches.
```
