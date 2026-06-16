# App 生产工厂 — 一页简报（约 1 分钟）

> **用途**：开工第一眼；细节见 [执行计划.md](./执行计划.md)、[HANDOFF.md](./HANDOFF.md)。

## 当前事实（截至 2026-06-17）

- **Claude / 全量记忆**：[Claude共享记忆-总索引.md](./Claude共享记忆-总索引.md) · [CLAUDE.md](../CLAUDE.md)
- **R1 发行**：[R1-发行路线图.md](./R1-发行路线图.md) — GHA 条件签名 · `/privacy` `/terms` ✅ 代码已合入
- **9 Agent** | 安全合规顾问 + complianceFlags · **DB migration 待跑**
- **生产** | https://app-factory-five.vercel.app · **redeploy 后才有 /privacy**
- **本地** | `npm run dev:codegen:3001` → 3001 + Inngest 8288
- **枪战** | `0ea7a53c-a645-4ad9-a43a-02263f9b7b4a`
- **目录** | `/Users/guiming/Desktop/app生产工厂/app-factory`

## 明日优先

1. Supabase migration（9 Agent）  
2. Vercel redeploy  
3. Apple/Win GitHub Secrets（可选实跑签名 GHA）

## 入口

| 用途 | URL / 命令 |
|------|------------|
| **生产 Web** | https://app-factory-five.vercel.app |
| 隐私/条款（deploy 后） | `/privacy` · `/terms` |
| 本地 Web | http://localhost:3001 |
| 门禁 | `npm run build` · `verify:t:desktop:build` |

## 必读

- [收工记录-20260617-今日收工.md](./收工记录-20260617-今日收工.md)
- [HANDOFF.md](./HANDOFF.md)
