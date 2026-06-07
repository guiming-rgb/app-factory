# Claude 共享记忆 — 总索引

> **用途**：把本仓库内 **所有 AI 记忆、Cursor 规则、重要资料** 一次性交给 Claude（Projects / 上传 / Git 克隆均可）。  
> **维护者**：事实变更时先改对应专题文档，再在本文件 **§二** 核对链接是否仍有效。  
> **最后更新**：2026-06-05

---

## 一、怎么交给 Claude（三选一）

### 方式 A — Claude Project（推荐）

1. 新建 Claude Project，名称如 **App 生产工厂**。  
2. **Project Instructions** 粘贴下方 **§五「开场 System 摘要」**。  
3. **Project Knowledge** 上传或同步以下 **Tier-1 必读**（§三）+ 四个 Cursor 规则文件（§二）。  
4. 需要深查时再 @ 引用 Tier-2/3 文档或整个 `docs/` 目录。

### 方式 B — 每条新对话粘贴

复制 **§五「用户第一条消息模板」** 到 Claude 对话框；必要时附件上传 `docs/运行环境与真机调试-重启备忘.md`。

### 方式 C — Git 仓库

```text
仓库：https://github.com/guiming-rgb/app-factory
本地：/Users/guiming/Desktop/app生产工厂/app-factory
```

让 Claude 先读 **§三 Tier-1**，再按任务读 §四分类索引。**勿**把 `.env.local` 交给 Claude（含密钥）。

---

## 二、Cursor 规则（= Agent 行为章程，Claude 应同等遵守）

路径均相对于仓库根 `app-factory/`。

| 文件 | alwaysApply | 作用 |
|------|-------------|------|
| [.cursor/rules/product-paths-memory.mdc](../.cursor/rules/product-paths-memory.mdc) | **是** | 路径、URL、运行环境、待办三栈、重启 30 秒 |
| [.cursor/rules/maintainer-daily-reminder.mdc](../.cursor/rules/maintainer-daily-reminder.mdc) | **是** | 维护者 mustHuman 清单；`maintainer:pending` / `maintainer:done` |
| [.cursor/rules/agent-testing-minimal-human.mdc](../.cursor/rules/agent-testing-minimal-human.mdc) | **是** | **Agent 先测**；禁止把可脚本验收的事甩给维护者 |
| [.cursor/rules/tcm-continuity.mdc](../.cursor/rules/tcm-continuity.mdc) | 否（docs 域） | TCM 接力：开工/收工顺序、命令组 G0～G5、HANDOFF 更新 |

**Claude 协作原则（摘自上述规则）**

- 真相源 = **Git + 仓库文档**，不假设聊天上下文跨会话仍成立。  
- 能跑 `npm run verify:*` / `accept` / `build` 的，**Claude 先说明将执行的命令**，再向用户索取 Agent 做不了的一次性项（PAT、`.env` 密钥）。  
- 涉及支付、敏感数据、上线：**先读** [安全审计与清单.md](./安全审计与清单.md) + [开发纲要.md](./开发纲要.md)。

---

## 三、Tier-1 必读（Claude 开工 5 分钟）

按顺序阅读：

| # | 文档 | 内容 |
|---|------|------|
| 1 | [ONE_PAGER.md](./ONE_PAGER.md) | 1 分钟事实：生产 URL、门禁、枪战 ID |
| 2 | [产品路径一览.md](./产品路径一览.md) | 全 URL、工程名、下载链、GHA |
| 3 | [运行环境与真机调试-重启备忘.md](./运行环境与真机调试-重启备忘.md) | 本地/生产环境、E1–E5、重启恢复、战略 |
| 4 | [HANDOFF.md](./HANDOFF.md) | 进度勾选、样本 projectId、待办、风险 |
| 5 | [CONTINUOUS_DELIVERY_OUTLINE.md](./CONTINUOUS_DELIVERY_OUTLINE.md) | §2 本批并行线 · §3 最近收工 |
| 6 | [SESSION_START_TEMPLATE.md](./SESSION_START_TEMPLATE.md) | 新会话标准开场 |

---

## 四、重要资料分类索引

### 4.1 产品与战略

