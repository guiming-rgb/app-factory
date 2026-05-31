# App 生产工厂 — 一页简报（约 1 分钟）

> **用途**：开工第一眼；细节见 [执行计划.md](./执行计划.md)、[HANDOFF.md](./HANDOFF.md)。

## 当前事实（截至 2026-06-01 收工）

- **生产就绪 ≈ 100%**：鸿蒙 ZIP 真源 + `verify:v3:production:quick` ✅
- **生产**：https://app-factory-five.vercel.app · `dpl_7DvhbvZtTGCBxqWwSCSLHZjCwsY2`
- **生产探针**：`.env.local` 设 `V3_HTTP_PROXY=http://127.0.0.1:7897`（勿提交）→ `npm run verify:v3:production:quick`
- **枪战**：`0ea7a53c-a645-4ad9-a43a-02263f9b7b4a`
- **目录**：`cd "/Users/guiming/Desktop/app生产工厂/app-factory"`

## 可选下一批

- `stats:codegen` · DevEco E4 · 体验 E1–E5

详表：[三阶段-执行计划-20260519.md](./三阶段-执行计划-20260519.md)

## 入口

| 用途 | URL / 命令 |
|------|------------|
| **生产 Web** | https://app-factory-five.vercel.app |
| 本地 Web | http://localhost:3001 |
| 门禁 | `verify:i0:batch` · `verify:i1:flutter` · `trigger:shooter:8-8` · `verify:i2:shooter` |
| 部署 | `deploy:vercel:env` · `deploy:vercel` |

## 必读

- **[验收大纲-自动与必做.md](./验收大纲-自动与必做.md)** — 自动 vs 必做（当前 **0 阻塞**）
- [HANDOFF.md](./HANDOFF.md) · [收工记录-20260601-今日收工.md](./收工记录-20260601-今日收工.md)
