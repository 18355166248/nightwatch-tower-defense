#!/usr/bin/env node

const { createReadStream, existsSync, statSync } = require('node:fs');
const { createServer, get } = require('node:http');
const { extname, join, normalize, resolve } = require('node:path');

const root = resolve(__dirname, '../build/web-mobile');
const port = Number(process.env.PORT || 4176);
const mime = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.wasm': 'application/wasm',
};

if (!Number.isSafeInteger(port) || port < 1 || port > 65535) throw new RangeError('PORT 必须为 1–65535');
if (!existsSync(join(root, 'index.html'))) throw new Error('请先执行 npm run build:web:debug');

const previewIdentityPath = '/__nightwatch_preview';
const server = createServer((request, response) => {
    // 重复启动只复用同一构建目录，不能把其他项目的占用端口误当作本游戏。
    if (request.url === previewIdentityPath) {
        return response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
            .end(JSON.stringify({ app: 'nightwatch-tower-defense', root }));
    }
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const safePath = normalize(pathname).replace(/^([.][.][/\\])+/, '');
    let file = join(root, safePath);
    if (!file.startsWith(root)) return response.writeHead(403).end('Forbidden');
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!existsSync(file) || !statSync(file).isFile()) return response.writeHead(404).end('Not found');
    response.writeHead(200, {
        'Content-Type': mime[extname(file)] || 'application/octet-stream',
        // Phase A 会高频重建，全部禁用缓存，避免浏览器把旧交互误当作本轮证据。
        'Cache-Control': 'no-store, max-age=0',
    });
    createReadStream(file).pipe(response);
});

function isExistingPreview() {
    return new Promise(resolveMatch => {
        const probe = get({ hostname: '127.0.0.1', port, path: previewIdentityPath, timeout: 1500 }, response => {
            let body = '';
            response.setEncoding('utf8');
            response.on('data', chunk => {
                body += chunk;
                if (body.length > 4096) probe.destroy();
            });
            response.on('error', () => resolveMatch(false));
            response.on('end', () => {
                try {
                    const identity = JSON.parse(body);
                    resolveMatch(response.statusCode === 200 && identity.app === 'nightwatch-tower-defense' && identity.root === root);
                } catch { resolveMatch(false); }
            });
        });
        probe.on('timeout', () => probe.destroy());
        probe.on('error', () => resolveMatch(false));
    });
}

// 同项目已有服务直接读取本次重建的文件，无需抢占端口或终止其他进程。
server.on('error', async error => {
    if (error.code === 'EADDRINUSE' && await isExistingPreview()) {
        console.log(`[preview] 已复用运行中的游戏服务：http://127.0.0.1:${port}/（刷新页面查看最新构建）`);
        return;
    }
    console.error(error.code === 'EADDRINUSE'
        ? `[preview] 端口 ${port} 被其他服务占用，请更换端口，例如：PORT=${port === 65535 ? 4176 : port + 1} npm start`
        : `[preview] 启动失败：${error.message}`);
    process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => console.log(`Nightwatch Phase A: http://127.0.0.1:${port}/`));