| 文档 | 说明 |
|------|------|
| [开发纲要.md](./开发纲要.md) | 产品定位、模型策略（DeepSeek 优先）、MVP 验收闭环 |
| [多平台App生产工厂路线图.md](./多平台App生产工厂路线图.md) | 长远 IR → 三栈 + 小程序 |
| [执行计划.md](./执行计划.md) | 里程碑总表 |
| [收工记录-20260605-今日收工-全量.md](./收工记录-20260605-今日收工-全量.md) | **最新**任务/环境/战略/限制 |
| [项目功能与架构交接.md](./项目功能与架构交接.md) | 架构与表结构入口 |

**已定战略**

- **App 生产工厂**：不上架应用商店。  
- **工厂生产的每一款 App**：分阶段各平台上架（签名/提审/隐私 = 下一阶段 R1）。  
- 内测 ~78% · 商店上架 ~22%（2026-06-05 评估）。

### 4.2 跨平台与 Codegen

| 文档 | 说明 |
|------|------|
| [跨平台运行说明.md](./跨平台运行说明.md) | 工厂 + 生成 App 运行矩阵 |
| [桌面可双击发行包.md](./桌面可双击发行包.md) | GHA 桌面包、环境变量、用户用法 |
| [收工记录-20260531-批次T+-桌面GHA.md](./收工记录-20260531-批次T+-桌面GHA.md) | T+ GHA 链细节 |
| [模板能力矩阵.md](./模板能力矩阵.md) | 三栈模板能力边界 |
| [App-Spec-v0.1-草案.md](./App-Spec-v0.1-草案.md) | Spec IR |
| [v2-Inngest-codegen.md](./v2-Inngest-codegen.md) | 异步 codegen 事件/API |

**关键代码（非文档，Claude 改代码时读）**

| 模块 | 路径 |
|------|------|
| GHA 配置/触发 | `lib/github/desktop-gha-config.ts` · `lib/github/desktop-gha.ts` |
| GHA 编排/同步 | `lib/codegen/desktop-gha-orchestrator.ts` · `lib/codegen/sync-desktop-gha.ts` |
| Mac 下载 UX | `lib/codegen/mac-download.ts` |
| Inngest 轮询 | `lib/inngest/codegen-functions.ts` |
| Codegen UI | `components/CodegenPanel.tsx` |
| GHA Workflow | `.github/workflows/flutter-desktop-dual-build.yml` |

### 4.3 验收与维护者

| 文档 | 说明 |
|------|------|
| [验收大纲-自动与必做.md](./验收大纲-自动与必做.md) | Agent 已测 vs 维护者必做 · E1–E5 |
| [维护者-必须人工验收清单.md](./维护者-必须人工验收清单.md) | mustHuman 项说明 |
| [maintainer-pending-state.json](./maintainer-pending-state.json) | 待办状态 JSON（当前 10/10 done） |
| [维护者最小参与清单.md](./维护者最小参与清单.md) | 维护者最多 3 类工作 |
| [命令组-联调与验收.md](./命令组-联调与验收.md) | G0～G8 命令组 |
| [验收记录.md](./验收记录.md) | 历史验收结论 |

### 4.4 Auth / GitHub / 安全

| 文档 | 说明 |
|------|------|
| [v4-Auth-RLS-设计草案.md](./v4-Auth-RLS-设计草案.md) | Auth + RLS |
| [C4-GitHub-OAuth-Push.md](./C4-GitHub-OAuth-Push.md) | OAuth + PAT push |
| [安全审计与清单.md](./安全审计与清单.md) | 安全门禁 |
| [v3-部署指南.md](./v3-部署指南.md) | Vercel 部署 |

### 4.5 记忆与 Skills（v5）

| 文档 | 说明 |
|------|------|
| [v5-记忆与技能-设计草案.md](./v5-记忆与技能-设计草案.md) | 多 Agent 记忆、Skills |
| 代码 | `lib/agents/memory-bindings.ts` · `lib/agents.ts` |

### 4.6 收工记录（按时间，查历史用）

