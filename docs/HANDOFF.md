# HANDOFF — App 生产工厂接力单

> **最后更新**：2026-06-25（18 个月路线图全线贯通 — 896 tests · 101+104 门禁）  
> **今日收工**：[战略路线图-2026-Q2至2027.md](./战略路线图-2026-Q2至2027.md) · [模板能力矩阵.md](./模板能力矩阵.md)  
> **配套**：[ONE_PAGER.md](./ONE_PAGER.md) · [产品路径一览.md](./产品路径一览.md) · [Claude共享记忆-总索引.md](./Claude共享记忆-总索引.md)

## 当前进度（勾选）

- [x] MVP v1 / v1.1 功能与文档基线
- [x] MVP v1.2 代码侧：Inngest 异步 + 文档（README、`INNGEST_DEV`、收工备忘）
- [x] 路线图：小程序必选；里程碑 MVP v2 / v2a / v2b + 虚拟汇总行
- [x] TCM 连续性资产：`.cursor/rules/tcm-continuity.mdc`、本 HANDOFF、`CONTINUOUS_DELIVERY_OUTLINE`、`SESSION_START_TEMPLATE`、`ONE_PAGER`
- [x] **验收 A**：真机双进程 + 完整生成 + 产品/库侧确认（见 [验收记录.md](./验收记录.md)；样本项目见下）
- [x] `feature/v1.2-inngest` 合并 `main`（2026-05-19；见 [合并main-议事记录.md](./合并main-议事记录.md)）
- [x] MVP v1.3 可观测与成本（`usage_logs` 8/8；样本 `833ad678-f204-40d7-a47c-5b76e803f64f`；检验 `npm run verify:v13`）
- [x] **v2a 实现-3**：Generator PoC（`codegen:flutter` / `export-flutter` / G6）
- [x] **v2b 实现-1**：`templates/wechat-miniprogram-minimal`（`npm run verify:wechat` / G7）
- [x] **v2b 实现-2**：小程序 Generator PoC（`codegen:wechat` / `export-wechat` / G8）
- [x] **MVP v2（虚拟汇总）**：G6 + G8 双轨终端验收（2026-05-20，见 [验收记录.md](./验收记录.md) §十一）
- [x] **v2a 增强 PoC**：报告→Spec（[v2a-增强-报告到Spec.md](./v2a-增强-报告到Spec.md)）
- [x] **v2.1 沙箱 PoC**：`npm run sandbox:flutter`（[v2.1-沙箱-PoC.md](./v2.1-沙箱-PoC.md)）
- [x] **v2.1 Docker 沙箱**：`npm run sandbox:flutter:docker`（[v2.1-沙箱-Docker.md](./v2.1-沙箱-Docker.md)）
- [x] **Inngest codegen**：`codegen_runs` + 事件 + API（[v2-Inngest-codegen.md](./v2-Inngest-codegen.md)）
- [x] **v2.1 自动修错 Agent**：analyze 失败 LLM patch 循环（`lib/codegen/auto-fix-flutter.ts`）
- [x] **LLM→Spec 收紧**：外置 prompt + AJV 错误格式化（`lib/app-spec/prompts/report-to-spec.ts`）
- [x] **v3 部署预览 PoC**：`/deploy` + `/api/deploy/status` + codegen HTML 预览
- [x] **v3 真上云（Vercel）**：https://app-factory-five.vercel.app
- [x] **v4 Auth + RLS**：v4-1～v4-6 ✅（[v4-Auth-RLS-设计草案.md](./v4-Auth-RLS-设计草案.md)）
- [x] **v5.1 记忆与 Skills**：V5-6～V5-9 ✅（多 Agent 记忆 · 记忆 UI · Skills 管理 · 技能注入可观测）
- [x] **C1 Report→Spec 收紧**：prompt + normalize · `verify:c1:report-to-spec`
- [x] **C3 小程序真编译**：wcc/wcsc · `verify:c3:wechat-compile`
- [x] **C5 App Spec 阶段 C**：wechatMiniProgram + BackendTarget · `verify:c5:app-spec`
- [x] **C4 GitHub OAuth + push**：连接 GitHub · codegen 产物推私有仓库 · `verify:c4:github` · 环境 `check:c4:github`
- [x] **S6 发版全链路脚本**：`verify:s6:release` · Auth Cookie · 本地 `verify:s6:local-full`（需 Inngest）
- [x] **维护者验收闭环**：10/10 done（`maintainer:pending` → 0）
- [x] **C6 鸿蒙** · **D1 队列** · **D2 质量** · **D3 发版+三栈 GitHub**（2026-05-28）
- [x] **P0 生产验收**（维护者）：三栈生成/下载/推 GitHub · 鸿蒙待办 `Index.ets` ✅（2026-05-28）
- [x] **P0 修复**：adm-zip · 鸿蒙同步 codegen · 下载缓存 · `emit-todo`（部署 `dpl_GPRQo24…`）
- [x] **T1 小程序待办 E2**：微信开发者工具模拟器 · 添加/勾选/删除 ✅（2026-05-30）
- [x] **S6 维护者验收**：P0 + 三栈 GitHub + 真机/模拟器 ✅（2026-05-30）
- [x] **批次 H2**：三栈 Codegen 同步（含 Flutter）· 探针通过
- [x] **批次 H3**：待办持久化三栈 · `verify:g3:persistence`
- [x] **批次 H4 本地**：`valid-shooter-minimal` · `verify:h4:shooter`
- [x] **git push** main（维护者 2026-05-30）
- [x] **批次 I0**：`verify:i0:batch`
- [x] **批次 I1**：`verify:i1:flutter` + dart-emit import 修复
- [x] **批次 I2 / 枪战 8/8 本地**：`4fec0ec1-bcd3-4fa9-8386-e930ad3e9c09` · `trigger:shooter:8-8` · `verify:i2:shooter`
- [x] **生产枪战 8/8 + J4**：`0ea7a53c-a645-4ad9-a43a-02263f9b7b4a` · `verify:i2:shooter` ✅
- [x] **批次 J 部署**：`dpl_Hj7S2SBGQ8jP6jR544SCr4XMAa7v`
- [x] **批次 K1**：`git push` `c8006cb`（I/J/K 合入 main）
- [x] **批次 K2**：鸿蒙实体列表 Supabase REST · `verify:g2` 增强
- [x] **维护者本地 S6**：`verify:s6:local-full` ✅（2026-05-31 · `faa13b44-…`）
- [x] **批次 K3 / M 生产 HTTP**：`verify:v3:production:quick` ✅（`V3_HTTP_PROXY` · 7897）
- [x] **K+部署**：`dpl_JBiWLbLoaofPqx3hGHacude43bii`（含 K2 鸿蒙 REST codegen）
- [x] **批次 L0**：`verify:i0:batch`（2026-05-31）
- [x] **批次 L1**：鸿蒙 codegen 注入 `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY` · `85652e2`
- [x] **L+部署**：`dpl_7DvhbvZtTGCBxqWwSCSLHZjCwsY2`
- [x] **L2 本地**：`verify:s6:local-full` ✅
- [x] **L2 生产**：curl `ready:true` + 浏览器 8/8 三栈 ✅（维护者）
- [x] **git push**：`85652e2` + 收尾 `7e0385c` on `main`
- [x] **收尾脚本**：`git:push` · `verify:v3:production:quick` + `preload-fetch-proxy`（`.env.local` 设 `V3_HTTP_PROXY`，勿提交）
- [x] **M 鸿蒙真源**：生产下载 ZIP 含 Supabase 注入（维护者 2026-06-01）
- [x] **批次 N**：排队 stale 90s · 鸿蒙 `maxDuration=300` · fallback 文案 · `dpl_5Wou91AcnngP6ioU4DDNzD6rxW2c`
- [x] **P1 生产同步**：`verify:p1:production:sync` ✅（枪战 harmony ~12.7s）
- [x] **批次 O**：三栈 `verify:p1:production:sync:all` · 鸿蒙 `EntityDetail` · `dpl_9cKbfQNeZTZyXJdxxoxYYgnJwvKc`
- [x] **批次 P**：Flutter `macos`/`windows` 模板 · Spec 默认四平台 · 鸿蒙默认 `enabled: true` · `verify:p:desktop:flutter` · `dpl_5rh8QCD6XCp9S1aVrTp2DtFTg31W`
- [x] **批次 Q+R**：`verify:qr:batch` · 生产 P1 三栈 · 枪战 ZIP 探针 · 小程序编译重试 · stale 创建前清理 · `dpl_CpBXN3wC4AFbTFpKMJfQc7RaSYwd`
- [x] **批次 S**：Codegen 同步文案 · 失败建议/展开日志 · 复制下载链 · `verify:s:ux` · `dpl_2Pubz7g33kf8RsPRcfH2pLctFGvK`
- [x] **批次 T+**：Flutter 桌面 GHA · Mac/Win · 维护者 Mac 待办 ✅ · `verify:t:desktop:build`
- [x] **2026-06-05 收工**：Win 工厂链 + Mac GitHub 链 · 微信 `simple_todo-wechat` 模拟器 ✅ · 战略「工厂不上架/成品上架」→ [全量收工](./收工记录-20260605-今日收工-全量.md)
- [x] **2026-06-16 收工**：Claude/路径/环境 **共享记忆落盘**（commit `8846d06`）· 开工/端口 Q&A → [今日收工](./收工记录-20260616-今日收工.md)
- [x] **安全合规 Agent**：9 Agent 链 · Spec 合规 emit · SpecVersionPanel · migration · build ✅ · push `664ccc2`（2026-06-16）
- [x] **R1 发行层（代码）**：GHA 条件签名 · `/privacy` `/terms` · 生成 App 隐私 API/模板 · [R1-发行路线图](./R1-发行路线图.md)（2026-06-17）
- [x] **v6 安全底座**：Auth/RLS/限流/鉴权 全量合入 · middleware 加固（2026-06-22）
- [x] **v6 行业真模板**：19 行业四层模板 + detectIndustry + copyIndustryTemplate（2026-06-22）
- [x] **v6 端到端验证**：`verify:industry:templates` 104/104 · `verify:industry:e2e` 19×3 三栈 ✅（2026-06-25）
- [x] **三栈 Parity P0**：矩阵 v4 + parity 门禁 v3 动态 19×3 ✅
- [x] **三栈 Parity P1**：Flutter detail/form 行业路由 ✅
- [x] **三栈 Parity P2**：微信 game/payment + detail/form industry service ✅
- [x] **三栈 Parity P3**：鸿蒙 19 service + game/payment service 调用 ✅
- [x] **三栈 Parity P4**：`verify:industry:e2e` 扩展为三栈 19×3 ✅
- [x] **三栈 Parity P5**：HANDOFF + 能力矩阵同步 ✅
- [x] **Q2-M1**：Mustache 渲染引擎 + 20 行业 Widget 模板（~180KB Dart）✅
- [x] **Q2-M2**：detectIndustry 190/190 (100%) + 支付状态机 + Stripe/微信 Webhook ✅
- [x] **Q2-M3**：三平台推送通知 (FCM + 微信订阅 + 华为PushKit) + 离线优先同步 ✅
- [x] **Q3-M4**：Spec 自动诊断修复 Agent ✅
- [x] **Q3-M5**：OWASP 安全审计 + 隐私合规 + 输入消毒 + 限流 ✅
- [x] **Q3-M6**：三平台性能门禁 (dart analyze + 包体积 + 模块数) ✅
- [x] **Q4-M1**：组件市场 v1 (注册表 + CRUD API + 全文搜索) ✅
- [x] **Q4-M2**：三端分析 SDK + 事件 API + Dashboard ✅
- [x] **Q4-M3/4**：商店发布 GHA + A/B 测试框架 + 发布流水线 ✅
- [x] **Q5-M1**：团队协作 SaaS (Workspace + RBAC + 实时协同 + 冲突检测) ✅
- [x] **Q5-M2**：版本管理 (Spec 历史 + 产物版本 + JSON Diff + 回滚) ✅
- [x] **Q6-M1**：Stripe 订阅计费 (Free/Pro/Enterprise + 用量追踪 + Customer Portal) ✅
- [x] **Q6-M2**：企业功能 (SSO + 白标 + 合作伙伴 + SLA 追踪) ✅
- [x] **P0-B-1**：鸿蒙 19 行业差异化服务（84→400+ 行，对齐微信 302 行）✅
- [x] **P1**：Widget dart analyze 门禁 + 微信 wcc 行业抽样 ✅
- [x] **P2-D**：测试补强 (896 tests · 27 files) ✅
- [x] **P3-G**：文档站 (14 页 VitePress) + 战略路线图 ✅
- [x] **管理后台**：7 页 Admin UI (概览/工作区/组件/伙伴/SLA/计费) ✅
- [x] **Onboarding**：5 步向导 + Landing Page + Auth 页面 ✅
- [x] **i18n**：10 locales × 三平台 (422 keys/语言) ✅
- [x] **a11y**：20 Widget Semantics 标签 + 三端 Accessibility ✅
- [x] **错误监控**：Flutter/微信/鸿蒙 CrashReporter ✅
- [x] **E2E 测试**：373 tests (pipeline/template/API/payment/security) ✅
- [ ] **P3-F**：签名/迁移/生产（依赖维护者：Apple Dev + Google Play + 微信商户号 + Stripe Key）

