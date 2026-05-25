# v2 — Inngest 异步 Codegen

> **状态**：已实现（2026-05-20；2026-05-25 增强 v2.1-A/C + v3 部署文档）  
> **表**：`codegen_runs`（迁移 `sql/migrations/20260520_codegen_runs.sql`）

## 事件（与 `project/generate.requested` 并列）

| 事件 | API 触发 |
|------|----------|
| `project/codegen.flutter.requested` | `POST /api/projects/[id]/codegen/flutter` |
| `project/codegen.wechat.requested` | `POST /api/projects/[id]/codegen/wechat` |

## 流程

1. API 插入 `codegen_runs`（`queued`）并 `inngest.send`
2. Inngest 函数 `codegen-flutter` / `codegen-wechat` 执行 `execute*Codegen`
3. 从 `final_report` 构建 Spec（LLM 最多 3 次重试 + screen 规整）→ 生成工程
4. **v2.1-A**：本地 Docker `dart analyze` 门禁（无 Docker 则 `analyzeStatus: skipped`）
5. ZIP → Storage / 本机 `/tmp/app-factory-artifacts/<runId>/`
6. 更新 `completed` + `artifact_path` + `metadata.analyzeStatus`

## 查询与下载

- `GET /api/projects/[id]/codegen/runs` — 列表
- `GET /api/projects/[id]/codegen/runs/[runId]` — 状态 + `downloadUrl`
- `GET .../download` — ZIP 流

## 本地联调

1. 维护者**首次**在 Supabase 执行 `sql/migrations/20260520_codegen_runs.sql`
2. 终端 A：`npm run start -- -p 3001`（或 dev）
3. 终端 B：`npm run inngest:dev:3001`
4. **Docker Desktop** 运行中（Flutter analyze 门禁；可 `CODEGEN_DOCKER_ANALYZE_DISABLED=1` 跳过）
5. 详情页「后台生成 Flutter ZIP」或 `curl -X POST .../codegen/flutter`

## 同步验收（不经 Inngest）

```bash
npm run verify:codegen:flutter -- 833ad678-f204-40d7-a47c-5b76e803f64f
```

## 部署

见 [v3-部署指南.md](./v3-部署指南.md)；`npm run check:deploy`。
