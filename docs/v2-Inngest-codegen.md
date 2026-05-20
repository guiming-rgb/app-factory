# v2 — Inngest 异步 Codegen

> **状态**：已实现（2026-05-20）  
> **表**：`codegen_runs`（迁移 `sql/migrations/20260520_codegen_runs.sql`）

## 事件（与 `project/generate.requested` 并列）

| 事件 | API 触发 |
|------|----------|
| `project/codegen.flutter.requested` | `POST /api/projects/[id]/codegen/flutter` |
| `project/codegen.wechat.requested` | `POST /api/projects/[id]/codegen/wechat` |

## 流程

1. API 插入 `codegen_runs`（`queued`）并 `inngest.send`
2. Inngest 函数 `codegen-flutter` / `codegen-wechat` 执行 `execute*Codegen`
3. 从 `final_report` 构建 Spec → 生成 ZIP → 写入本机 `/tmp/app-factory-artifacts/<runId>/`
4. 更新 `completed` + `artifact_path`

## 查询与下载

- `GET /api/projects/[id]/codegen/runs` — 列表
- `GET /api/projects/[id]/codegen/runs/[runId]` — 状态 + `downloadUrl`
- `GET .../download` — ZIP 流（产物在 Next 进程 tmp，重启后可能 410）

## 本地联调

1. 维护者**首次**在 Supabase 执行 `sql/migrations/20260520_codegen_runs.sql`
2. 终端 A：`npm run start -- -p 3001`（或 dev）
3. 终端 B：`npm run inngest:dev:3001`
4. 触发：`curl -X POST http://localhost:3001/api/projects/<id>/codegen/flutter`

## 同步验收（不经 Inngest）

```bash
npm run verify:codegen:flutter -- 833ad678-f204-40d7-a47c-5b76e803f64f
```

需已跑迁移 + `.env.local`。

## 未做

Supabase Storage 持久化、前端按钮、沙箱 analyze 接入 codegen 流水线。
