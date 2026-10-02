import type { DirectionalHeadRegistration, TowerHeadDirection } from './EightDirectionTowerAim';

const point = (x: number, y: number) => ({ x: x / 128, y: y / 128 });
const registration = (px: number, py: number, ax: number, ay: number, bx: number, by: number): DirectionalHeadRegistration =>
    ({ pivot: point(px, py), muzzles: [point(ax, ay), point(bx, by)] });

/** 对128透明基础切图逐帧标定，图片坐标Y向下；后续升级帧必须独立复核，不沿用猜值。 */
export const RIVET_HEAD_REGISTRATIONS: Readonly<Record<TowerHeadDirection, DirectionalHeadRegistration>> = {
    north: registration(68, 102, 54, 31, 82, 31),
    'north-east': registration(61, 101, 70, 29, 93, 42),
    east: registration(61, 99, 101, 49, 104, 73),
    'south-east': registration(62, 92, 100, 72, 79, 89),
    south: registration(68, 87, 55, 107, 83, 107),
    'south-west': registration(67, 94, 29, 86, 47, 101),
    west: registration(66, 99, 21, 53, 20, 78),
    'north-west': registration(64, 100, 33, 39, 54, 21),
};
