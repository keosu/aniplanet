# 野境 · WILD ATLAS

一个支持中英双语的动物科普应用：通过 3D 地球探索 125 种动物，其中 42 种标注中国境内分布，涵盖七类自然环境。支持网页和 Capacitor Android APK。

## 本地运行

需要 Node.js 22.12+（本项目已在 Node.js 24 上验证）。

```sh
npm install
npm run dev
```

打开终端打印的本地地址。默认端口是 5173；已占用时 Vite 会自动选择下一个可用端口。

```sh
npm run build
npm run preview
```

生产文件输出到 `dist/`，可部署到任意静态网站托管服务，无需后端。

## GitHub Pages 自动部署

`.github/workflows/github-pages.yml` 在推送 `main` 或手动运行 **Actions → Deploy GitHub Pages → Run workflow** 时构建并部署网页。构建先检查 TypeScript，再通过生产页面测试验证摄影、地球纹理、来源清单、本地 3D 与 WebGL 回退；通过后上传 `dist/` 并发布到 `github-pages` 环境。部署成功的运行会提供网站链接。

首次使用需要在仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**，管理员也可以用已登录的 GitHub CLI 启用：

```sh
gh api --method POST repos/keosu/aniplanet/pages -f build_type=workflow
```

如果 Pages 已存在但仍使用分支发布，改用 `--method PUT` 更新 `build_type`。GitHub Free 下私有仓库不支持 Pages，需要公开仓库或使用支持私有仓库 Pages 的套餐。当前 `keosu/aniplanet` 已按用户要求通过 CLI 设为公开，并启用 Actions 发布；最新部署记录见 [AI_STATE.md](AI_STATE.md)。

工作流从 `configure-pages` 读取实际网站路径，因此支持仓库子路径和自定义域名。当前仓库的默认项目地址为 `https://keosu.github.io/aniplanet/`。运行时图片、纹理与署名文件通过 `src/assets.ts` 使用 Vite 的 `BASE_URL`，普通构建与 Android 仍使用根路径。

截至 2026-10-05 已核对最新发布：`checkout@v7`、`setup-node@v7`、`configure-pages@v6`、`upload-pages-artifact@v5`、`deploy-pages@v5`，运行环境为 `ubuntu-latest` 和 Node.js 24。只给部署 job 授予 `pages: write` 和 `id-token: write`，仅允许 `main` 发布。

本地复现仓库子路径的生产验证：

```sh
npm run build -- --base /aniplanet/
npm run test:pages -- /aniplanet/
```

`test:pages` 自行管理端口 5177 的 Vite 预览服务，读取已经构建好的 `dist/`，不重新构建。普通根路径可用 `npm run build` 后运行 `npm run test:pages`。Windows 默认调用 Edge，其余系统使用 Playwright Chromium，支持 `BROWSER_PATH`。子路径构建后如需打包 APK，运行 `npm run android:sync` 恢复根路径构建并同步原生工程。

## 设置与说明

点击右上角设置按钮，切换「设置 / 使用说明」。原底部状态栏已移除，地球操作、资料范围和来源说明移入说明页。

- **中英双语**：界面、125 种动物的资料、保护等级和分布说明一起切换；搜索同时支持中文、英文、学名和地区。
- **地球主题**：默认蔚蓝海洋，可选墨绿森林、大地沙丘、冰川极光。
- **字号**：默认正文约 15px，大字约 17px；手机与横屏使用自适应列表、分页和面板内滚动。
- **语音介绍**：物种详情和说明页可朗读，设置页可试听，支持 0.8× / 1× / 1.2× 语速。网页使用 Web Speech，Android 使用原生文字转语音服务。需要设备安装相应语言的声音，部分声音需要联网；应用本身不申请麦克风权限。关闭页面、切换语言或进入后台会停止朗读。
- **轻量动画**：本地模型带有呼吸、摆尾、鳍部摆动和水中浮动，保留模型原始姿态，以最高 30fps 渲染。支持暂停，遵循系统减少动态效果设置。打开详情或设置时，背景地球停止渲染。

语言、主题、字号、动画偏好、语速与收藏保存在当前设备。

## Android APK 与 GitHub CI

项目已包含 `android/` 原生工程和 `capacitor.config.ts`，应用 ID 为 `org.wildatlas.app`。APK 内置地球纹理、125 张动物摄影与本地示意；在线 Sketchfab 模型仍需网络。Android 支持原生语音、系统返回键、安全区和本地 GLB 文件分享。

推送到 GitHub 的 `main` / `master`、推送 `v*` 标签、提交 Pull Request，或在 **Actions → Build Android APK → Run workflow** 手动运行即可构建。在运行完成后的 **Artifacts** 下载 `wild-atlas-debug-运行编号`，解压得到 `app-debug.apk` 和 SHA-256 校验文件。

