# App 生产工厂 — 一页简报（约 1 分钟）

> **用途**：开工第一眼；细节见 [执行计划.md](./执行计划.md)、[HANDOFF.md](./HANDOFF.md)。

## 当前事实（截至 2026-05-30 收工）

- **产品**：Next + Supabase + Inngest，8 Agent；**v1.3** 用量 8/8 可脚本验收。
- **代码生成**：Flutter / 小程序 / 鸿蒙 **同步 ZIP**；待办 MVP + 实体列表 + 枪战样本均已探针覆盖。
- **门禁**：`npm run verify:i0:batch`（合并 H 探针）· `verify:i1:flutter`（dart analyze）。
- **枪战**：生产真源 `0ea7a53c-a645-4ad9-a43a-02263f9b7b4a` 已 8/8 + `verify:i2:shooter`。
- **生产部署**：https://app-factory-five.vercel.app · `dpl_Hj7S2SBGQ8jP6jR544SCr4XMAa7v`
- **本地**：http://localhost:3001 + `inngest:dev:3001`（3001 占用 = 已在跑，勿重复 start）

## 明日优先（批次 K）

1. **git commit + push** I/J 未提交改动
2. 鸿蒙非待办 **Supabase REST** · 生产 `verify:v3:production`（网络允许时）
3. 可选体验 E1–E5

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
