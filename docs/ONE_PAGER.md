# App 生产工厂 — 一页简报（约 1 分钟）

> **用途**：开工第一眼；细节见 [执行计划.md](./执行计划.md)、[HANDOFF.md](./HANDOFF.md)。

## 当前事实（截至 2026-05-22）

- **产品**：Next + Supabase + Inngest，8 Agent 异步；**v1.3** `usage_logs` 8/8。
- **代码生成**：v2a Flutter + v2b 小程序；**MVP v2** ✅；v2.1 auto-fix + Docker 门禁 ✅。
- **Auth / v5**：v4-1～v4-6 ✅ · v5-1～v5-9 ✅（记忆、Skills 管理、技能注入可观测）。
- **Codegen C1/C3/C4**：Report→Spec · 小程序真编译 · GitHub OAuth push ✅
- **生产**：https://app-factory-five.vercel.app（Vercel + Inngest Cloud + 同库 Supabase）。
- **本地**：http://localhost:3001 · 双进程 `start -p 3001` + `inngest:dev:3001`。

## 近期待办（三阶段）

1. **① 加固（可选）**：S6 发版前全链路 `verify:v3:production`
2. **③ Codegen 主线**：**C5** App Spec 阶段 C
3. **后置**：V5-10 跨项目用户画像

详表：[三阶段-执行计划-20260519.md](./三阶段-执行计划-20260519.md)

## 入口

| 用途 | URL / 命令 |
|------|------------|
| **生产 Web** | https://app-factory-five.vercel.app |
| 本地 Web | http://localhost:3001 |
| 门禁 | `verify:c1:report-to-spec` · `verify:c3:wechat-compile` · `verify:v4:batch:local` · `accept` |
| 部署 | `deploy:vercel:env` · `deploy:vercel` |

## 必读

- [HANDOFF.md](./HANDOFF.md) · [三阶段-执行计划-20260519.md](./三阶段-执行计划-20260519.md) · [命令组-联调与验收.md](./命令组-联调与验收.md)
