# AI 接续状态

更新时间：2026-10-05。此文档记录项目交接事实；下一会话先检查实际代码和 Git 状态，日期、产物及临时工具不代表永久有效。

## 当前结论

用户要求的本轮功能改造、本地 APK 打包和 Git 初始化均已完成，没有正在等待处理的功能任务。最后一项请求是记录状态，方便新会话的 agent 接续。

- 当前分支：`main`。
- 功能代码基线：`57cb4fc` — `feat: initialize Wild Atlas with bilingual explorer and Android APK CI`。
- 首次提交包含 240 个文件。记录本次状态前工作区干净；本文件和 AGENTS.md 由后续文档提交保存，最新提交以 `git log` 为准。
- 尚未配置 Git remote，未推送到 GitHub，也未实际触发远端 CI。
- 仓库目录名为 `ani3D`，产品名为“野境 / Wild Atlas”，npm 包名为 `wild-atlas`。

## 用户要求与完成情况

| 要求 | 当前实现 |
| --- | --- |
| 去掉底部状态栏说明 | 已移除可见 footer；地球键盘操作仍有屏幕阅读器说明 |
| 增加设置说明页 | 右上角设置入口，提供“设置 / 使用说明”页签、键盘切换与弹窗焦点恢复 |
| 字体稍大 | 默认正文约 15px，大字约 17px；适配手机与横屏 |
| 支持中英双语 | 界面、125 种动物的资料、保护等级、全球及中国分布均有英文；搜索同时支持中英文 |
| 支持语音介绍 | 物种详情、使用说明和设置试听；网页 Web Speech，Android 原生 TTS；0.8× / 1× / 1.2× |
| 增加地球色彩主题 | 默认蔚蓝海洋，可选墨绿森林、大地沙丘、冰川极光 |
| 动物 3D 轻量动画 | 本地模型呼吸、摆尾、鳍部摆动、水中浮动，最高 30fps；可暂停，保留初始姿态，遵循减少动态效果 |
| GitHub CI 直接打包 APK，Actions 要新 | 已配置 Capacitor Android 工程、构建检查、APK 和 SHA-256 artifact 上传，并核对当前 Actions 版本 |
| Git 初始化提交 | 已建立 main 分支及首次提交 |

语言、主题、字号、动画开关、语速存于 `wild-atlas-preferences`，收藏存于 `wild-atlas-saved`。不要为了调试随意清除用户数据。当前动画设置也影响地球自转与云层；打开详情或设置后，背景地球停止渲染。

## 内容与源码入口

项目为 React 19 + TypeScript + Vite + Three.js，无后端。

当前收录 125 种动物，42 种有中国境内观察位置，7 类生境；19 种提供在线写实模型，36 种有本地程序化 3D 示意。默认探索中国、选中大熊猫，详情默认摄影。在线写实模型由 Sketchfab 加载，本地示意不等同于写实模型，导出的 GLB 为静态几何与材质。

| 文件 | 作用 |
| --- | --- |
| `src/App.tsx` | 主界面、筛选搜索、分页、物种详情、弹窗、Android 返回键 |
| `src/preferences.tsx` | 设置上下文、localStorage、语言和系统减少动态效果 |
| `src/Settings.tsx` | 设置页、使用说明、语音试听 |
| `src/messages.en.json` | 界面中文文案到英文的映射 |
| `src/animals.en.json`、`src/localizeAnimal.ts` | 125 种动物的英文资料与保护等级转换 |
| `src/data.ts`、`src/additionalAnimals.ts`、`src/chinaAnimals.ts` | 原始中文资料、代表观察坐标、中国分布 |
| `src/Globe.tsx` | 地球、动物标记分组、拖动、缩放、键盘交互 |
| `src/AnimalScene.tsx`、`src/models.ts` | 本地示意、环境渲染、轻量动画 |
| `src/RealisticViewer.tsx`、`src/realistic-models.json` | Sketchfab 查看器、动作切换、模型来源、失败回退 |
| `src/SpeechButton.tsx` | 网页 / 原生朗读，语言和语速，取消及后台停止 |
| `src/ModelDownloads.tsx`、`src/exportSchematic.ts` | 模型入口、GLB 导出；Android 通过缓存文件与系统分享面板输出 |
| `src/styles.css`、`src/viewer.css`、`src/themes.css` | 布局、查看器、主题与字号覆盖 |
| `public/images/`、`public/*credits.json` | 本地照片、地球纹理及署名许可 |
| `capacitor.config.ts`、`android/` | Android 原生工程、深色系统栏、安全区、图标和启动屏 |
| `scripts/settings-check.mjs` | 新增功能与双字号布局回归，自动启动 / 关闭测试服务 |
| `scripts/app-layout-check.mjs` | 原有应用布局、筛选、收藏、GLB、本地内容回归 |
| `.github/workflows/android-apk.yml` | APK CI |
| `.github/dependabot.yml` | 每周检查 Actions，按月检查 npm / Capacitor 依赖 |