## 跨平台策略（批次 P · 维护者必读）

> 详表：[跨平台运行说明.md](./跨平台运行说明.md)

| 对象 | Mac 笔记本 / iMac | Windows | 鸿蒙手机/平板 |
|------|-------------------|---------|---------------|
| **App 生产工厂（Web）** | ✅ 浏览器 + 本地双进程 | ✅ 同上 | —（用浏览器即可） |
| **生成 · Flutter ZIP** | ✅ `flutter run -d macos` | ✅ `flutter run -d windows` | —（用鸿蒙栈） |
| **生成 · 鸿蒙 ZIP** | DevEco 开发 | DevEco 开发 | ✅ **装到鸿蒙系统 Run** |
| **生成 · 小程序** | 微信 Mac 版 | 微信 PC 版 | 微信鸿蒙版（视机型） |

**原则（控制任务量，不膨胀）**

1. **默认全开**：新 Spec / Report→Spec → `flutter.platforms` 含 `ios,android,macos,windows`；`harmony.enabled: true`。  
2. **自动化兜底**：发版前 Agent 跑 `verify:p:desktop:flutter` + `verify:c6:harmony` +（可选）`verify:p1:production:sync:all`。  
3. **人工验收从宽**：**不强制**全员真机 E1–E5；DevEco / 桌面 Flutter **可选**；以脚本 + 生产抽样为准。  
4. **老项目**：旧 Spec/ZIP 行为不变；重要项目 **重新生成** Flutter/鸿蒙 ZIP 即获新平台目录。  
5. **对外表述**：工厂在 Mac/Win 可用；生成 App 可在 Mac/Win **桌面（Flutter）** 与 **鸿蒙系统（鸿蒙 ZIP）** 运行——鸿蒙 ZIP **不能**在 Windows/Mac 上当普通 exe 双击。