工作流先验证双语、设置、语音生命周期和动画，再执行 `npm run android:sync`、Gradle `assembleDebug lintDebug`。截至 2026-10-05 已核对当前发布版本：`checkout@v7`、`setup-node@v7`、`setup-java@v6`、`gradle/actions/setup-gradle@v6`、`upload-artifact@v7`，使用 `ubuntu-latest`、Node.js 24 与 Java 21。Dependabot 每周检查 Actions 版本更新。

默认产物是**已用调试证书签名、可安装的测试 APK**，不需要配置签名密钥。CI 每次构建的调试证书可能不同，覆盖安装提示签名不一致时需先卸载旧版（会清除本机收藏和设置）；正式分发应使用固定的 release 签名。工作流不会发布到商店或创建 GitHub Release。

本地打包需要 JDK 21 和 Android SDK（Platform 36、Build Tools 35.0.0），设置 `JAVA_HOME`、`ANDROID_HOME` 后：

```sh
npm ci
npm run android:apk
```

产物位置：`android/app/build/outputs/apk/debug/app-debug.apk`。`npm run android:sync` 更新网页和原生插件，`npm run android:open` 用 Android Studio 打开工程。Android 最低版本为 7.0（API 24），应保持 Android System WebView 更新。

## 已实现

- Three.js 地球：地表、法线、云层与大气，支持鼠标和触屏拖动、滚轮和双指缩放、方向键旋转、自转、重置与全屏。手动操作立即中止自动定位和自转。
- 单屏应用布局：分页物种侧栏、浮动选择卡、详情弹窗；手机使用抽屉。列表按可用高度调整页容量，页面不滚动，小屏仅在必要的信息面板内滚动。
- 地球动物图标按屏幕距离分组。中国模式使用境内代表观察坐标；全球模式展示全球物种库。地球随横竖屏自动适配视野。
- 七类环境：草原、森林、高山、海洋、极地、沙漠、湿地。
- 125 种动物，包含中文名、英文名、学名、食性、体型、寿命、分布、保护等级和科普知识。新增 25 种中国代表动物，包括雪豹、金丝猴、藏羚、亚洲象、朱鹮、扬子鳄、中华鲟和长江江豚。
- 19 种动物提供作者制作的写实 3D 模型，包括带有毛发、皮肤纹理和骨骼动画的狮、象、虎、熊猫、鲸等，通过 Sketchfab 在线查看；支持环绕、缩放、动作切换和暂停。
- 全部 125 种动物配有本地摄影；其中 36 种有本地 3D 简化示意。所有详情默认显示摄影，只有点击「在线 3D」才连接 Sketchfab。连接失败可返回本地摄影。
- 模型下载区区分在线与本地：作者开放下载的写实模型链接到原作下载页，其他模型提供原作入口；本地示意可导出带嵌入材质的静态 GLB，不含骨骼动画。
- 中英文搜索、环境筛选、名称或保护等级排序、收藏（保存在当前浏览器）。
- 双语物种资料、四套地球主题、字号调整、语音介绍、设置与说明页，以及 GitHub Actions APK 打包。
- 响应式布局、键盘操作、对话框焦点管理、减少动态效果偏好与 WebGL 降级提示。

## 内容与资产

- `src/data.ts`：物种资料、地理坐标和环境分类。
- `src/additionalAnimals.ts`：64 种新增物种，后续可继续补充。
- `src/chinaAnimals.ts`：25 种中国代表物种，以及已有物种的中国观察坐标。
- `src/App.tsx`、`src/styles.css`：单屏布局、分页、筛选和详情浮层。
- `src/preferences.tsx`、`src/Settings.tsx`、`src/themes.css`：持久化设置、说明页、地球配色和阅读字号。
- `src/messages.en.json`、`src/animals.en.json`、`src/localizeAnimal.ts`：完整界面与物种英文资料。
- `src/SpeechButton.tsx`：网页 / Android 双语朗读、语速和停止控制。
- `.github/workflows/android-apk.yml`：校验、构建和上传 APK；`.github/dependabot.yml`：版本更新检查。
- `.github/workflows/github-pages.yml`：生产验证与 Pages 自动部署；`src/assets.ts`：随部署路径加载公共资产。
- `src/animalEmoji.ts`：地球导航用动物图标。
- `src/Globe.tsx`：地球渲染与标记交互。
- `src/AnimalScene.tsx`、`src/models.ts`：3D 环境与程序化动物形态。
- `src/RealisticViewer.tsx`：Sketchfab 查看器、动作选择、加载状态与备用入口。
- `src/realistic-models.json`：精选写实模型的作者、ID 与来源。
- `src/ModelDownloads.tsx`、`src/exportSchematic.ts`：下载入口与本地 GLB 导出。
- `public/model-credits.json`：模型署名与原作许可信息。
- `public/images/`：本地图片，运行时无需请求第三方图片服务。
- `public/image-credits.json`：摄影作者、来源与许可信息；详情「来源」标签和「使用与来源」面板可查阅。

