"""同一个步兵源 rig 制作一次性倾倒；沿用行走世界比例，不用逐帧裁切掩盖漂移。"""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import math
import sys
from pathlib import Path

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

DIRECTIONS = (("down", 0), ("left", 270), ("up", 180), ("right", 90))
FALL_ANGLES = (0, 26, 61, 86)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--walk-manifest", type=Path, required=True)
    parser.add_argument("--pipeline", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])
    out = args.out.resolve()
    if out.exists():
        raise SystemExit(f"死亡批次已存在，不覆盖：{out}")
    walk = json.loads(args.walk_manifest.read_text(encoding="utf-8"))
    spec = importlib.util.spec_from_file_location("workspace_render_frames",
        args.pipeline.resolve() / "src/blender/render_frames.py")
    render = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(render)
    bpy.ops.wm.open_mainfile(filepath=str(args.source.resolve()))
    scene = bpy.context.scene
    scene.frame_set(1)
    # 先保留源首相的所有关节姿态，再移除行走曲线；不能让脚一边循环走路一边倾倒。
    for obj in list(scene.objects):
        obj.animation_data_clear()
    root = bpy.data.objects["ClockworkInfantry"]
    meshes = [obj for obj in scene.objects if obj.type == "MESH"]
    out.mkdir(parents=True)
    poses = []
    for index, angle in enumerate(FALL_ANGLES):
        frame = 1 + index * 3
        root.rotation_euler.x = math.radians(angle)
        root.location.z = 0
        for side in range(2):
            shoulder = bpy.data.objects[f"Shoulder{side}"]
            shoulder.rotation_euler.x = math.radians((24, -35, -48, -12)[index])
            shoulder.keyframe_insert(data_path="rotation_euler", frame=frame)
        bpy.context.view_layer.update()
        low, _ = render.evaluated_bounds(meshes)
        # 刚性玩偶倾倒后承重点由鞋底变为身体/头盔；平移到真实地面，不对图像 bbox 做注册补救。
        root.location.z = -low.z
        root.keyframe_insert(data_path="rotation_euler", frame=frame)
        root.keyframe_insert(data_path="location", frame=frame)
        eye = bpy.data.materials["amber lenses"].node_tree.nodes.get("Principled BSDF")
        eye.inputs["Emission Strength"].default_value = (2.0, 1.0, .2, .0)[index]
        eye.inputs["Emission Strength"].keyframe_insert(data_path="default_value", frame=frame)
        poses.append({"frame": frame, "fallDegrees": angle, "rootHeight": root.location.z})
    scene.render.fps = 40
    scene.frame_start, scene.frame_end = 1, 10
    scene.frame_set(1)
    bpy.ops.wm.save_as_mainfile(filepath=str(out / "clockwork-infantry-collapse.blend"))
    render.setup_render(512)
    render.setup_camera(35, 1.48)
    render.setup_lights()
    bpy.data.objects["Key"].location.x = -2.8
    bpy.context.view_layer.update()
    pivot = bpy.data.objects.new("SheetPivot", None)
    scene.collection.objects.link(pivot)
    root.parent = pivot
    fit = walk["sharedFit"]
    render.normalize(pivot, meshes, [(1, 0)], .90,
        (Vector(fit["unionLow"]), Vector(fit["unionHigh"])))
    # 倒地占幅更宽：扩大画布和机位两倍而保持模型世界缩放，消费端以两倍显示尺寸恢复同一像素比例。
    scene.camera.data.ortho_scale = 2.96
    evidence = []
    for name, degrees in DIRECTIONS:
        directory = out / "frames" / f"collapse-{name}"
        directory.mkdir(parents=True)
        for index, pose in enumerate(poses):
            scene.frame_set(pose["frame"])
            pivot.rotation_euler.z = math.radians(degrees)
            bpy.context.view_layer.update()
            origin = pivot.matrix_world @ Vector((0, 0, 0))
            low, _ = render.evaluated_bounds(meshes)
            floor_error = (low.z - origin.z) / pivot.scale.z
            if abs(floor_error) > .001:
                raise SystemExit(f"身体穿地/悬空：{name}/{index}: {floor_error}")
            ground = world_to_camera_view(scene, scene.camera, origin)
            target = directory / f"frame-{index + 1}.png"
            scene.render.filepath = str(target)
            bpy.ops.render.render(write_still=True)
            evidence.append({"direction": name, "index": index, **pose,
                "groundAnchor": [round(ground.x, 8), round(1-ground.y, 8)],
                "groundError": round(floor_error, 8), "file": str(target.relative_to(out))})
    anchors = {tuple(frame["groundAnchor"]) for frame in evidence}
    expected = (.5, .5 + (walk["groundAnchor"][1] - .5) / 2)
    if len(anchors) != 1 or abs(next(iter(anchors))[1] - expected[1]) > .000001:
        raise SystemExit(f"与行走地面锚点不相容：{anchors}, expected {expected}")
    (out / "render-manifest.json").write_text(json.dumps({
        "sourceModel": str(args.source.resolve()),
        "sourceSha256": hashlib.sha256(args.source.read_bytes()).hexdigest(),
        "blender": bpy.app.version_string, "frameCount": len(evidence),
        "sourceFrameSize": 512, "outputCellSize": 256, "displayScaleFromWalk": 2,
        "cameraElevation": 35, "groundAnchor": list(next(iter(anchors))),
        "walkFit": fit, "loop": False, "durationMs": [75, 75, 75, 75],
        "frames": evidence, "status": "candidate-needs-native-scale-and-runtime-review",
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"[directional-collapse] {len(evidence)} 真实帧，沿用行走比例，锚点 {anchors}")


if __name__ == "__main__":
    main()
