# App 生产工厂 — 持续交付大纲（TCM）

> **用途**：跨会话「主计划」；与 [ONE_PAGER.md](./ONE_PAGER.md)（简报）、[HANDOFF.md](./HANDOFF.md)（接力勾选）、[执行计划.md](./执行计划.md)（里程碑总表）配套。  
> **Cursor 规则摘要**：`.cursor/rules/tcm-continuity.mdc`  
> **新会话开场模板**：[SESSION_START_TEMPLATE.md](./SESSION_START_TEMPLATE.md)

---

## §1 长远计划（阶段表 + 状态）

**真源表**（逐行状态以该文件为准）：[执行计划.md](./执行计划.md) 第四节「阶段总览表」。

| 摘要 | 状态 |
|------|------|
| MVP v1 / v1.1 | ✅ |
| 验收 A（真机 + Supabase + 产品清单） | ⏳ |
| MVP v1.2 异步 | ✅ 联调候选 |
| MVP v1.3 可观测 | 🔲 |
| MVP v2（虚拟汇总）= v2a + v2b（含小程序必选） | 🔲 |

---

## §2 下一批并行任务包

**批次名**：`Batch-2026-05-14-post-handoff`（验收 A 收口 + 文档接力）

**二线择一**：单人时 **E 与 F** 若同一次会话修同一 API 行为，**合并为一条线串行**；**D 与 G** 若都动 `sql/`，**串行或合并**。

**本批不要动（边界）**：未经单独评审 **不改** `sql/schema.sql` 表结构；不擅自改 **生产** Inngest / Supabase 密钥策略。

### §2.1 并行线 A～H

| 线 | 任务（可验收） | 典型文件域 | 依赖 / 互斥 |
|----|----------------|------------|-------------|
| **A** | **验收 A 打勾**：双进程跑通一次生成；`projects`=`completed`；`final_report` 非空；8×`agent_runs` 成功；导出/复制/历史/409 抽测 | `README` 流程、浏览器、`sql/` 只读核对 | 依赖本地 `.env`；与 **E** 同会话若 inngest 要改代码则先 A 再 E |
| **B** | 收工后更新 [执行计划.md](./执行计划.md) 第二节「上次进展」：日期、阶段状态、下一步 | `docs/执行计划.md` | 无 |
| **C** | 维护 [HANDOFF.md](./HANDOFF.md)：勾选、待办、最后更新日期 | `docs/HANDOFF.md` | 无 |
| **D** | 阅读 **App Spec** 与路线图，列出 v2a/v2b 开工前缺口清单（不写代码也可） | `docs/App-Spec-v0.1-草案.md`、`docs/多平台App生产工厂路线图.md` | 与 **G** 互斥若动 schema |
| **E** | Inngest 联调排错（仅当 A 失败）：`INNGEST_DEV`、`/api/inngest`、skipped 行为 | `lib/inngest/`、`lib/workflow.ts` | 与 **F** 注意同一 `generate` 路径时串行 |
| **F** | 前端：轮询/详情页与 `409`/`async` 展示抽测与微调 | `app/projects/`、`components/` | 与 **E** 可能同域 → 协调 |
| **G** | v1.3 预备：在 backlog 记 `usage_logs` 字段草案（不落库） | `docs/CONTINUOUS_DELIVERY_OUTLINE.md` §2 附录、`docs/` | 不动 `sql/schema.sql` |
| **H** | 对照 [安全审计与清单.md](./安全审计与清单.md) 做「若即将合并 main」前置勾选 | `docs/安全审计与清单.md` | 无 |

### §2.2 下一批预告（压缩）

- 合并 `feature/v1.2-inngest` → `main` 议事 + tag。  
- MVP v1.3：`usage_logs` 或等价。  
- MVP v2a 最小 Flutter 模板调研（单独批次）。

### §2.3 附录 — backlog 池（未排入本批）

- `docs/验收记录.md` 独立页（可选）。  
- Inngest 上云与 `INNGEST_SIGNING_KEY` 运维说明扩展。  
- GitHub OAuth + push（v2a 相关）。  
- 小程序模板仓库雏形（v2b）。

---

## §3 收工记录（时间倒序，最新在最上）

| 收工锚点 | 本批 / 本会话完成摘要 | 下一批并行包 |
|----------|----------------------|--------------|
| **2026-05-14** | **线—（文档批）**：落盘 TCM 连续性——新增 `.cursor/rules/tcm-continuity.mdc`、`docs/CONTINUOUS_DELIVERY_OUTLINE.md`（§1～§5）、`docs/SESSION_START_TEMPLATE.md`、`docs/HANDOFF.md`、`docs/ONE_PAGER.md`；修复 [执行计划.md](./执行计划.md) 缺失的「MVP v2.1～v3」小节标题 | 见本节上方 **§2 `Batch-2026-05-14-post-handoff`** |
| **2026-05-14（早前）** | 正式收工备忘已写入 [执行计划.md](./执行计划.md) §二：双进程命令、本地 URL、建项目→生成流程、Supabase 检疫 SQL | 同上 |

---

## §4 开工检查清单（复制勾选）

- [ ] 已读 [ONE_PAGER.md](./ONE_PAGER.md)
- [ ] 已读本文件 **§2 本批并行线** + **§3 最近一行收工**
- [ ] 已读 [HANDOFF.md](./HANDOFF.md) 待办与日期
- [ ] 已 `git pull` / 看过最近提交（可选）
- [ ] 本次认领并行线：______（字母或「整批除某线」）
- [ ] 涉及安全/上线：已打开 [安全审计与清单.md](./安全审计与清单.md)

---

## §5 收工检查清单（复制执行）

- [ ] 更新 [HANDOFF.md](./HANDOFF.md)：进度、待办、最后更新日期
- [ ] 更新 [ONE_PAGER.md](./ONE_PAGER.md)：事实与待办
- [ ] 更新 **本文件**：§3 **表格最上方新一行**；**重写 §2**；必要时改 §1
- [ ] `git commit`（信息含 `收工` 或 `chore(收工): …`）
- [ ] 重大决策：已单独文档并在 §3 给链接

---

## §6 §2 并行线空表（复制到其他仓库）

| 线 | 任务（可验收） | 典型文件域（减少冲突） | 依赖 / 互斥 |
|----|----------------|------------------------|-------------|
| A | … | … | 无 / 与 B 同改某文件则串行 |
| B | … | … | … |
| C | … | … | … |
| D | … | … | … |
| E | … | … | … |
| F | … | … | … |
| G | … | … | … |
| H | … | … | … |

**二线择一**：单人开发时，对会抢同一文件的线标顺序或合并成一条 PR。合并前各线跑本仓库约定门禁（lint / test / analyze）。