动物摄影来自 Wikimedia Commons；多数环境摄影来自 Unsplash；地球纹理来自 Three.js 示例使用的 NASA 地球资产。使用、再分发时请遵守各图片的原始许可。字体使用本机系统字体，不请求 Google Fonts。

写实 3D 使用原作者公开的 Sketchfab 查看器，需要网络和浏览器图形加速；本项目未下载、修改或再分发这些模型文件。公开嵌入不等于获得模型文件的再利用许可，下载、修改、商业再分发须另行遵循原作授权。模型是艺术重建，部分展示特定亚种、性别或季节毛色，真实外观也可参考摄影。

Sketchfab 在国内的实际可用性取决于线路与资源域名，当前环境不能验证国内各运营商。主界面、本地摄影、示意和 GLB 导出均已在屏蔽外部请求的浏览器测试中验证；在线模型作为可选功能保留。

「本地示意」仍使用程序构建的简化模型。地理标记是代表坐标，不是完整分布范围。体型、寿命是近似范围；全球保护等级可能随评估更新，区域种群情况也可能不同。

## 验证

`npm run build` 执行 TypeScript 检查与生产构建。

`npm run test:features` 自动在端口 5176 启动并关闭测试服务，验证 125 条英文资料、主题和字号持久化、双语搜索、语音开始 / 停止 / 切换 / 缺少语音包、模型动画暂停、系统减少动态效果，以及 7 种尺寸下的两个字号。语音测试模拟系统语音回调，不依赖 CI 音频驱动；实际发声取决于设备上的语音引擎与语言包。Windows 默认用 Edge，其余系统先运行 `npx playwright install --with-deps chromium`。可用 `BROWSER_PATH` 指定浏览器。

`scripts/smoke-test.mjs` 使用 Playwright 检查浏览器交互、图片、收藏持久化、3D 场景、筛选、资料来源及移动端溢出，并把截图存入 `test-results/`。运行前启动开发服务：

```sh
node scripts/smoke-test.mjs
node scripts/explorer-check.mjs
node scripts/realistic-check.mjs
node scripts/catalog-check.mjs
```

脚本默认使用 Windows 上的 Microsoft Edge 和 `http://localhost:5175/`；可用 `BROWSER_PATH` 和 `BASE_URL` 环境变量覆盖。跨平台环境可安装 Playwright Chromium，然后将 `BROWSER_PATH` 设为空并使用其默认浏览器。

写实模型测试使用浏览器实际图形加速，检查核心模型成功加载、骨骼动作选择、暂停、切换后的资源清理、手机布局和网络失败时的本地备用入口。`scripts/curate-models.mjs` 可刷新精选模型的公开元数据；它不会下载模型文件。

`scripts/smoke-test.mjs` 转入 `app-layout-check.mjs`，检查中国/全球筛选、分页、六种视口尺寸、收藏、来源、本地 GLB 导出以及默认无外部请求。`catalog-check.mjs` 验证 125 张图片可解码、署名完整及物种 ID/学名唯一。

`scripts/explorer-check.mjs` 检查图标拖动、分组选择、键盘和滚轮操作、真实触屏拖动，以及下载权限提示和 GLB 文件结构。

## 累积更新

新增物种时，在数据文件中填写资料、代表坐标、emoji 和 Wikipedia 词条；中国分布通过 `china` 字段及 `chinaObservations` 显式标注。运行 `node scripts/sync-species-assets.mjs` 增量保存新照片和作者许可，保留已收录资产；脚本通过 Vite 加载完整数据集，遵循来源站的重试间隔。可用 `--refresh=物种ID` 更新指定照片。确认图片内容、资料和署名后再发布。

同时在 `src/animals.en.json` 补齐对应 ID 的英文资料（含 `chinaRegion`，如有中国分布）；新增界面文案同步填写 `src/messages.en.json`。运行 `npm run test:features` 检查翻译覆盖与交互。

新增写实模型时，在 `scripts/curate-models.mjs` 中加入物种 ID 与原作 UID，运行脚本刷新元数据和 `isDownloadable`，并验证物种外观、加载、动作与许可。页面数量和模型覆盖数自动更新。公开下载通常需要在 Sketchfab 原站登录，具体权限以原作者页面为准。