## 环境与常用命令

上次工作环境为 Windows PowerShell，仓库位置 `C:\Users\jianlong\sources\ani3D`，使用 Node.js 24。可以使用 `-NoProfile`，避免本机 PowerShell profile 在非交互终端产生 PSReadLine 提示。

```sh
npm ci
npm run dev -- --port 5175 --strictPort
npm run build
```

不要假定上一会话的开发服务仍在运行。Vite 已忽略 `android/`、`tmp/` 和 `test-results/` 的文件监听，避免原生构建和截图触发页面重载。

功能回归可独立运行，不需要先启动开发服务：

```sh
npm run test:features
```

它使用端口 5176，Windows 默认调用本机 Microsoft Edge；其他系统先运行 `npx playwright install --with-deps chromium`，或用 `BROWSER_PATH` 指定浏览器。

旧布局回归需要端口 5175 的服务：

```sh
node scripts/app-layout-check.mjs
```

该脚本可以用 `BASE_URL`、`BROWSER_PATH` 覆盖默认值。其他历史测试脚本见 README.md；上次没有因这轮改动重新执行所有在线模型或资产采集脚本。

### Android

- Capacitor core / CLI / Android：8.5.2。
- 原生插件：TTS 8.0.2、App 8.1.2、Filesystem 8.1.4、Share 8.0.3；实际锁定依赖以 lockfile 为准。
- JDK 21，Android SDK Platform 36，Build Tools 35.0.0。
- Gradle wrapper 8.14.5，已固定官方 distribution SHA-256；AGP 使用 Capacitor 模板的 8.13.0。
- app ID：`org.wildatlas.app`；版本 `1.0.0`；最低 API 24 / Android 7，target / compile API 36。
- `VERSION_CODE` 环境变量控制版本号，未提供时为 1；CI 取 `github.run_number`。

```sh
npm run android:sync
npm run android:apk
npm run android:open
```

`android:apk` 已包含生产构建和 Capacitor sync；`android:open` 需要 Android Studio。

原生 lint：

```powershell
.\android\gradlew.bat --project-dir android --no-daemon lintDebug
```

上次为构建准备了被 Git 忽略的本机工具目录。目录仍存在时可复用；新克隆没有这些文件，应安装工具并设置环境变量：

```powershell
$env:JAVA_HOME = (Get-ChildItem -LiteralPath 'tmp/android-tools/java' -Directory | Select-Object -First 1).FullName
$env:ANDROID_HOME = (Resolve-Path 'tmp/android-tools/sdk').Path
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
npm run android:apk
```

最新下载的 Android command-line tools 已将 `sdkmanager` 标记为弃用；若继续使用本机这些工具，直接调用 `cmdline-tools/latest/bin/android.exe --no-metrics sdk install 'platforms;android-36' 'build-tools;35.0.0'`。先确认工具存在，不必重新下载或修改用户全局环境。

`package.json` 中对 `xcode > uuid` 的 override 为 `^11.1.1`，用于修复当前 Capacitor CLI 的间接依赖审计问题。上次安装完成后 npm audit 为 0；升级时重新评估，不要无理由删除 override 或使用强制降级。

## 已验证结果与证据边界

以下检查在 2026-10-05 的上一轮实现中通过，本次记录文档没有重跑应用测试：

| 验证 | 已确认范围 |
| --- | --- |
| `npm run build` | TypeScript 与生产构建成功 |
| `npm run test:features` | 125 条英文资料覆盖；主题 / 字号 / 语言 / 语速持久化；双语搜索；语音取消、切换及缺少语言包；动画移动和暂停；减少动态效果 |
| 新功能布局检查 | 1440×900、1024×768、768×1024、390×844、360×640、320×568、844×390，两个字号均通过 |
| `node scripts/app-layout-check.mjs` | 125 / 42 物种筛选、分页、收藏持久化、本地 GLB、屏蔽外部请求仍可使用本地内容、6 种视口布局 |
| `actionlint` 1.7.12 | 工作流语法检查通过 |
| `npm run android:apk` | 使用 Gradle 8.14.5 实际生成 APK |
| Gradle `lintDebug` | 成功，存在模板 / 依赖的非阻断警告；不应表述为零警告 |
| `apksigner verify --verbose` | APK 签名校验通过，v2 签名 |
| APK 内容检查 | 所有 125 张动物照片、地球纹理、署名和 4 个原生插件均已打包；未配置开发服务器 URL |