**一键复验**

```bash
npm run verify:qr:batch                  # Q 门禁（含可选生产，需 V3_HTTP_PROXY）
npm run verify:p:desktop:flutter
npm run verify:c6:harmony
npm run stats:codegen -- 7
npm run verify:p1:production:sync:all   # 需 V3_HTTP_PROXY / 7897
```

## 验收 A 样本项目（2026-05-19，勿贴密钥）

| 项目 | `projects.id` | 结果 |
|------|---------------|------|
| 海洋生态切西瓜小游戏 | `58266242-359b-4ae0-a726-fb34929b38a4` | ✅ completed，8/8 |
| 踢足球小游戏 | `c4dc7d7a-7b33-42d8-af8f-09f5350c4de2` | ✅ completed，8/8 |

**本地联调约定（本机）**：因 **3000 被其他 App 占用**，工厂使用 **`http://localhost:3001`**；终端 A：`npm run start -- -p 3001`（或 build 后 start）；终端 B：`npm run inngest:dev:3001`。

## 验收执行（章程）

- **维护者少动手**：自点网页验收费时间、易错；**默认 Agent** 按 **命令组 G0～G5** 成组执行（见 [命令组-联调与验收.md](./命令组-联调与验收.md)）。
- **您可说**：「跑 G2」「G3+G4 验收」— 不必逐条敲命令。
- **您只做**：[维护者最小参与清单.md](./维护者最小参与清单.md)（.env 密钥、首次 SQL、可选看 UI）。

