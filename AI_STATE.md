# AI 接续状态

更新时间：2026-10-05。此文档记录项目交接事实；下一会话先检查实际代码和 Git 状态，日期、产物及临时工具不代表永久有效。

## 当前结论

原有功能改造、本地 APK 打包、Git 初始化和 GitHub Pages 自动部署已完成。用户明确选择公开仓库后，已通过 CLI 将 `keosu/aniplanet` 设为公开并启用 Actions 模式的 Pages。本轮 PWA 安装与离线支持、顶部全屏按钮已在 `57ffc42` 提交并推送，Pages 已成功发布并完成线上浏览器验证：https://keosu.github.io/aniplanet/ 。具体提交及验证记录见下方（以实际 Git / CI 为准）。

- 当前分支：`main`。
- 功能代码基线：`57cb4fc` — `feat: initialize Wild Atlas with bilingual explorer and Android APK CI`。
- Pages 实现提交：`6106dfa` — `ci: deploy Wild Atlas to GitHub Pages`，已推送并成功部署；后续交接文档提交以 Git 为准。
- 最新功能提交：`57ffc42` — `feat: add installable offline PWA and move fullscreen to header`，已推送，Pages / APK CI 均成功，线上 PWA 验证通过。
- 首次提交包含 240 个文件。交接入口已在 `257ac8d` 提交；最新提交及工作区以 Git 为准。
- 已配置 `origin = git@github.com:keosu/aniplanet.git`，`main` 已推送。2026-10-05 按用户授权从私有改为公开，当前 CLI 用户 `keosu` 具有管理员权限。
- GitHub CLI 位于 `C:\Program Files\GitHub CLI\gh.exe`，版本 2.102.0，已登录；当前会话 PATH 可能没有刷新，可用完整路径调用。不要记录或输出令牌。
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
| GitHub Pages 自动部署 | 公开仓库已启用 Actions 发布，main 推送自动部署，首次 CI 和实际网站验证通过 |
| PWA 安装与离线 | 已添加清单、安装图标、全部本地内容预缓存、双语安装入口及更新操作；根路径与子路径生产验证通过 |
| 全屏按钮移到顶部 | 位于设置左侧，进入 / 退出全屏更新图标及无障碍标签，小屏双字号通过 |

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
| `.github/workflows/github-pages.yml` | Pages 构建、生产验证、artifact 与部署 |
| `src/assets.ts`、`src/vite-env.d.ts` | Vite BASE_URL 公共资源路径及类型；兼容项目子路径和根路径 |
| `scripts/pages-check.mjs` | dist 生产页面验证；自动管理端口 5177 |
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
- GitHub APK CI `37322899490`（提交 `257ac8d`）已完成且结论为 `success`：https://github.com/keosu/aniplanet/actions/runs/37322899490 。这是原有代码基线的远端构建成功，仍不代表 Android 真机验证。

### Pages 改造验证（2026-10-05）

- `npm run build -- --base /aniplanet/` 与 `npm run test:pages -- /aniplanet/`：通过。实际生产页面验证所有被页面加载的资源在子路径内，摄影可解码，四张地球纹理、favicon、署名 fetch 和清单链接正常，本地 3D 延迟加载及强制禁用 WebGL 后的照片回退正常；无浏览器异常或缺失资源。
- `npm run test:features`：125 条英文资料、设置持久化、语音模拟回调、动画及 7 种视口双字号全部通过。
- `npm run android:sync`：根路径生产构建与 4 个原生插件同步成功；随后 `npm run test:pages` 验证根路径页面通过。没有因这次资源路径改动重新生成本地 APK，下方 APK 是此前产物。
- `actionlint` 1.7.12 显式检查 Pages 和 Android 两个工作流，通过；`git diff --check` 通过。
- Pages 创建 API 最初因私有仓库套餐限制返回 HTTP 422。用户随后授权公开仓库，CLI 已成功修改可见性，重试创建 Pages 成功；当前配置 `build_type=workflow`、`public=true`、`https_enforced=true`。
- GitHub Pages CI `37324067720`（提交 `6106dfa`）：构建、生产浏览器验证、上传和部署全部 `success`，https://github.com/keosu/aniplanet/actions/runs/37324067720 。
- 已用未登录的 Edge 浏览器访问实际站点，HTTP 200，页面加载的入口为 `/aniplanet/assets/index-BKsDpxBG.js`，与本次构建一致；地球 canvas、物种摄影、来源 fetch 与本地 3D 成功，无浏览器异常和失败请求。

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

### PWA 与顶部全屏（2026-10-05）

