# App 生产工厂 — 一页简报（约 1 分钟）

> **用途**：开工第一眼；细节见 [执行计划.md](./执行计划.md)、[HANDOFF.md](./HANDOFF.md)。

## 当前事实（截至 2026-05-31 收工）

- **产品**：8 Agent + 三栈同步 codegen；维护者 **S6 本地全链路** 已通过。
- **枪战**：`0ea7a53c-a645-4ad9-a43a-02263f9b7b4a` 生产页 8/8 + 三栈已完成。
- **鸿蒙 K2**：实体列表 PostgREST（未配 URL 时回退示例行）。
- **生产**：https://app-factory-five.vercel.app · `dpl_JBiWLbLoaofPqx3hGHacude43bii`
- **终端目录**：`cd "/Users/guiming/Desktop/app生产工厂/app-factory"`（不是下载的 `kids_*-harmony`）

## 明日优先（批次 L）

1. 鸿蒙 codegen **注入 Supabase 常量**
2. 可选 `verify:v3:production`
3. `stats:codegen` 看 K+部署 后 harmony 新 run

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
- [HANDOFF.md](./HANDOFF.md) · [收工记录-20260530-今日收工.md](./收工记录-20260530-今日收工.md) · [批次 J](./收工记录-20260530-批次J.md)