## 待办列表（执行顺序建议）

1. ~~详情页 codegen 按钮~~ ✅ · ~~Storage~~ ✅
2. ~~v2.1 自动修错~~ ✅ · ~~小程序 CLI 构建~~ ✅
3. ~~LLM 报告→Spec~~ ✅ · ~~v3 预览 PoC~~ ✅
4. ~~**v3 真上云**~~ ✅ · 尾项见 [收工记录-20260526-v3收工.md](./收工记录-20260526-v3收工.md)
6. **v5 记忆与技能**：v5-1～v5-5 ✅（[v5-记忆与技能-设计草案.md](./v5-记忆与技能-设计草案.md)）
7. **M1/M2** ✅ Vercel Auth + v4/v5 迁移已应用
8. **E 本地全链路** ✅ 8/8 · `verify:v13` · `accept`（样本 `833ad678…`）
9. **记忆约束实测** ✅ 生产/本地 CEO·PRD 均体现「第一版不做联网对战」
10. **三阶段路线** ✅ ① 加固 · ② v5.1 · ③ C1–C5 · **A+C 收工**（2026-05-27）
11. **C4 推 GitHub**：代码 ✅ · OAuth/PAT 凭证待配 → [收工记录-20260527-A+C-GitHub-Codegen.md](./收工记录-20260527-A+C-GitHub-Codegen.md)

