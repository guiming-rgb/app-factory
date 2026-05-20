# App 生产工厂 — 一页简报（约 1 分钟）

> **用途**：开工第一眼；细节见 [执行计划.md](./执行计划.md)、[CONTINUOUS_DELIVERY_OUTLINE.md](./CONTINUOUS_DELIVERY_OUTLINE.md)、[HANDOFF.md](./HANDOFF.md)。

## 当前事实（截至 2026-05-20）

- **产品**：Next + Supabase + Inngest，8 Agent 异步生成方案（MVP v1.2）；**v1.3** 用量 `usage_logs`。
- **代码生成**：**v2a** Flutter ZIP + **v2b** 小程序 ZIP；**MVP v2** 虚拟汇总 ✅（G6+G8）。
- **增强**：**报告→Spec**；**v2.1 沙箱**（本机 + **Docker**）；**Inngest codegen**（`POST .../codegen/flutter|wechat`）。
- **远程**：`https://github.com/guiming-rgb/app-factory` · 标签 `mvp-v2`。
- **章程**：验收 Agent 终端优先 · [agent-testing-minimal-human.mdc](../.cursor/rules/agent-testing-minimal-human.mdc)。

## 近期待办（压缩）

1. **v2.1 完整**：Docker 沙箱、自动修错、小程序 CLI 构建。
2. 首次 SQL：`20260520_codegen_runs.sql`；产物 Storage、前端 codegen 按钮。
3. 安全中期 Auth/RLS 或 **v3** 部署预览。

## 本地入口（本机常用：3001）

| 用途 | URL / 命令 |
|------|------------|
| 工厂 Web | `http://localhost:3001` |
| 终端 A | `npm run build && npm run start -- -p 3001` |
| 终端 B | `npm run inngest:dev:3001` |
| 门禁 | `accept` · `verify:codegen` · `verify:wechat-codegen` · `sandbox:flutter:docker:analyze-only` · `verify:codegen:flutter` |

## 必读

- [开发纲要.md](./开发纲要.md) · [命令组-联调与验收.md](./命令组-联调与验收.md) · [维护者最小参与清单.md](./维护者最小参与清单.md)
