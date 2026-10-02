"""项目自有步兵参考 -> 本地可编辑机械关节模型；不涉及游戏规则。"""
from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
from clockwork_walk_motion import BONE_LENGTH, HIP_HEIGHT, arm_angle, leg_pose


def material(name, color, metallic=0.0, roughness=0.4, emission=0.0):
    result = bpy.data.materials.new(name)
    result.use_nodes = True
    bsdf = result.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if emission:
        bsdf.inputs["Emission Color"].default_value = (*color, 1)
        bsdf.inputs["Emission Strength"].default_value = emission
    return result


def empty(name, parent=None, location=(0, 0, 0)):
    obj = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(obj)
    obj.parent, obj.location = parent, location
    return obj


def finish(name, mat, parent, location, scale, rotation=(0, 0, 0), bevel=0):
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.parent, obj.location, obj.rotation_euler = parent, location, rotation
    obj.data.materials.append(mat)
    if bevel:
        modifier = obj.modifiers.new("Soft enamel edges", "BEVEL")
        modifier.width, modifier.segments = bevel, 3
    for poly in obj.data.polygons:
        poly.use_smooth = True
    return obj


def ball(name, mat, parent, location, scale):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=16, radius=1)
    return finish(name, mat, parent, location, scale)


def box(name, mat, parent, location, scale, bevel=0.04):
    bpy.ops.mesh.primitive_cube_add(size=1)
    return finish(name, mat, parent, location, scale, bevel=bevel)


def cylinder(name, mat, parent, location, radius, depth, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=radius, depth=depth)
    return finish(name, mat, parent, location, (1, 1, 1), rotation, bevel=0.008)


