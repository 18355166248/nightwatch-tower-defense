"""机械双足的四相步态；与 Blender 和游戏引擎无关，便于独立验证接地/闭环。"""
from __future__ import annotations

import math

HIP_HEIGHT = 0.73
BONE_LENGTH = 0.33
ANKLE_HEIGHT = 0.15


def leg_pose(phase: int, side: int) -> dict:
    # 左右相隔半圈：伸腿双支撑 -> 一脚承重一脚经过 -> 对侧伸腿 -> 对侧经过。
    local_phase = (phase + (2 if side == 1 else 0)) % 4
    y = (-0.18, 0.0, 0.18, 0.0)[local_phase]
    lift = (0.0, 0.0, 0.0, 0.14)[local_phase]
    ankle_z = ANKLE_HEIGHT + lift
    dy, dz = y, ankle_z - HIP_HEIGHT
    distance = math.hypot(dy, dz)
    if distance >= 2 * BONE_LENGTH:
        raise ValueError("脚目标超过双段机械腿可达范围")
    # 膝盖总朝角色前方弯；解几何交点保证关节接合，而不是把脚单独挪离腿部。
    bend = math.sqrt(BONE_LENGTH ** 2 - distance ** 2 / 4)
    knee_y = dy / 2 + dz / distance * bend
    knee_z = HIP_HEIGHT + dz / 2 - dy / distance * bend
    upper = math.atan2(knee_y, HIP_HEIGHT - knee_z)
    lower = math.atan2(y - knee_y, knee_z - ankle_z)
    return {"ankle": (y, ankle_z), "knee": (knee_y, knee_z),
            "upper": upper, "lower_local": lower - upper, "sole_height": lift}


def arm_angle(phase: int, side: int) -> float:
    # 同侧手与前伸脚反向摆动；机械关节动作幅度控制在厚甲轮廓内。
    return math.radians((24, 0, -24, 0)[(phase + (2 if side == 1 else 0)) % 4])
