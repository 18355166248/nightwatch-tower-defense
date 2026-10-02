# 步兵朝下四帧行走候选 v1

生成器：内置 image_gen；provider=codex-imagegen；cost=platform-included-or-unknown。
参考：../clockwork-infantry.png，项目现有铜蓝机械步兵身份与材质。
状态：rejected-candidate，动作注册未通过；不接入运行目录。测量与拒收理由见 ../clockwork-infantry-down-walk-v2/notes.md。
读取顺序：2×2 左上、右上、左下、右下；实测原图 1254×1254，每帧 627×627 源画布，目标 128×128。
锚点：左上原点 (0.5, 0.84)；四帧脚掌承重点必须一致；不逐帧裁切或缩放。

## 完整提示词

Create a single 2x2 sprite sheet with exactly FOUR animation frames of the same copper-and-navy wind-up robot infantry shown in the reference. Reference is identity/material/camera reference, not a layout. This is a production animation candidate for a top-down 2.5D orthographic tower-defense game. Preserve the round copper head, two amber eye lenses, dark navy enamel body, chest gear, thick boots, chunky limbs and back winding key. Simplify micro scratches at small display size without redesigning the character.
ALL FOUR frames face screen DOWN, front-facing, with a fixed slightly elevated orthographic camera (~35 degrees above ground). No three-quarter sideways yaw. Same scale, same head dimensions, same overhead lighting from upper left, same front-facing body, same ground center.
Square 2x2 equal grid, no visible grid lines or text. Reading order top-left, top-right, bottom-left, bottom-right. Full four-phase WALK cycle: 1 left boot forward/right back with opposite arm swing, 2 passing stance left boot returning/right boot lifting, 3 right boot forward/left back with opposite arm swing, 4 passing stance right returning/left lifting. Clearly articulated stepping, not four identical poses. The standing foot soles rest on the same baseline at 84% of EACH cell height, ground midpoint x50%. Head top ~15%, feet baseline84%, body width about55% per cell. Keep the full robot safely within each square with generous transparent margins. No weapons, no text, no labels, no cast shadow, no ground plane, no glow outside the eyes, no extra robots, no perspective change. Genuine transparent background. The four cell canvases must be identical and uniformly centered, suitable for uniform slicing WITHOUT independent per-frame cropping. Target runtime per-frame canvas128x128, visible sprite about90px high. Make coherent polished game sprites, not a contact sheet of design variants.
