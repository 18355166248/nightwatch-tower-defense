const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { resolve } = require('node:path');

test('固定步兵四相模型步态闭环、交替抬脚，双段腿接合且每帧至少一脚接地', () => {
    const result = spawnSync(process.env.NIGHTWATCH_ART_PYTHON || 'python3', ['-c', `
import json, sys
sys.path.insert(0, sys.argv[1])
from clockwork_walk_motion import leg_pose, arm_angle, HIP_HEIGHT, BONE_LENGTH
poses = []
for phase in range(5):
    row = []
    for side in range(2):
        p = leg_pose(phase, side)
        ky,kz = p['knee']; ay,az = p['ankle']
        p['upperLength'] = (ky**2 + (kz-HIP_HEIGHT)**2)**.5
        p['lowerLength'] = ((ay-ky)**2 + (az-kz)**2)**.5
        p['arm'] = arm_angle(phase,side)
        row.append(p)
    poses.append(row)
print(json.dumps({'poses':poses,'length':BONE_LENGTH}))
`, resolve(__dirname, '../../scripts/art')], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const { poses, length } = JSON.parse(result.stdout);
    assert.deepEqual(poses[0], poses[4]);
    for (const pair of poses) {
        assert.equal(Math.min(...pair.map(p => p.sole_height)), 0);
        for (const pose of pair) {
            assert.ok(Math.abs(pose.upperLength - length) < 1e-9);
            assert.ok(Math.abs(pose.lowerLength - length) < 1e-9);
            assert.ok(pose.sole_height >= 0);
        }
    }
    assert.ok(poses[1][1].sole_height > 0);
    assert.equal(poses[1][0].sole_height, 0);
    assert.ok(poses[3][0].sole_height > 0);
    assert.equal(poses[3][1].sole_height, 0);
    assert.ok(poses[0][0].ankle[0] < 0 && poses[2][1].ankle[0] < 0);
    assert.equal(poses[0][0].arm, -poses[2][0].arm);
});