重要边界：

- 浏览器语音回归使用模拟的系统语音回调，不代表已经听过设备实际发声。
- Android 原生语音和文件分享已编译入 APK，但本轮没有 Android 真机安装、发声或分享的实测结果。需要设备有对应语言的 TTS 引擎 / 语音包，部分声音依赖网络。
- 在线 Sketchfab 模型的国内网络可用性未验证；仅在用户点击后加载，保留摄影回退。
- 本地 workflow 语法和 Android 构建已验证，GitHub 托管 runner 上的 CI 尚未运行。

### 当前 APK 与本机日志

这些是被忽略的本地产物，不随 Git 克隆传输，也不保证新会话仍然存在：

- APK：`android/app/build/outputs/apk/debug/app-debug.apk`。
- 校验文件：同目录 `app-debug.apk.sha256`。
- 大小：48,285,533 bytes，约 46 MiB。
- SHA-256：`bad154a14807799abc251e25b3e0cfa171e7478725b11d13a4cb67216bb5d9f7`。
- 构建及 lint 日志：`tmp/android-build-final.log`、`tmp/android-lint-final.log`。
- lint 报告：`android/app/build/reports/lint-results-debug.html`。
- 界面截图：`test-results/settings-desktop.png`、`settings-mobile.png`、`settings-mobile-detail.png`。

重新打包后大小和 hash 可能变化，应以新产物为准。当前是可安装的调试签名版；正式分发需要固定 release 签名。不同 CI 运行生成的调试证书可能不同，卸载重装会丢失本机收藏和设置。

## GitHub CI 状态

触发条件：推送 `main` / `master`、`v*` 标签、Pull Request 或手动 `workflow_dispatch`。

运行顺序：`npm ci` → 安装 Playwright Chromium → 功能回归 → 生产构建和 Capacitor sync → Java / Gradle → `assembleDebug lintDebug` → 上传 APK 和 SHA-256。

2026-10-05 已通过 GitHub 发布信息核实：

| Action | 工作流引用 | 当时最新发布 |
| --- | --- | --- |
| actions/checkout | v7 | v7.0.1 |
| actions/setup-node | v7 | v7.0.0 |
| actions/setup-java | v6 | v6.0.1 |
| gradle/actions/setup-gradle | v6 | v6.4.0 |
| actions/upload-artifact | v7 | v7.0.1 |

runner 为 `ubuntu-latest`，Node.js 24，Temurin JDK 21。Artifact 名为 `wild-atlas-debug-运行编号`，保留 30 天。上表是当时快照，下次涉及版本更新时重新核实。

## 可能的后续工作

以下不是尚未完成的用户任务；仅在用户提出相应目标时继续：

1. 配置 GitHub 仓库地址并推送 main，观察第一次真实 CI 运行。
2. 在 Android 真机验证安装、原生 TTS、中英文语音包、安全区、返回键和 GLB 分享。
3. 需要正式分发时增加固定 release 签名，凭据通过合适的私密配置管理。
4. 继续新增物种、写实模型或科普资料时维护双语覆盖和资产署名。

## 本轮修复过的易回归点

- 大字英文在窄屏横屏中占用额外高度：短横屏的生境筛选改为水平滚动，列表容量随字号 / 语言重新计算。
- 弹窗关闭后需恢复打开按钮的焦点：记录 opener，等背景 inert 移除后恢复，兼顾 React StrictMode。
- 本地动画不得用零基准覆盖鳍或尾巴的既有旋转，要叠加保存的初始变换。
- 语音取消后可能收到迟到回调：使用请求序号，防止切换语言或关闭页面后又继续朗读。
- Gradle 版本号采用赋值语法 `versionCode = (...).toInteger()`，避免 Groovy DSL 的调用歧义。
- Gradle wrapper 的可执行位已记录为 100755，CI 仍执行 chmod；本地打包脚本在非 Windows 使用 sh 调用 wrapper。
- 全新会话不要把本文当成运行中的计划；先理解用户的新要求，再决定是否改动或验证。
