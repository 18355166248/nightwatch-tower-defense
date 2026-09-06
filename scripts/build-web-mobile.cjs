#!/usr/bin/env node

const { existsSync, statSync } = require('node:fs');
const { resolve } = require('node:path');
const { spawnSync } = require('node:child_process');

const root = resolve(__dirname, '..');
const creator = process.env.COCOS_CREATOR_BIN
    || '/Applications/Cocos/Creator/3.8.8/CocosCreator.app/Contents/MacOS/CocosCreator';
const debug = process.argv.includes('--debug');

if (!existsSync(creator)) throw new Error(`未找到 Cocos Creator 3.8.8：${creator}`);
const buildStartedAt = Date.now();
const result = spawnSync(creator, [
    '--project', root,
    '--build', `platform=web-mobile;debug=${debug};useSplashScreen=false`,
], { cwd: root, stdio: 'inherit' });

if (result.error || result.status !== 0 && result.status !== 36) {
    throw new Error(`Cocos 构建失败：${result.error?.message ?? `exit ${result.status}`}`);
}

const required = ['index.html', 'application.js', 'assets/main/index.js', 'src/settings.json'];
const outputPath = (entry) => resolve(root, 'build/web-mobile', entry);
const brokenArtifacts = () => required.filter((entry) => {
    if (!existsSync(outputPath(entry))) return true;
    const stat = statSync(outputPath(entry));
    return stat.size === 0 || stat.mtimeMs < buildStartedAt - 1_000;
});

// Creator 在部分 macOS 环境以 36 提前返回，后台构建仍会继续；必须等关键产物落稳后才能宣称成功。
const deadline = Date.now() + 90_000;
let broken = brokenArtifacts();
while (result.status === 36 && broken.length > 0 && Date.now() < deadline) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
    broken = brokenArtifacts();
}
if (broken.length > 0) throw new Error(`Web Mobile 产物缺失或为空：${broken.join(', ')}`);
console.log(`[build:web] Web Mobile ${debug ? '调试' : '发布'}构建完成。`);
