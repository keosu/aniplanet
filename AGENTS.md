# Agent 工作入口

这是野境（Wild Atlas / ani3D）项目。开始工作前先阅读根目录的 [AI_STATE.md](AI_STATE.md)，再按任务需要查阅 [README.md](README.md) 和源码。

## 接续方式

- 用 `git status --short`、`git log -5 --oneline`、`git remote -v` 核对实际状态。AI_STATE.md 是有日期的交接快照，当前文件、Git 状态和用户最新要求优先。
- 默认用中文与用户沟通。用户已要求较大的阅读字号、中英双语、语音介绍、地球色彩主题、动物轻量动画和 Capacitor APK CI。
- 已完成的工作不要重复实施；没有新的任务时，不把交接文档里的可选后续事项当成自动执行的待办。
- 保留用户已有改动；不要依赖上一会话的终端会话 ID、后台进程或临时工具目录仍然可用。

## 实现约定

- 界面文案通过 `usePreferences().t()` 切换语言，新增文案同步维护 `src/messages.en.json`。
- 新增物种时同步维护中文数据、`src/animals.en.json`、照片和来源署名；有中国分布时需要英文 `chinaRegion`。保持物种 ID 稳定。
- 配色和阅读字号优先使用 `src/themes.css` 中的变量。`src/main.tsx` 在基础样式之后导入主题样式，注意覆盖顺序。
- 保持固定视口和面板内滚动；调整字号、列表或详情时兼顾窄屏、横屏和分页高度。
- 详情默认显示本地摄影，用户点击在线 3D 后才加载 Sketchfab。保留本地内容及网络失败回退，保留原作者署名与许可。
- 动画遵循暂停和减少动态效果设置，更新运动部件时保留模型初始变换；关闭页面、切换语言或进入后台时应停止朗读。
- 修改网页或插件后，打包前运行 `npm run android:sync`；不要直接编辑生成的 Android 网页副本。
- 用户要求 CI 使用最新 Actions。版本信息必须按当时实际发布情况核对，不要根据旧知识降级；同时保持 Node、JDK、Gradle 与 Capacitor 兼容。

## 验证与版本管理

- 按改动运行相关检查，命令及历史验证结果见 AI_STATE.md / README.md。仅文档改动无需重跑应用构建和浏览器测试。
- `npm run test:features` 自行管理端口 5176 的测试服务；旧布局测试需要另行启动端口 5175 的开发服务。
- 不提交 `node_modules/`、`dist/`、`tmp/`、测试输出、Gradle 缓存、APK 或签名密钥。保留 Gradle wrapper JAR、lockfile、源码、照片和署名文件。
- 区分“本地构建 / 模拟回调测试通过”与“GitHub CI / Android 真机验证通过”，不要把前者写成后者。
- 完成有实质内容的工作后更新 AI_STATE.md：记录变更、验证结果、尚未解决或尚未验证的事项，以及可复现的下一步。不要记录凭据、私钥或依赖会话内存的状态。