def ring(name, mat, parent, location, radius, thickness, rotation=(math.pi/2, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=radius, minor_radius=thickness,
                                   major_segments=32, minor_segments=8)
    return finish(name, mat, parent, location, (1, 1, 1), rotation)


def gear(name, mat, parent, radius, location):
    # 真实连续齿廓代替独立圆滑小块：小尺寸下仍应读成一个齿轮，而不是一圈珠子。
    count = 32
    outline = [(radius*(1 if i%4 in (1,2) else .77)*math.cos(i*math.tau/count),
                radius*(1 if i%4 in (1,2) else .77)*math.sin(i*math.tau/count)) for i in range(count)]
    vertices = [(x,y,z) for y in (-.020,.020) for x,z in outline]
    faces = [tuple(range(count-1,-1,-1)),tuple(range(count,count*2))]
    faces += [(i,(i+1)%count,(i+1)%count+count,i+count) for i in range(count)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices,[],faces)
    mesh.update()
    obj = bpy.data.objects.new(name,mesh)
    bpy.context.scene.collection.objects.link(obj)
    obj.parent,obj.location = parent,location
    obj.data.materials.append(mat)
    bevel = obj.modifiers.new("Gear rim bevel","BEVEL")
    bevel.width,bevel.segments = .004,2
    return obj


def build():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    brass = material("brushed copper brass", (0.56, 0.27, 0.055), .78, .29)
    bright = material("polished brass trim", (0.8, .46, .13), .74, .25)
    navy = material("deep navy enamel", (.027, .065, .13), .30, .32)
    black = material("joint and sole rubber", (.015, .02, .028), .1, .68)
    eyes = material("amber lenses", (1.0, .38, .012), .0, .20, 2.0)
    root = empty("ClockworkInfantry")
    body = empty("BodyShell", root)
    box("PelvisEnamel", navy, body, (0, 0, .83), (.49, .34, .20), .075)
    box("ChestEnamel", navy, body, (0, 0, 1.14), (.72, .43, .62), .105)
    box("BeltBrass", brass, body, (0, -.015, .89), (.57, .37, .065), .025)
    for side in (-1, 1):
        box(f"ChestPlate{side}", navy, body, (side*.19, -.22, 1.20), (.24, .045, .40), .022)
        for z in (1.02, 1.34):
            ball(f"ChestRivet{side}{z}", bright, body, (side*.23, -.26, z), (.038, .016, .038))
    cylinder("GearHubBlack", black, body, (0, -.243, 1.10), .16, .025, (math.pi/2,0,0))
    cylinder("GearHubBrass", bright, body, (0, -.269, 1.10), .128, .029, (math.pi/2,0,0))
    gear("ChestGear",bright,body,.187,(0,-.271,1.10))
    cylinder("GearCenter", brass, body, (0, -.294, 1.10), .071, .036, (math.pi/2,0,0))
    cylinder("NeckCollar", brass, body, (0,0,1.46), .18,.10)
    head = empty("HeadAssembly", body, (0,0,1.78))
    ball("CopperHelmet", brass, head, (0,0,0), (.53,.445,.45))
    for side in (-1,1):
        cylinder(f"EarJoint{side}", black, head, (side*.515,0,-.035), .125,.06,(0,math.pi/2,0))
        cylinder(f"EarBrass{side}", bright, head, (side*.55,0,-.035), .103,.04,(0,math.pi/2,0))
        cylinder(f"EyeSocket{side}", black, head, (side*.22,-.419,.015), .15,.046,(math.pi/2,0,0))
        ring(f"EyeRim{side}", bright, head, (side*.22,-.462,.015), .128,.019)
        ball(f"AmberEye{side}", eyes, head, (side*.22,-.469,.015), (.112,.042,.112))
        ball(f"LensGlint{side}", bright, head, (side*.22-.028,-.513,.050), (.014,.009,.014))
    box("HelmetCenterSeam", black, head, (0,-.443,.045), (.015,.009,.23), .004)
    for z in (.17,-.105):
        ball(f"HelmetFastener{z}", bright, head, (0,-.435,z), (.024,.012,.024))
    box("MouthSlot", black, head, (0,-.324,-.24), (.25,.020,.04), .012)
    cylinder("CrownCap", bright, head, (0,0,.429), .15,.035)
    ball("CrownButton", brass, head, (0,0,.467), (.072,.072,.065))
    box("BackPack", navy, body, (0,.245,1.12), (.32,.16,.37), .06)
    for i in range(3):
        box(f"BackVent{i}", black, body, (0,.331,1.05+i*.08), (.23,.015,.025), .005)
    cylinder("WindingShaft", brass, body, (.22,.41,1.50), .048,.32,(math.pi/2,0,0))
    box("WindingKeyBridge", bright, body, (.22,.58,1.50), (.26,.042,.07), .016)
    for side in (-1,1):
        ring(f"WindingKeyLoop{side}", bright, body, (.22+side*.19,.58,1.50), .115,.032)
    arms, hips, knees, feet = [],[],[],[]
    for i, side in enumerate((-1,1)):
        shoulder = empty(f"Shoulder{i}", root, (side*.44,0,1.32))
        ball(f"ShoulderJoint{i}", bright, shoulder, (0,0,0), (.145,.145,.145))
        cylinder(f"UpperArm{i}", navy, shoulder, (0,0,-.18), .116,.27)
        cylinder(f"ArmUpperCuff{i}", brass, shoulder, (0,0,-.31), .124,.05)
        ball(f"Elbow{i}", black, shoulder, (0,0,-.34), (.096,.096,.096))
        cylinder(f"Forearm{i}", navy, shoulder, (0,-.025,-.46), .143,.23)
        cylinder(f"WristCuff{i}", bright, shoulder, (0,-.025,-.56), .15,.05)
        ball(f"Fist{i}", navy, shoulder, (0,-.045,-.65), (.16,.17,.16))
        arms.append(shoulder)
        hip = empty(f"Hip{i}", root, (side*.21,0,HIP_HEIGHT))
        ball(f"HipJoint{i}", black, hip, (0,0,0), (.105,.105,.105))
        cylinder(f"Thigh{i}", navy, hip, (0,0,-BONE_LENGTH/2), .106,BONE_LENGTH)
        knee = empty(f"Knee{i}", hip, (0,0,-BONE_LENGTH))
        ball(f"KneeBrass{i}", brass, knee, (0,0,0), (.122,.122,.122))
        cylinder(f"Shin{i}", navy, knee, (0,0,-BONE_LENGTH/2), .13,BONE_LENGTH)
        cylinder(f"ShinTrim{i}", bright, knee, (0,0,-BONE_LENGTH+.035), .139,.055)
        foot = empty(f"Foot{i}", root)
        # 以踝关节为原点：鞋底的局部最低点固定 -0.15，承重目标踝高 0.15 时恰好接地。
        box(f"Boot{i}", navy, foot, (0,-.07,-.06), (.29,.38,.14), .036)
        ball(f"BootToe{i}", brass, foot, (0,-.16,-.065), (.17,.19,.08))
        box(f"Sole{i}", black, foot, (0,-.07,-.135), (.30,.39,.03), .012)
        hips.append(hip); knees.append(knee); feet.append(foot)
    # 金属肢体无需软蒙皮；关节层级与足底 IK 同时驱动，模型始终保持完整且支撑脚不悬空。
    for phase in range(5):
        frame = 1+phase*4
        for side in range(2):
            pose = leg_pose(phase,side)
            hips[side].rotation_euler.x = pose["upper"]
            knees[side].rotation_euler.x = pose["lower_local"]
            feet[side].location = ((-1 if side==0 else 1)*.21,*pose["ankle"])
            arms[side].rotation_euler.x = arm_angle(phase,side)
            for obj,channel in ((hips[side],"rotation_euler"),(knees[side],"rotation_euler"),
                                (feet[side],"location"),(arms[side],"rotation_euler")):
                obj.keyframe_insert(data_path=channel,frame=frame)
    bpy.context.scene.render.fps = 32
    bpy.context.scene.frame_start, bpy.context.scene.frame_end = 1,17
    bpy.context.scene.frame_set(1)
    return root


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out",type=Path,required=True)
    args = parser.parse_args(sys.argv[sys.argv.index("--")+1:])
    out = args.out.resolve()
    if out.exists():
        raise SystemExit(f"模型批次已存在，不覆盖：{out}")
    out.mkdir(parents=True)
    build()
    bpy.ops.wm.save_as_mainfile(filepath=str(out/"clockwork-infantry.blend"))
    # 场景合并为一条动作，避免 glTF 默认按部件拆成多条后只有一条被导入器播放。
    bpy.ops.export_scene.gltf(filepath=str(out/"clockwork-infantry-walk.glb"),export_format="GLB",
                             export_animation_mode="SCENE",export_anim_scene_split_object=False,
                             export_frame_range=True,export_force_sampling=True)


if __name__=="__main__":
    main()
