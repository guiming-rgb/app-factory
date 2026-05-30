# App 生产工厂 — 一页简报（约 1 分钟）

> **用途**：开工第一眼；细节见 [执行计划.md](./执行计划.md)、[HANDOFF.md](./HANDOFF.md)。

## 当前事实（截至 2026-05-30）

- **产品**：Next + Supabase + Inngest，8 Agent 异步；**v1.3** `usage_logs` 8/8。
- **代码生成**：Flutter + 小程序 + **鸿蒙（同步）**；**S6 待办 E2** 三栈 parity（`npm run verify:todo:parity`）。
- **P0 生产验收** ✅ · **T1 小程序待办** ✅（微信开发者工具模拟器）。
- **导出缓存**：`X-App-Artifact-Cache: hit|fresh`；待办项目 `requireTodoMvp` 仅命中 `metadata.codegenTodoMvp` 的 run，避免旧占位 ZIP。
- **ZIP**：Vercel 用 **adm-zip**（无系统 unzip）。
- **生产**：https://app-factory-five.vercel.app
- **本地**：`npm run dev:codegen:3001`（Next 3001 + Inngest 8288）或双终端 `start -p 3001` + `inngest:dev:3001`。

## 近期待办（批次 G）

1. **G0** ✅ 落盘 · `verify:todo:parity` · `maintainer:pending` → 0
2. **G1** Codegen 成功率（`stats:codegen`）：小程序目标 >75%；鸿蒙改同步后观察新 run
3. **G2** ✅ 实体列表示例 + 三栈门禁 UI（`verify:g2:entity-scaffold`）
4. **维护者可选**：DevEco Run · Flutter run · 微信真机预览

详表：[三阶段-执行计划-20260519.md](./三阶段-执行计划-20260519.md)

## 入口

| 用途 | URL / 命令 |
|------|------------|
| **生产 Web** | https://app-factory-five.vercel.app |
| 本地 Web | http://localhost:3001 |
| 门禁 | `verify:todo:parity` · `verify:c6:harmony` · `verify:c3:wechat-compile` · `stats:codegen:failures` |
| 部署 | `deploy:vercel:env` · `deploy:vercel` |

## 必读

- [HANDOFF.md](./HANDOFF.md) · [三阶段-执行计划-20260519.md](./三阶段-执行计划-20260519.md) · [命令组-联调与验收.md](./命令组-联调与验收.md)
