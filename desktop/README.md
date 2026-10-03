# macOS首关试玩包

2026-10-02，Apple Silicon（arm64），macOS 12及以上。保留Cocos Creator 3.8.8，使用Electron 40.2.1封装已人工签收的首关，不迁移游戏引擎，不修改玩法或美术。

## 打开

解压`夜城防线-mac-arm64.zip`，双击`夜城防线.app`即可。无需Node、Cocos编辑器、开发服务器或联网下载游戏贴图。窗口保持竖屏，不提供横屏/全屏。退出使用菜单或Command-Q。

当前产物：`dist/macos/package-jGMa2N/夜城防线.app`及同目录ZIP。压缩包120071674字节（约114.5 MiB），解压应用约273 MiB。主要新增体积来自Chromium/Electron；游戏资源仍为原已验收Web构建。整个`dist/`不进入Git。

## 可复现打包

最新炮塔交互候选见[交互试调记录](../docs/TOWER-INTERACTION-TRIAL.md)，产物为`dist/macos/package-lCVLnO/夜城防线.app`。新增鼠标预览、选中标识、冷凝三级标记和战斗五折拆除。退出旧窗口后打开新包；这是未人工签收的试玩候选。

新8列难度试玩候选见[试调记录](../docs/FIRST-LEVEL-EIGHT-COLUMN-TRIAL.md)，产物为`dist/macos/package-GU0WPN/夜城防线.app`；此候选未人工签收，不取代下方原已验收包。退出旧桌面窗口后打开新包。

执行`npm run package:macos`。使用本机Electron缓存中的`electron-v40.2.1-darwin-arm64.zip`，或通过`NIGHTWATCH_ELECTRON_ZIP`指定同版本官方发行ZIP。每次生成新的临时命名产物目录，不覆盖正在试玩的应用。

脚本拒绝与验收主包SHA256不一致的构建：

`f67c02fd176b09b0ee2d5e8dc0bdee5b56a3596fff5e603af0a5f6a258eb891f`

固定`nightwatch://game/`本地协议保证存档来源稳定；渲染进程禁用Node接口、启用上下文隔离和沙箱，拒绝外部页面导航、新窗口与设备权限申请。游戏存档和设置与浏览器入口独立。

## 验证与边界

- 主包哈希一致、JS语法检查和差异空白检查通过。
- `codesign --verify --deep --strict`通过。
- 通过桌面界面工具实际打开应用，看到包内地址`nightwatch://game/index.html`及正常战斗暂停画面。
- 此次是封装启动烟测，不冒充桌面环境三局完整八波、长期性能或听觉验收；此前网页三局证据仍仅证明原环境。
- 终端`open`第一次报告LaunchServices错误；桌面界面工具按应用路径启动成功。未修改系统安全策略。
- 本机临时签名（ad-hoc），未Developer ID签名或Apple公证；不是公开发行包。其他Mac可能触发系统安全提示，需交由用户处理，不自动关闭保护。
- 当前仅提供Apple Silicon Mac，不宣称支持Intel Mac或Windows。封装暂沿用Electron应用图标和网页窗口标题，不改变已认可的游戏内视觉。
