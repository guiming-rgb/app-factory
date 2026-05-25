# App 生产工厂 — 一页简报（约 1 分钟）

> **用途**：开工第一眼；细节见 [执行计划.md](./执行计划.md)、[HANDOFF.md](./HANDOFF.md)。

## 当前事实（截至 2026-05-26）

- **产品**：Next + Supabase + Inngest，8 Agent 异步方案（v1.2）；**v1.3** `usage_logs` 8/8。
- **代码生成**：v2a Flutter + v2b 小程序；**MVP v2** ✅（G6+G8）；v2.1 auto-fix + 小程序结构门禁 ✅。
- **codegen**：G10/G11 · Storage · HTML 预览 · 异步 wechat E2E ✅。
- **生产**：https://app-factory-five.vercel.app（Vercel + Inngest Cloud + 同库 Supabase）。
- **远程**：`guiming-rgb/app-factory` · `main` @ `bff6e0b` 起。
- **章程**：验收 Agent 终端优先 · [agent-testing-minimal-human.mdc](../.cursor/rules/agent-testing-minimal-human.mdc)。

## 近期待办（压缩）

1. ~~v3 上云~~ ✅ · 尾项：浏览器 generate 冒烟 + Inngest Serve URL（可选一次）
2. **v4 Auth + RLS** — v4-1～v4-5 ✅ · 下一步 v4-6 限流
3. v4 实施后：限流、历史项目 owner 回填策略

**收工**：[收工记录-20260526-v4-auth.md](./收工记录-20260526-v4-auth.md)（v4-1·v4-2 · 未 push）

## 入口

| 用途 | URL / 命令 |
|------|------------|
| **生产 Web** | https://app-factory-five.vercel.app |
| 本地 Web | http://localhost:3001 |
| 本地双进程 | `start -p 3001` + `inngest:dev:3001` |
| 门禁 | `verify:codegen:flutter` · `verify:codegen:wechat` · `verify:v13` · `verify:v3:production` |
| 部署 | `deploy:vercel:env` · `deploy:vercel` |

## 必读

- [HANDOFF.md](./HANDOFF.md) · [v4-Auth-RLS-设计草案.md](./v4-Auth-RLS-设计草案.md) · [命令组-联调与验收.md](./命令组-联调与验收.md)
