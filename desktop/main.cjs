const { app, BrowserWindow, Menu, protocol, net, dialog } = require('electron');
const { resolve, sep } = require('node:path');
const { pathToFileURL } = require('node:url');
const { existsSync } = require('node:fs');

// 固定本地协议保证每次打开使用同一个存档来源，不依赖开发端口或远程 CDN。
protocol.registerSchemesAsPrivileged([{ scheme: 'nightwatch', privileges: {
    standard: true, secure: true, supportFetchAPI: true, corsEnabled: true,
} }]);
app.setName('夜城防线');
let window;
const root = resolve(__dirname, 'game');

if (!app.requestSingleInstanceLock()) app.quit();
else {
    app.on('second-instance', () => {
        if (window) { if (window.isMinimized()) window.restore(); window.focus(); }
    });
    app.whenReady().then(async () => {
        protocol.handle('nightwatch', request => {
            try {
                const url = new URL(request.url);
                const file = resolve(root, '.' + decodeURIComponent(url.pathname));
                // 只提供包内文件，拒绝跨目录读取；缺失资源返回404而不是首页HTML。
                if (url.host !== 'game' || !file.startsWith(root + sep)) return new Response('Forbidden', { status: 403 });
                if (!existsSync(file)) return new Response('Not found', { status: 404 });
                return net.fetch(pathToFileURL(file).href);
            } catch { return new Response('Bad request', { status: 400 }); }
        });
        Menu.setApplicationMenu(Menu.buildFromTemplate([
            { label: '夜城防线', submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'quit' }] },
            { label: '编辑', submenu: [{ role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
            { label: '窗口', submenu: [{ role: 'minimize' }] },
        ]));
        window = new BrowserWindow({
            title: '夜城防线 · 首关试玩', width: 430, height: 850,
            minWidth: 350, minHeight: 620, backgroundColor: '#101720',
            resizable: false, fullscreenable: false, show: false,
            webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true },
        });
        // 游戏不需要打开外部网页或设备权限；封装不向渲染进程暴露Node接口。
        window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
        window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
        window.webContents.on('will-navigate', (event, url) => {
            if (!url.startsWith('nightwatch://game/')) event.preventDefault();
        });
        window.webContents.on('console-message', (_event, level, message) => {
            if (level >= 2) console.error('[game]', message);
        });
        window.webContents.on('render-process-gone', (_event, details) => {
            dialog.showErrorBox('游戏窗口异常退出', `请退出并重新打开。原因：${details.reason}`);
        });
        window.once('ready-to-show', () => window.show());
        await window.loadURL('nightwatch://game/index.html');
    }).catch(error => { dialog.showErrorBox('启动失败', String(error)); app.quit(); });
    app.on('window-all-closed', () => app.quit());
}