| 日期 | 文档 | 主题 |
|------|------|------|
| 2026-06-05 | [收工记录-20260605-今日收工-全量.md](./收工记录-20260605-今日收工-全量.md) | **最新全量** |
| 2026-05-31 | [收工记录-20260531-批次T+-桌面GHA.md](./收工记录-20260531-批次T+-桌面GHA.md) | 桌面 GHA |
| 2026-06-02 | [收工记录-20260602-批次S-UX.md](./收工记录-20260602-批次S-UX.md) | Codegen UX |
| 2026-06-02 | [收工记录-20260602-批次QR.md](./收工记录-20260602-批次QR.md) | Q+R 稳定 |
| 2026-06-02 | [收工记录-20260602-批次P-跨平台.md](./收工记录-20260602-批次P-跨平台.md) | 跨平台 P |
| 2026-05-28 | [收工记录-20260528-今日收工.md](./收工记录-20260528-今日收工.md) | P0 + 三栈 GitHub |
| 2026-05-27 | [收工记录-20260527-Codegen-S6-维护者清单.md](./收工记录-20260527-Codegen-S6-维护者清单.md) | S6 维护者 |

更全列表：`docs/收工记录-*.md`（81 篇 docs 中以 `收工记录` 前缀检索）。

---

## 五、复制给 Claude 的文本

### 5.1 Project Instructions（System 摘要）

```markdown
你是 App 生产工厂（app-factory）的协作 AI。仓库：https://github.com/guiming-rgb/app-factory

必读顺序：ONE_PAGER → 产品路径一览 → 运行环境与真机调试-重启备忘 → HANDOFF → CONTINUOUS_DELIVERY_OUTLINE §2–§3。

行为章程（与 Cursor 规则一致）：
1. 真相源 = Git + docs/，不臆测 URL/路径/环境。
2. 能终端/脚本验收的先说将跑哪些 npm run verify:* / accept / build，不把 Agent 可做的事甩给维护者。
3. 维护者只做：.env 密钥、首次 SQL、git push/PAT、可选 GUI（微信/DevEco）。
4. 工厂不上架；成品 App 分阶段各平台上架。

关键事实：
- 生产 https://app-factory-five.vercel.app · 本地 http://localhost:3001 · INNGEST_DEV=1
- Supabase 项目 dllaezdyxmoebkkwbftd（仅此）
- 代理探针 V3_HTTP_PROXY=http://127.0.0.1:7897 · git push 常用 https_proxy 同端口
- 待办：Flutter「我的小清单」app_factory_minimal.app · 微信「极简待办」simple_todo-wechat · 鸿蒙 simple_todo-harmony
- Mac 桌面包走 GHA Artifacts；Win 走工厂 ?kind=windows
- 详表：docs/Claude共享记忆-总索引.md
```

### 5.2 用户第一条消息模板

```markdown
你好。请按 docs/Claude共享记忆-总索引.md 的 Tier-1 读完再回答。

项目：App 生产工厂
本地：/Users/guiming/Desktop/app生产工厂/app-factory
本批任务：（在此填写）

不要改动：（在此填写，如勿提交 .env.local）
```

---

## 六、硬事实速查（免翻文档）

| 项 | 值 |
|----|-----|
| 生产 Web | https://app-factory-five.vercel.app |
| GitHub | https://github.com/guiming-rgb/app-factory |
| 本地工程 | `/Users/guiming/Desktop/app生产工厂/app-factory` |
| 本地 URL | http://localhost:3001 |
| 一键本地 | `npm run dev:codegen:3001` |
| Supabase 项目 | `dllaezdyxmoebkkwbftd` |
| 测试账号 | `e2e-local@app-factory.test` / `E2eLocalTest123!` |
| 生产枪战 ID | `0ea7a53c-a645-4ad9-a43a-02263f9b7b4a` |
| GHA Workflow | `flutter-desktop-dual-build.yml` · 成功参考 Run **#3** |
| 三栈 GitHub | local_todo-flutter · simple_todo-wechat · simple_todo-harmony |

---

## 七、禁止共享

| 文件 | 原因 |
|------|------|
| `.env.local` | API Key、PAT、Service Role |
| 任何含 `ghp_`、真实 Supabase service key 的截图 | 密钥泄露 |

`.env.local.example` 可共享（仅变量名，无真实值）。

---

## 八、与 Cursor 同步

| Cursor | Claude |
|--------|--------|
| `.cursor/rules/*.mdc` | Project Instructions + 上传同文件 |
| Tier-1 docs | Project Knowledge |
| 本总索引 | Claude 入口 bookmark |

更新记忆时：**改专题 doc → 改 HANDOFF 变更记录 → 必要时改 §六速查 → git commit**。
