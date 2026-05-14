# App 生产工厂 — 一页简报（约 1 分钟）

> **用途**：开工第一眼；细节见 [执行计划.md](./执行计划.md)、[CONTINUOUS_DELIVERY_OUTLINE.md](./CONTINUOUS_DELIVERY_OUTLINE.md)、[HANDOFF.md](./HANDOFF.md)。

## 当前事实（截至文档更新）

- **产品**：Next + Supabase + Inngest，8 Agent 异步生成方案（MVP v1.2 架构）。
- **代码阶段**：v1.2 **联调候选**；**验收 A**（真机双进程 + DB/产品验收）仍为队列项（以 Supabase 实测为准）。
- **路线文档**：小程序 **必选**；里程碑 **MVP v2 / v2a / v2b** 已写入 [执行计划.md](./执行计划.md)。

## 近期待办（压缩）

1. 双进程：`npm run dev:3000` + `npm run inngest:dev`；打开 `http://localhost:3000` 跑通一次生成。
2. 按 [执行计划.md](./执行计划.md) 第二节「收工备忘」中的 SQL 做 **数据检疫**。
3. 通过后更新 [HANDOFF.md](./HANDOFF.md) + [CONTINUOUS_DELIVERY_OUTLINE.md](./CONTINUOUS_DELIVERY_OUTLINE.md) §3，并 `git commit`。

## 本地入口（默认端口）

| 用途 | URL |
|------|-----|
| 工厂 Web | `http://localhost:3000` |
| Inngest 端点 | `http://localhost:3000/api/inngest` |
| Inngest 本地 UI（常见） | `http://localhost:8288` |

## 必读安全 / 合规

- [安全审计与清单.md](./安全审计与清单.md)
- [开发纲要.md](./开发纲要.md)
