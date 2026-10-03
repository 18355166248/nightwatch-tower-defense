#!/usr/bin/env node
const { createReadStream, statSync } = require('node:fs');
const { createServer } = require('node:http');
const { extname, resolve, sep } = require('node:path');
const { entry, images, readArchivedRecord } = require('./design-image-store.cjs');

const project = resolve(__dirname, '..');
const port = Number(process.env.DESIGN_REVIEW_PORT || 4190);
if (!Number.isSafeInteger(port) || port < 1 || port > 65535) throw new RangeError('设计预览端口无效');
const roots = ['docs/design', 'art-source/design'].map((part) => resolve(project, part));
// 生产切图对照只借用这两张公开塔图，不因此开放整个运行资源/源码目录。
const runtimeReviewFiles = new Set([2, 3].map(level => resolve(project,
    `assets/resources/level-one/units/frost-coil-level-${level}-structure-v1.png`)));
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8' };

// 评审服务只开放稿件、设计源图和上述两张明确的结构图；其他运行文件仍拒绝访问。
createServer(async (request, response) => {
    try {
        const url = new URL(request.url, 'http://127.0.0.1');
        // 根入口重定向到稿件目录，确保 CSS/脚本/文档链接按同一目录解析。
        if (url.pathname === '/') return response.writeHead(302, { Location: '/docs/design/first-level-quality-v1/index.html' }).end();
        const pathname = decodeURIComponent(url.pathname);
        let file = resolve(project, `.${pathname}`);
        if (!roots.some((root) => file.startsWith(root + sep)) && !runtimeReviewFiles.has(file)) return response.writeHead(403).end('Forbidden');
        const archived = entry(file);
        // 采样评审必须保留获批像素；TinyPNG 预览不能代替原图/B清晰度基线。
        if (archived) return response.writeHead(302, { Location: pathname.includes('/texture-review-generated/') ? archived.originalUrl : archived.previewUrl, 'Cache-Control': 'no-store' }).end();
        if (statSync(file).isDirectory()) file = resolve(file, 'index.html');
        if (!statSync(file).isFile()) return response.writeHead(404).end('Not found');
        if (extname(file) === '.svg') {
            // 浏览器以 <img> 加载 SVG 时会阻止远程子图；仅在响应内恢复位图，不重新落盘或进入 Git。
            let svg = require('node:fs').readFileSync(file, 'utf8');
            const records = [...new Map(Object.values(images()).filter(record => svg.includes(record.previewUrl)).map(record => [record.originalSha256, record])).values()];
            for (const record of records) {
                const bytes = await readArchivedRecord(record);
                const type = bytes[0] === 137 ? 'png' : 'jpeg';
                svg = svg.split(record.previewUrl).join(`data:image/${type};base64,${bytes.toString('base64')}`);
            }
            return response.writeHead(200, { 'Content-Type': mime['.svg'], 'Cache-Control': 'no-store' }).end(svg);
        }
        response.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        createReadStream(file).pipe(response);
    } catch {
        response.writeHead(404).end('Not found');
    }
}).listen(port, '127.0.0.1', () => console.log(`首关设计评审 http://127.0.0.1:${port}/`));
