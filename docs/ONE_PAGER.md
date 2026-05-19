# App 生产工厂 — 一页简报（约 1 分钟）

> **用途**：开工第一眼；细节见 [执行计划.md](./执行计划.md)、[CONTINUOUS_DELIVERY_OUTLINE.md](./CONTINUOUS_DELIVERY_OUTLINE.md)、[HANDOFF.md](./HANDOFF.md)。

## 当前事实（截至 2026-05-19）

- **产品**：Next + Supabase + Inngest，8 Agent 异步生成方案（MVP v1.2）。
- **验收 A**：**已通过**（真机双进程、completed + 8×`agent_runs`；详见 [验收记录.md](./验收记录.md)）。
- **分支**：`feature/v1.2-inngest`（合并 `main` 待议事）。
- **路线**：微信原生小程序 **必选**；里程碑 **MVP v2 / v2a / v2b** 见 [执行计划.md](./执行计划.md)。

## 近期待办（压缩）

1. 议事：是否合并 **`feature/v1.2-inngest` → `main`**。
2. **MVP v1.3** 可观测与成本，或 **v2a** 调研（见 TCM 大纲 §2 下一批）。
3. 每次生成前：**终端 A（3001 网站）+ 终端 B（`inngest:dev:3001`）** 同时运行。

## 本地入口（本机常用：3001）

| 用途 | URL / 命令 |
|------|------------|
| 工厂 Web | `http://localhost:3001` |
| 终端 A | `npm run build && npm run start -- -p 3001` |
| 终端 B | `npm run inngest:dev:3001` |
| Inngest 本地 UI（常见） | `http://localhost:8288` |

## 必读安全 / 合规

- [安全审计与清单.md](./安全审计与清单.md)
- [开发纲要.md](./开发纲要.md)
