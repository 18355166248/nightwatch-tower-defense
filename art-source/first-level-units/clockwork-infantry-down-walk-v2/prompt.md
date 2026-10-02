# 步兵朝下四帧行走候选 v2

生成器：内置 image_gen；provider=codex-imagegen；cost=platform-included-or-unknown。
编辑目标：../clockwork-infantry-down-walk-v1/source.png。
状态：rejected-candidate；一次针对基线的重试仍未通过，详见 notes.md，不扩大到其他方向。
2×2 左上、右上、左下、右下；同画布均匀切分；禁止逐帧裁切/缩放。
目标：128×128，左上原点锚点 (0.5,0.84)。

## 完整提示词

Edit the supplied 2x2 walk sprite sheet ONLY to fix frame registration and phase order. Keep EXACTLY the same copper/navy robot identity, front/down facing camera, round head, materials, scale and four-cell square layout, with transparent background. No redraw variants, no style change.
The current sheet has bad vertical drift between frames. EACH cell must use an identical ground anchor at (50%,84%) and at least ONE weight-bearing boot sole touching exactly y84% of its local cell. Every frame's robot head crown at y10% (allow no more than 1% bob), same shoulder width, same robot height. No character or key approaches any cell edge. Keep standing boot at ground line, swinging boot can rise but NEVER let the whole body float off ground. Do not independently enlarge characters in bottom row.
Order top-left=left leg forward/right back, top-right=left supporting body/right passing and lifting, bottom-left=right forward/left back, bottom-right=right supporting/left passing and lifting. Arms swing opposite the legs. Between the two passing poses the torso and head stay the same so the cycle reads as alternating feet, not sliding images. Full four-phase walking loop. Remove the severe baseline differences, particularly lower-right floating stance. Genuine transparent background, no cast shadows or ground, no labels/grid lines. Same camera and lighting all frames. This is a tightly registered animation sheet, not four separate illustrations.
