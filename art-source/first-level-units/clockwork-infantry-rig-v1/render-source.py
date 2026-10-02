"""复用工作区 Blender 渲染管线，一次并集归一化后导出四方向四相步态。"""
from __future__ import annotations

import argparse
import importlib.util
import json
import math
import sys
from pathlib import Path

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

DIRECTIONS = (("down",0),("left",270),("up",180),("right",90))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model",type=Path,required=True)
    parser.add_argument("--out",type=Path,required=True)
    parser.add_argument("--pipeline",type=Path,required=True)
    parser.add_argument("--size",type=int,default=256)
    args = parser.parse_args(sys.argv[sys.argv.index("--")+1:])
    out = args.out.resolve()
    if out.exists():
        raise SystemExit(f"渲染批次已存在，不覆盖：{out}")
    module_spec = importlib.util.spec_from_file_location("workspace_render_frames",args.pipeline.resolve()/"src/blender/render_frames.py")
    render = importlib.util.module_from_spec(module_spec)
    module_spec.loader.exec_module(render)
    render.clear_scene()
    render.setup_render(args.size)
    render.setup_camera(35,1.48)
    render.setup_lights()
    # 夜城现有画风的主光来自左上；沿用管线三点光参数，只翻转世界主光位置。
    bpy.data.objects["Key"].location.x = -2.8
    bpy.context.view_layer.update()
    pivot,meshes,imported = render.import_model(args.model.resolve())
    clip = render.animation_range(imported)
    if clip is None:
        raise SystemExit("导出的 GLB 没有完整动作，不能输出伪行走图集")
    poses = {name:render.frame_poses("animation",4,degrees,clip,True) for name,degrees in DIRECTIONS}
    # 必须把所有方向也放进同一次拟合；各方向分别贴边会在拐弯时发生大小变化。
    all_poses = [pose for direction in poses.values() for pose in direction]
    low,high = render.measure_union(pivot,meshes,all_poses)
    fit = render.normalize(pivot,meshes,all_poses,.78,(low,high))
    scene = bpy.context.scene
    out.mkdir(parents=True)
    evidence = []
    for name,direction_poses in poses.items():
        directory = out/f"walk-{name}"
        directory.mkdir()
        for index,(frame,degrees) in enumerate(direction_poses):
            scene.frame_set(frame)
            pivot.rotation_euler.z = math.radians(degrees)
            bpy.context.view_layer.update()
            origin = pivot.matrix_world@Vector((0,0,0))
            ground = world_to_camera_view(scene,scene.camera,origin)
            # 再检查实际重新导入的几何鞋底，纯 IK 数学测试不能证明 glTF 动画没有丢失。
            sole_heights = []
            for side in range(2):
                sole = next(mesh for mesh in meshes if mesh.name==f"Sole{side}")
                sole_low,_ = render.evaluated_bounds([sole])
                sole_heights.append(round((sole_low.z-origin.z)/pivot.scale.z,6))
            if abs(min(sole_heights))>0.001 or min(sole_heights)<-0.001:
                raise SystemExit(f"导入后的支撑鞋底不接地：{name}/{index} {sole_heights}")
            target = directory/f"frame-{index+1}.png"
            scene.render.filepath = str(target)
            bpy.ops.render.render(write_still=True)
            evidence.append({"direction":name,"frame":index,"sampleFrame":frame,
                             "groundAnchor":[round(ground.x,8),round(1-ground.y,8)],
                             "soleHeights":sole_heights,
                             "file":str(target.relative_to(out))})
    anchors = {tuple(entry["groundAnchor"]) for entry in evidence}
    if len(anchors)!=1:
        raise SystemExit(f"固定地面锚点漂移：{sorted(anchors)}")
    (out/"render-manifest.json").write_text(json.dumps({
        "sourceModel":str(args.model.resolve()),"blender":bpy.app.version_string,
        "sourceFrameSize":args.size,"cameraElevation":35,"directionRows":[name for name,_ in DIRECTIONS],
        "frameCount":len(evidence),"animationRange":clip,"sharedFit":fit,
        "groundAnchor":list(next(iter(anchors))),"frames":evidence,
        "status":"candidate-needs-native-scale-and-runtime-review"
    },ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"[directional-walk] {len(evidence)} 帧，共用拟合，锚点 {next(iter(anchors))} -> {out}")


if __name__=="__main__":
    main()
