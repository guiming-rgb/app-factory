# App 生产工厂 — 一页简报（约 1 分钟）

> **用途**：开工第一眼；细节见 [执行计划.md](./执行计划.md)、[HANDOFF.md](./HANDOFF.md)。

## 当前事实（截至 2026-06-02 批次 S）

- **跨平台**：工厂 Mac/Win 浏览器；生成 App → Flutter 桌面 + 鸿蒙系统 + 小程序（见 [跨平台运行说明.md](./跨平台运行说明.md)）
- **生产**：https://app-factory-five.vercel.app · `dpl_2Pubz7g33kf8RsPRcfH2pLctFGvK`
- **门禁**：`verify:qr:batch` · `verify:s:ux` · `verify:p1:production:sync:all`
- **策略**：自动化兜底；真机 E1–E5 / DevEco **可选**（HANDOFF §跨平台策略）
- **枪战**：`0ea7a53c-a645-4ad9-a43a-02263f9b7b4a`
- **目录**：`cd "/Users/guiming/Desktop/app生产工厂/app-factory"`

## 可选下一批

- 观察部署后 7 天 `stats:codegen`（harmony 目标 >70%）· DevEco E4 · 体验 E1–E5

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
- [HANDOFF.md](./HANDOFF.md) · [收工记录-20260602-批次S-UX.md](./收工记录-20260602-批次S-UX.md)
