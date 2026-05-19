# 合并 `main` 议事记录 — feature/v1.2-inngest

> **日期**：2026-05-19  
> **决策**：**同意合并**（用户确认：先 A 后 B）

## 前置条件核对

| 项 | 结论 |
|----|------|
| 验收 A（双进程 + 8/8 + Supabase） | ✅ 已通过（见 [验收记录.md](./验收记录.md)） |
| 安全审计 §3.1 底线（密钥不进前端、AI 仅服务端） | ✅ 仍符合 |
| 公网无登录 / 无 RLS | ⚠️ **已知风险**，合并不消除；仅适合本机/可信内网（见 [安全审计与清单.md](./安全审计与清单.md) §3.2） |
| 同步版回退 | ✅ 保留标签 **`mvp-v1.1`**（指向合并前 `main` 尖端 `76e5a3a`） |

## 合并后果（必读）

- 合并后 **`main` = MVP v1.2 异步版**（Inngest + `prepareProjectWorkflow` / `executeProjectWorkflow`）。
- **不再**在 `main` 上保留同步 `runProjectWorkflow` 长请求路径。
- 需要同步行为：`git checkout mvp-v1.1` 或从标签检出。

## 合并后标签

| 标签 | 指向 |
|------|------|
| `mvp-v1.1` | 合并前 `main`（同步版快照，不变） |
| `mvp-v1.2` | 合并后 `main` 尖端（异步版生产主线） |
| `mvp-v1.2-code` | 历史：feature 分支尖端（可与 `mvp-v1.2` 同提交） |

## 合并后仍待办（不阻塞合并）

- MVP v1.3：Supabase 执行 `sql/migrations/20260519_usage_logs.sql` 后验收（见 [MVP-v1.3-usage_logs.md](./MVP-v1.3-usage_logs.md)）
- 中期：Auth + `user_id` + RLS + 限流（安全清单 §4.2）
