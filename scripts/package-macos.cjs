const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const project = path.resolve(__dirname, '..');
const game = path.join(project, 'build/web-mobile');
const expectedHash = 'f67c02fd176b09b0ee2d5e8dc0bdee5b56a3596fff5e603af0a5f6a258eb891f';
if (process.platform !== 'darwin' || process.arch !== 'arm64') throw new Error('此脚本仅用于Apple Silicon Mac试玩包');
const hash = crypto.createHash('sha256').update(fs.readFileSync(path.join(game, 'assets/main/index.js'))).digest('hex');
// 不隐式重建或更换已签收构建；发现变化就停止，让维护者重新决定验收基线。
const candidate = process.argv.includes('--candidate');
if (hash !== expectedHash && !candidate) throw new Error('构建与已签收首关不一致；新试玩候选须显式传入--candidate，不继承旧验收');
const cache = path.join(os.homedir(), 'Library/Caches/electron');
const archives = fs.readdirSync(cache).flatMap(folder => {
    const dir = path.join(cache, folder);
    return fs.statSync(dir).isDirectory() ? fs.readdirSync(dir).filter(f => f === 'electron-v40.2.1-darwin-arm64.zip').map(f => path.join(dir, f)) : [];
});
const archive = process.env.NIGHTWATCH_ELECTRON_ZIP || archives[0];
if (!archive || !fs.existsSync(archive)) throw new Error('需要Electron 40.2.1 darwin-arm64 ZIP；可用NIGHTWATCH_ELECTRON_ZIP指定');
const destination = path.join(project, 'dist/macos');
fs.mkdirSync(destination, { recursive: true });
const staging = fs.mkdtempSync(path.join(destination, 'package-'));
execFileSync('/usr/bin/ditto', ['-x', '-k', archive, staging]);
const bundle = path.join(staging, '夜城防线.app');
fs.renameSync(path.join(staging, 'Electron.app'), bundle);
const contents = path.join(bundle, 'Contents');
const application = path.join(contents, 'Resources/app');
fs.mkdirSync(application, { recursive: true });
fs.copyFileSync(path.join(project, 'desktop/main.cjs'), path.join(application, 'main.cjs'));
fs.writeFileSync(path.join(application, 'package.json'), JSON.stringify({ name: 'nightwatch-desktop', version: '0.1.0', main: 'main.cjs' }));
fs.cpSync(game, path.join(application, 'game'), { recursive: true });
const plist = path.join(contents, 'Info.plist');
for (const [key, value] of Object.entries({ CFBundleIdentifier: 'com.nightwatch.firstlevel', CFBundleName: '夜城防线', CFBundleDisplayName: '夜城防线', CFBundleShortVersionString: '0.1.0' })) {
    execFileSync('/usr/libexec/PlistBuddy', ['-c', `Set :${key} ${value}`, plist]);
}
// 本机临时签名不是Developer ID公证；只对本次生成的app操作，不修改系统安全策略。
execFileSync('/usr/bin/codesign', ['--force', '--deep', '--sign', '-', bundle], { stdio: 'inherit' });
const zip = path.join(staging, '夜城防线-mac-arm64.zip');
execFileSync('/usr/bin/ditto', ['-c', '-k', '--sequesterRsrc', '--keepParent', bundle, zip]);
fs.writeFileSync(path.join(staging, 'build-info.json'), JSON.stringify({ date: new Date().toISOString(), engine: 'Cocos Creator 3.8.8', electron: '40.2.1', arch: 'arm64', runtimeSha256: hash, acceptance: hash === expectedHash ? 'human-accepted-first-level' : 'new-playtest-candidate-not-human-accepted', archiveBytes: fs.statSync(zip).size, signing: 'ad-hoc-local-only' }, null, 2));
console.log(JSON.stringify({ bundle, zip, info: path.join(staging, 'build-info.json') }, null, 2));
