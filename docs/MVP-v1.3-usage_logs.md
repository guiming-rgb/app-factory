# MVP v1.3 — 可观测与成本（usage_logs）

## 目标

能回答：**单次生成花了多久、调了几次模型、大概多少 Token**。

## 表结构

见 `sql/schema.sql` 与增量脚本 `sql/migrations/20260519_usage_logs.sql`。

| 字段 | 说明 |
|------|------|
| `project_id` | 所属项目 |
| `agent_run_id` | 对应一次 Agent 运行 |
| `event_type` | 当前仅 `llm_call` |
| `duration_ms` | 单次 LLM 墙钟耗时 |
| `prompt_tokens` / `completion_tokens` / `total_tokens` | OpenAI 兼容 API 返回 |
| `model_name` | 实际模型名 |

## 代码落点

- `lib/llm.ts`：`callLLM` 返回 `usage`
- `lib/workflow.ts`：每步 Agent 完成后 `insertUsageLog`
- `lib/usage-logs.ts`：写入 / 汇总 / 重跑时清理
- 项目详情页：有数据时展示「生成用量（v1.3）」卡片

## 部署步骤（Supabase）

1. 在 Supabase SQL Editor 执行 `sql/migrations/20260519_usage_logs.sql`
2. 重启 Next（3001）+ Inngest Dev（`npm run inngest:dev:3001`）
3. **新建或重新生成**一个项目（历史 completed 项目无 usage 行，卡片不显示）

## 验收（v1.3）

- [ ] 迁移已执行
- [ ] 完整跑通 8 Agent 后，详情页出现用量卡片
- [ ] `usage_logs` 表有 8 行 `llm_call`，`total_tokens` 合计 > 0
