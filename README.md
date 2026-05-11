# App 生产工厂（MVP v1.1）

AI 原生软件生产平台：输入 App 想法，经 8 个智能体串行生成完整项目方案（立项、PRD、计划、架构、UI、开发、测试、商业），结果写入 Supabase。

## v1.1 新增

- **生产中自动轮询**：`running` 时每约 5 秒 `router.refresh()`。
- **Markdown 下载**：`GET /api/projects/[id]/export`，详情页「下载 Markdown」。
- **复制完整报告**：一键复制 `final_report`。
- **历史项目**：`/projects` 列表（最近 50 条）。
- **Agent 进度**：详情页显示「x/8 已完成」与进度条。
- **安全重试**：`running` 时接口拒绝重复启动，**不会**删除 `agent_runs`；`failed` 重试、`completed` 重新生成前需确认；**已完成**重新生成须 `forceRegenerate: true`（由「重新生成报告」按钮发起）。

## 本地运行

1. 安装依赖：`npm install`
2. 在 Supabase SQL Editor 依次执行 `sql/schema.sql`、`sql/seed.sql`
3. 复制环境变量：`cp .env.local.example .env.local`，填入真实 `NEXT_PUBLIC_SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`（**务必使用 service_role，勿提交到 Git**）、`OPENAI_API_KEY`；按需修改 `OPENAI_BASE_URL` / `OPENAI_MODEL`
4. 若 dev 端口不是 3000，将 `NEXT_PUBLIC_APP_URL` 改为实际地址（供服务端拉取项目详情）
5. 启动：`npm run dev`，打开 `http://localhost:3000`

## 使用流程

首页填写想法 → 创建项目 → 在项目页点击「开始 AI 生产」→ 等待 8 个 Agent 完成（生产中页面会自动刷新）→ 查看分段结果与「最终完整报告」，可下载 `.md` 或复制全文。首页或详情页可进入「历史项目」。

## 说明

- 当前为**同步**长请求：8 次模型调用串行，部署到 Vercel 需注意函数超时；生产环境建议改为队列 + Worker + 前端轮询。
- 失败重试会清空该项目的旧 `agent_runs` 并重新生成，避免重复卡片。
- `POST /api/projects/[id]/generate`：无 body、空 body 或非法 JSON 时视为不强制覆盖；若项目在 `running` 时重复调用，返回 **409 Conflict**，body 含 `{ success: false, error: "项目正在生成中，请勿重复启动" }`。

## 技术栈

Next.js 14（App Router）、TypeScript、Tailwind CSS、Supabase（PostgreSQL）、OpenAI 兼容 API。
