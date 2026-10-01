#!/usr/bin/env node
const { createReadStream, statSync } = require('node:fs');
const { createServer } = require('node:http');
const { extname, resolve, sep } = require('node:path');

const project = resolve(__dirname, '..');
const port = Number(process.env.DESIGN_REVIEW_PORT || 4190);
if (!Number.isSafeInteger(port) || port < 1 || port > 65535) throw new RangeError('设计预览端口无效');
const roots = ['docs/design', 'art-source/design'].map((part) => resolve(project, part));
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8' };

// 评审服务只开放稿件和新设计源图；运行时/用户其他文件不需要进入这条预览路径。
createServer((request, response) => {
    try {
        const url = new URL(request.url, 'http://127.0.0.1');
        // 根入口重定向到稿件目录，确保 CSS/脚本/文档链接按同一目录解析。
        if (url.pathname === '/') return response.writeHead(302, { Location: '/docs/design/first-level-quality-v1/index.html' }).end();
        const pathname = decodeURIComponent(url.pathname);
        let file = resolve(project, `.${pathname}`);
        if (!roots.some((root) => file.startsWith(root + sep))) return response.writeHead(403).end('Forbidden');
        if (statSync(file).isDirectory()) file = resolve(file, 'index.html');
        if (!statSync(file).isFile()) return response.writeHead(404).end('Not found');
        response.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        createReadStream(file).pipe(response);
    } catch {
        response.writeHead(404).end('Not found');
    }
}).listen(port, '127.0.0.1', () => console.log(`首关设计评审 http://127.0.0.1:${port}/`));
