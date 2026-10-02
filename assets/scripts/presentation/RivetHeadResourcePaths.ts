import type { TowerHeadDirection } from './EightDirectionTowerAim';

/** 运行加载与静态预算共享唯一显式清单，不让等级拼接路径逃过资源门禁。 */
export const RIVET_HEAD_RESOURCE_PATHS: Readonly<Record<1 | 2 | 3, Readonly<Record<TowerHeadDirection, string>>>> = {
    1: {
        'north': 'level-one/units/rivet-head-eight-v1/north/spriteFrame',
        'north-east': 'level-one/units/rivet-head-eight-v1/north-east/spriteFrame',
        'east': 'level-one/units/rivet-head-eight-v1/east/spriteFrame',
        'south-east': 'level-one/units/rivet-head-eight-v1/south-east/spriteFrame',
        'south': 'level-one/units/rivet-head-eight-v1/south/spriteFrame',
        'south-west': 'level-one/units/rivet-head-eight-v1/south-west/spriteFrame',
        'west': 'level-one/units/rivet-head-eight-v1/west/spriteFrame',
        'north-west': 'level-one/units/rivet-head-eight-v1/north-west/spriteFrame',
    },
    2: {
        'north': 'level-one/units/rivet-head-eight-level-2-v1/north/spriteFrame',
        'north-east': 'level-one/units/rivet-head-eight-level-2-v1/north-east/spriteFrame',
        'east': 'level-one/units/rivet-head-eight-level-2-v1/east/spriteFrame',
        'south-east': 'level-one/units/rivet-head-eight-level-2-v1/south-east/spriteFrame',
        'south': 'level-one/units/rivet-head-eight-level-2-v1/south/spriteFrame',
        'south-west': 'level-one/units/rivet-head-eight-level-2-v1/south-west/spriteFrame',
        'west': 'level-one/units/rivet-head-eight-level-2-v1/west/spriteFrame',
        'north-west': 'level-one/units/rivet-head-eight-level-2-v1/north-west/spriteFrame',
    },
    3: {
        'north': 'level-one/units/rivet-head-eight-level-3-v1/north/spriteFrame',
        'north-east': 'level-one/units/rivet-head-eight-level-3-v1/north-east/spriteFrame',
        'east': 'level-one/units/rivet-head-eight-level-3-v1/east/spriteFrame',
        'south-east': 'level-one/units/rivet-head-eight-level-3-v1/south-east/spriteFrame',
        'south': 'level-one/units/rivet-head-eight-level-3-v1/south/spriteFrame',
        'south-west': 'level-one/units/rivet-head-eight-level-3-v1/south-west/spriteFrame',
        'west': 'level-one/units/rivet-head-eight-level-3-v1/west/spriteFrame',
        'north-west': 'level-one/units/rivet-head-eight-level-3-v1/north-west/spriteFrame',
    },
};

export function rivetHeadResourcePath(level: number, direction: TowerHeadDirection): string {
    if (level !== 1 && level !== 2 && level !== 3) throw new RangeError('炮头等级必须为1/2/3');
    const resource = RIVET_HEAD_RESOURCE_PATHS[level][direction];
    if (!resource) throw new RangeError('未知炮头方向');
    return resource;
}
