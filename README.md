# App 生产工厂（MVP v1.2）

AI 原生软件生产平台：输入 App 想法，经 8 个智能体串行生成完整项目方案（立项、PRD、计划、架构、UI、开发、测试、商业），结果写入 Supabase。

- **完整执行计划 + 每日开工习惯**： [docs/执行计划.md](./docs/执行计划.md)  
- **开发纲要（目标 / 约束 / 联调要点）**： [docs/开发纲要.md](./docs/开发纲要.md)  
- **安全审计与清单（前期 / 中期 / 后期 + 当前风险）**： [docs/安全审计与清单.md](./docs/安全审计与清单.md)  
- **功能表、架构、路径与交接备忘**： [docs/项目功能与架构交接.md](./docs/项目功能与架构交接.md)  
- **版本 / 分支 / 标签 / 同步版回退**： [docs/版本与分支.md](./docs/版本与分支.md)  
- **多平台长期路线（三栈 + App Spec IR）**： [docs/多平台App生产工厂路线图.md](./docs/多平台App生产工厂路线图.md)  
- **App Spec IR v0.1 草案**： [docs/App-Spec-v0.1-草案.md](./docs/App-Spec-v0.1-草案.md)

## v1.2（当前）：Inngest 异步队列

- **`POST /api/projects/[id]/generate`**：只做 `prepareProjectWorkflow`（校验、清理、`status=running`）+ `inngest.send`，**立即返回** `{ success: true, mode: "async" }`。
- **后台执行**：`lib/inngest/functions.ts` 中函数监听 `project/generate.requested`，调用 `executeProjectWorkflow` 跑 8 个 Agent。
- **端点**：`GET|POST|PUT /api/inngest`（Inngest 同步/调用）。
- **重试策略**：该函数 **`retries: 0`**，避免 Inngest 整段重试导致 `agent_runs` 重复；失败请在前端对 `failed` 项目重试（会清理旧 runs）。
- **投递失败**：若 `inngest.send` 抛错，会 `markProjectFailed`，避免长期卡在 `running`。

## v1.1（保留）

自动轮询、Markdown 导出、复制报告、历史项目、进度条、`running` 时 **409**、`forceRegenerate` 与确认弹窗等逻辑不变。

## 本地运行（必须两个进程）

1. 安装依赖：`npm install`
2. Supabase：执行 `sql/schema.sql`、`sql/seed.sql`
3. `cp .env.local.example .env.local`，填入 Supabase、模型 Key；**本地联调务必**在 `.env.local` 增加一行 **`INNGEST_DEV=1`**（否则 `PUT /api/inngest` 会 500）；上云后再关并配置 `INNGEST_SIGNING_KEY` 等
4. **终端 A**：`npm run dev`；联调建议 **`npm run dev:3000`** 固定端口，与下方 Inngest 默认 URL 一致（否则改 `NEXT_PUBLIC_APP_URL` 与 Inngest `-u`）
5. **终端 B**：`npx inngest-cli@latest dev -u http://localhost:3000/api/inngest`（端口按实际修改）
6. 浏览器打开 Inngest 本地控制台（CLI 会打印地址，常见 `http://localhost:8288`）确认已连上 App
7. 打开 `http://localhost:3000` 创建项目并「启动 AI 后台生产」→ 应快速返回 → 后台跑完后页面轮询到 `completed`

## 使用流程

首页填写想法 → 创建项目 → **启动 AI 后台生产**（接口秒回）→ 保持 **Inngest Dev Server** 运行 → 详情页自动刷新进度 → 查看报告、下载、复制。

## API 说明

- `POST /api/projects/[id]/generate`：body 可选 `{ "forceRegenerate": true }`；`running` 重复调用 → **409**；已完成且未带 `forceRegenerate` → **400**。
- 生产部署：在 Inngest Cloud 创建应用，配置 `INNGEST_EVENT_KEY`、`INNGEST_SIGNING_KEY`，并将 Vercel 等 URL 注册为同步目标。

## 技术栈

Next.js 14（App Router）、TypeScript、Tailwind CSS、Supabase、OpenAI 兼容 API、**Inngest**。