- `vite-plugin-pwa@2.0.0`（本轮从 npm 核实版本及 Vite 8 兼容性），使用 Workbox prompt 更新。既有依赖锁定版本未变，安装后 npm audit 为 0。
- `vite.config.ts` 生成相对地址的 manifest（id / start_url / scope 均为 `./`），兼容根路径与 Pages；162 项预缓存约 43,823 KiB，包含全部摄影、地球纹理、来源、应用及延迟加载模块。只缓存本站内容。
- `public/icons/` 中的 192 / 512、maskable 和 Apple 图标由现有 favicon 生成；可用 `node scripts/generate-pwa-icons.mjs` 重现。
- `src/pwa.ts` 在 React 启动前捕获安装事件；仅生产网页注册 Service Worker，跳过 Capacitor。安装事件只能使用一次，用户接受不等于安装完成，以 `appinstalled` 为准。新版本等待用户在设置中选择「更新并重新打开」，保留 localStorage。
- `src/InstallApp.tsx` 提供双语安装入口、iOS / 通用菜单说明、离线准备 / 失败状态、更新按钮。首次联网约 45 MB，完成后显示可离线；Sketchfab 与部分系统语音仍需网络。
- 全屏按钮从 `.map-tools` 移至 `.header-actions`、设置左侧，监听 `fullscreenchange` 更新图标及标签。≤360px 隐藏顶部区域物种数量，为按钮留空间。
- `npm run test:features`：通过 125 条英文资料、原有语音及动画回归、真实浏览器全屏切换、模拟安装取消 / 异常 / 完成、模拟 iOS 菜单与独立模式、7 种视口 × 2 字号（含顶部按钮不重叠）。已查看手机截图。
- `npm run build -- --base /aniplanet/` + `npm run test:pages -- /aniplanet/`：最终版本通过。`npm run android:sync` + `npm run test:pages`：通过根路径生产构建、4 个原生插件同步与根路径 PWA 回归。
- `scripts/pwa-check.mjs` 由现有 `test:pages` 调用，因此 Pages CI 自动覆盖。实际浏览器安装条件检查无错误；验证全部本地图片入缓存、断网后重新打开、此前未查看的虎照片 / 来源 / 本地 3D、真实等待中的 Service Worker 更新，以及设置和收藏保留。单独的注册失败模拟仍能使用网页摄影。
- 更新测试临时修改 `dist/sw.js` 尾部注释并在 finally 恢复，CI 上传前已恢复；临时浏览器 profile 位于忽略的 test-results 下，验证目录后清理。
- 边界：未在 Android / iOS 真机完成 PWA 安装；安装按钮回调与 iOS 标识测试是模拟。Android 本轮只同步网页，未重新本地打包 APK。
- 实现提交 `57ffc42` — `feat: add installable offline PWA and move fullscreen to header`，已推送 `main`。
- Pages CI `37411227804`：构建、PWA 生产验证与部署均为 `success`，https://github.com/keosu/aniplanet/actions/runs/37411227804 。
- 已使用全新、非无痕的独立 Edge 配置访问实际网站：设置页出现 1 个真实「安装到设备」按钮（未实际执行 OS 安装）；Chromium 安装条件检查无错误，Service Worker 地址 / scope 均正确；断网刷新后摄影和延迟加载的本地 3D 正常，无页面异常或 HTTP 失败。截图：`test-results/pwa-live-mobile.png`、`test-results/pwa-live-install.png`，均已目视检查。
- Android APK CI `37411227690` 已完成，结论 `success`：功能回归、根路径构建及同步、Gradle APK / lint、校验文件及 artifact 上传均通过，https://github.com/keosu/aniplanet/actions/runs/37411227690 。存在 Gradle 生命周期和 runner 即将迁移的非阻断提示；没有在本轮无关升级工具链。这不代表 Android 真机验证。
- 用户要求的 PWA 与顶部全屏任务已完成，没有待处理的用户任务。线上入口为「设置 → 安装应用」，首次等待约 45 MB 内容准备完成即可离线；后续更改网页仍按上述构建、同步、测试与 Pages 发布流程执行。

### Pages

工作流：`.github/workflows/github-pages.yml`。推送 `main` 或手动触发；只允许 main 的构建进入发布。先由 `configure-pages` 取得实际 `base_path`，生产构建并执行 `test:pages`，再上传 `dist/`、部署到 `github-pages` 环境。并发组 `github-pages`，避免中断正在进行的部署。

本次核对官方最新发布：`configure-pages v6.0.0`、`upload-pages-artifact v5.0.0`、`deploy-pages v5.0.1`；使用对应主版本标签。`checkout v7.0.1` 与 `setup-node v7.0.0` 也重新核实。Node.js 24，ubuntu-latest。

已通过 CLI 完成用户授权的 `gh repo edit keosu/aniplanet --visibility public --accept-visibility-change-consequences`，并用 `gh api --method POST repos/keosu/aniplanet/pages -f build_type=workflow` 成功启用 Pages。默认网址为 `https://keosu.github.io/aniplanet/`。

首次 Pages 部署运行 `37324067720` 已成功；网站已上线并实测。推送 main 会自动触发；后续也可用 `gh workflow run github-pages.yml -R keosu/aniplanet --ref main` 手动发布，再用 `gh run list -R keosu/aniplanet --workflow github-pages.yml` 查看运行。

`npm run test:pages -- /aniplanet/` 需要前一步用同一 `--base /aniplanet/` 构建；无参数测试根路径。测试自己启动预览服务，不依赖旧会话。

### Android APK

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

1. 在 Android 真机验证安装、原生 TTS、中英文语音包、安全区、返回键和 GLB 分享。
2. 需要正式分发时增加固定 release 签名，凭据通过合适的私密配置管理。
3. 继续新增物种、写实模型或科普资料时维护双语覆盖和资产署名。

## 本轮修复过的易回归点

- 大字英文在窄屏横屏中占用额外高度：短横屏的生境筛选改为水平滚动，列表容量随字号 / 语言重新计算。
- 弹窗关闭后需恢复打开按钮的焦点：记录 opener，等背景 inert 移除后恢复，兼顾 React StrictMode。
- 本地动画不得用零基准覆盖鳍或尾巴的既有旋转，要叠加保存的初始变换。
- 语音取消后可能收到迟到回调：使用请求序号，防止切换语言或关闭页面后又继续朗读。
- Gradle 版本号采用赋值语法 `versionCode = (...).toInteger()`，避免 Groovy DSL 的调用歧义。
- Gradle wrapper 的可执行位已记录为 100755，CI 仍执行 chmod；本地打包脚本在非 Windows 使用 sh 调用 wrapper。
- 全新会话不要把本文当成运行中的计划；先理解用户的新要求，再决定是否改动或验证。