## 明日维护者待办（真源）

**维护者必做**：**0**（`npm run maintainer:pending`）

**Agent / 开发优先**

1. **Supabase migration**：`sql/migrations/20260616_security_compliance_agent.sql`  
2. **Vercel redeploy**：上线 `/privacy` · `/terms` · R1 workflow  
3. **配 GitHub Secrets**（可选）：Apple / Windows 签名 → 跑 GHA 验证  
4. 8 个未跟踪 `.cursor/rules/project-*.mdc` — 入库或废弃  

**可选**

5. 微信 Console 红错 · 正式 AppID 提审 · Inngest Cloud · PAT workflow scope  
6. `npm run stats:codegen -- 7`

```bash
npm run maintainer:pending
npm run verify:p:desktop:flutter
```

## 阻塞 / 风险（简）

- **Supabase 双项目**：工厂只用 **`dllaezdyxmoebkkwbftd`**；`codegen_runs` 已就绪（2026-05-25）。
- **Inngest 未开** → `fetch failed`；须 **终端 B** `inngest:dev:3001`。
- **异步 codegen 轮询**：Next 忙时 HTTP 可能超时 → `npm run poll:codegen -- <runId>`。
- **详情页缓存**（已修）：生产模式曾缓存旧 `pending`；已对项目页/API 加 `force-dynamic`（见 2026-05-19 提交）。
- 联调：`PUT /api/inngest` 500 时查 **`INNGEST_DEV=1`**。

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-06-25 | **三栈 Parity P0-P5 收官**：微信 detail/form industry service · 鸿蒙 game/payment service · e2e 19×3 · parity v3 170+ 项 |
| 2026-06-25 | **18 个月路线图全线贯通**：896 tests · 101+104 门禁 · P0-B-1 鸿蒙差异化 · P1 Widget/wcc 门禁 · P2-D 测试补强 · P3-G 文档收工 |
| 2026-06-17 | **R1 发行层**：GHA 条件签名 · 隐私/条款页 · 生成 App 隐私 · [收工记录-20260617](./收工记录-20260617-今日收工.md) |
| 2026-06-16 | **今日收工**：记忆共享 · 安全合规 Agent · push `664ccc2` → [收工记录-20260616](./收工记录-20260616-今日收工.md) |
| 2026-06-05 | **Claude 总索引**：[Claude共享记忆-总索引.md](./Claude共享记忆-总索引.md) + 根目录 [CLAUDE.md](../CLAUDE.md) |
| 2026-06-05 | **运行环境 + 真机 + 重启备忘**：[运行环境与真机调试-重启备忘.md](./运行环境与真机调试-重启备忘.md) |
| 2026-06-05 | **产品路径共享记忆**： [产品路径一览.md](./产品路径一览.md) + `.cursor/rules/product-paths-memory.mdc`（AI 跨会话） |
| 2026-06-05 | **今日收工全量**：任务/环境/三端实跑 · 战略备忘 · 微信 Console 待查 → [收工记录-20260605-今日收工-全量.md](./收工记录-20260605-今日收工-全量.md) |
| 2026-05-31 | **批次 T+**：GHA `flutter-desktop-dual-build` · 刷新同步桌面包 · Mac GitHub / Win 直链 · 待办 MVP Mac 运行 ✅ |
| 2026-06-02 | **批次 S**：Codegen UX（失败建议、日志展开、复制链、同步进度）· `verify:s:ux` · `dpl_2Pubz7g33kf8RsPRcfH2pLctFGvK` |
| 2026-06-02 | **批次 Q+R**：生产 P1 + ZIP 探针 · 稳定 1.0（重试/清理/stats REST）· `verify:qr:batch` · `dpl_CpBXN3wC4AFbTFpKMJfQc7RaSYwd` |
| 2026-06-02 | **批次 P**：Flutter 桌面 `macos/windows` · 鸿蒙 Spec 默认开启 · [跨平台运行说明](./跨平台运行说明.md) · `dpl_5rh8QCD6XCp9S1aVrTp2DtFTg31W` |
| 2026-06-02 | **批次 O**：三栈 P1 · 鸿蒙 EntityDetail · `dpl_9cKbfQNeZTZyXJdxxoxYYgnJwvKc` |
| 2026-05-28 | **P0 验收通过**；adm-zip、鸿蒙同步+待办 emit、下载缓存；生产 `dpl_GPRQo24…` |
| 2026-05-22 | **C3** 小程序 WXML/WXSS 真编译 · **C1** Report→Spec · V5-8/V5-9 · S1 文档同步 |
| 2026-05-19 | **三阶段路线** 启动：S5 codegen 清理 · **v5-6** 多 Agent 记忆 · C1 Spec 收紧 |
| 2026-05-19 | **G5 收工**：`npm run build` + `accept` ✅；**E 本地全链路** 8/8；记忆约束生产/本地实测 ✅ |
| 2026-05-27 | **v5-4/v5-5** skill_ids prompt 注入 + 详情页记忆 UI ✅ |
| 2026-05-27 | **v5-3** `GET /api/skills` + seed + `verify:v5:skills` ✅；M1/M2 ✅ |
| 2026-05-27 | **v5-2** CEO 工作流记忆注入 ✅；**M1** Vercel 生产 Redeploy ✅ |
| 2026-05-26 | **v4-1 Auth UI + v4-2 owner_id**（本地 build ✅，未 push）；[收工记录-20260526-v4-auth.md](./收工记录-20260526-v4-auth.md) |
| 2026-05-26 | **v3 收工 + v4 设计草案**；ONE_PAGER 同步 |
| 2026-05-25 | **v3 Vercel 生产部署** https://app-factory-five.vercel.app · APP_URL 已回填 |
| 2026-05-19 | **v2.1 auto-fix + Spec prompt + v3 preview**：`auto-fix-flutter`、报告→Spec prompt 外置、`/deploy` 与 HTML 预览 |
| 2026-05-25 | **G10 + P2 异步 codegen + G9-Docker** 验收通过；[收工记录-20260525.md](./收工记录-20260525.md) |
| 2026-05-22 | **收工记录**：双 Supabase 项目澄清；P0 仍为 dllaezdyxmoebkkwbftd 迁移；增 `check:codegen:table` / `db:apply:codegen` |
| 2026-05-20 | **v2.1 Docker 沙箱 + Inngest codegen**（`codegen_runs`、flutter/wechat 事件与 API） |
| 2026-05-20 | **v2a 增强 + v2.1 沙箱 PoC + 执行计划/ONE_PAGER 同步** |
| 2026-05-20 | **章程**：测试验收 Agent 先跑、测前告知（`agent-testing-minimal-human.mdc`、纲要 §二点七） |
| 2026-05-20 | **MVP v2 虚拟汇总验收通过**；代码已推 `guiming-rgb/app-factory` |
| 2026-05-20 | **v2b 实现-2**：小程序 Generator + `export-wechat` + G8（见 [v2b-实现-2-小程序Generator-PoC.md](./v2b-实现-2-小程序Generator-PoC.md)） |
| 2026-05-20 | **v2b 实现-1**：`templates/wechat-miniprogram-minimal` + `verify:wechat` / G7 |
| 2026-05-20 | **v2a 实现-3**：Generator PoC + `export-flutter` API + `npm run codegen:flutter` / `verify:codegen`（见 [v2a-实现-3-Generator-PoC.md](./v2a-实现-3-Generator-PoC.md)） |
| 2026-05-20 | **v2a 实现-1/2**：`templates/flutter-minimal` + `npm run validate:spec`；**v2b 线 B 调研** |
| 2026-05-20 | **v2a 线 A 调研完成**（App Spec Schema 草案 + Flutter 目录结构 + 能力矩阵） |
| 2026-05-20 | **章程**：命令组 G0～G5 批量执行（开发纲要 §二点六、[命令组-联调与验收.md](./命令组-联调与验收.md)） |
| 2026-05-20 | **章程**：验收执行 Agent 终端优先（开发纲要 §二点五、TCM §0、Cursor 规则 §五） |
| 2026-05-20 | **验收 B（v1.3）通过**；排查记录见 [验收B-v1.3-问题与结论记录.md](./验收B-v1.3-问题与结论记录.md)；检验 `npm run verify:v13` |
| 2026-05-19 | **`feature/v1.2-inngest` 合并 `main`**（fast-forward）；`mvp-v1.2` 标签；议事记录落盘 |
| 2026-05-19 | **验收 A 通过**；HANDOFF/验收记录/执行计划/TCM 大纲/简报同步；样本：海洋生态 + 踢足球 |
| 2026-05-14 | 初版 HANDOFF；与 TCM 大纲同日建立 |
