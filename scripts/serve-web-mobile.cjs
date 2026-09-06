#!/usr/bin/env node

const { createReadStream, existsSync, statSync } = require('node:fs');
const { createServer } = require('node:http');
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

createServer((request, response) => {
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
}).listen(port, '127.0.0.1', () => console.log(`Nightwatch Phase A: http://127.0.0.1:${port}/`));
