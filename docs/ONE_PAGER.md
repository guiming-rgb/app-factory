# App 生产工厂 — 一页简报（约 1 分钟）

> **用途**：开工第一眼；细节见 [执行计划.md](./执行计划.md)、[HANDOFF.md](./HANDOFF.md)。

## 当前事实（截至 2026-06-16）

- **Claude / 全量记忆**：[Claude共享记忆-总索引.md](./Claude共享记忆-总索引.md) · 根 [CLAUDE.md](../CLAUDE.md)
- **地址/名称**：[产品路径一览.md](./产品路径一览.md)
- **运行环境 / 真机 / 重启**：[运行环境与真机调试-重启备忘.md](./运行环境与真机调试-重启备忘.md)
- **本地启动** | `npm run build && npm run dev:codegen:3001` → **3001** + Inngest **8288** · `INNGEST_DEV=1`
- **跨平台**：工厂 Mac/Win 浏览器；生成 App → Flutter 桌面 + 鸿蒙 + 小程序
- **生产**：https://app-factory-five.vercel.app
- **Git** | 本地 **ahead 1+**（记忆 doc `8846d06` 待 push）
- **WIP** | 安全合规 Agent（9 Agent）· build ❌ · 见 [收工记录-20260616](./收工记录-20260616-今日收工.md)
- **枪战**：`0ea7a53c-a645-4ad9-a43a-02263f9b7b4a`
- **目录**：`cd "/Users/guiming/Desktop/app生产工厂/app-factory"`

## 明日优先

1. `git push`（代理 7897）  
2. 安全合规 WIP → migration · build · verify  
3. 微信 Console 红错 / 发行 R1（可选）

## 入口

| 用途 | URL / 命令 |
|------|------------|
| **生产 Web** | https://app-factory-five.vercel.app |
| 本地 Web | http://localhost:3001 |
| 门禁 | `verify:i0:batch` · `npm run build` |
| 部署 | `deploy:vercel:env` · `deploy:vercel` |

## 必读

- [收工记录-20260616-今日收工.md](./收工记录-20260616-今日收工.md)
- [HANDOFF.md](./HANDOFF.md) · [验收大纲-自动与必做.md](./验收大纲-自动与必做.md)
