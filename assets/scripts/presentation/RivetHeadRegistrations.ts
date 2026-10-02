import type { DirectionalHeadRegistration, TowerHeadDirection } from './EightDirectionTowerAim';

const point = (x: number, y: number) => ({ x: x / 128, y: y / 128 });
const registration = (px: number, py: number, ax: number, ay: number, bx: number, by: number): DirectionalHeadRegistration =>
    ({ pivot: point(px, py), muzzles: [point(ax, ay), point(bx, by)] });

/** 128透明切图逐帧标定，图片坐标Y向下；二/三级锁定原炮管及画布，切图复核后共用轴点。 */
export const RIVET_HEAD_REGISTRATIONS: Readonly<Record<TowerHeadDirection, DirectionalHeadRegistration>> = {
    north: registration(68, 102, 54, 31, 82, 31),
    'north-east': registration(61, 101, 70, 29, 93, 42),
    east: registration(61, 99, 101, 49, 104, 73),
    'south-east': registration(62, 92, 100, 72, 79, 89),
    south: registration(68, 87, 55, 77, 82, 77),
    'south-west': registration(67, 94, 27, 55, 47, 69),
    west: registration(66, 99, 22, 40, 20, 64),
    'north-west': registration(64, 100, 32, 34, 54, 18),
};
