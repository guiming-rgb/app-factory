# App 生产工厂 — AI 协作规范

> Claude Code / Claude Project 在 **`app-factory/`** 目录下启动时**自动加载本文件**。  
> 严格遵守四大支柱，产出才能稳定对标高质量 Agent 会话。  
> **完整索引** → [docs/Claude共享记忆-总索引.md](docs/Claude共享记忆-总索引.md)

---

## 一、术语表（防幻觉）

| 术语 | 含义 | 文件 / 路径 |
|------|------|-------------|
| **App Spec IR** | 统一中间表示，驱动三栈 codegen | `lib/app-spec/` · [App-Spec-v0.1-草案.md](docs/App-Spec-v0.1-草案.md) |
| **三栈** | Flutter + 微信小程序 + 鸿蒙 ArkTS | `lib/flutter-codegen/` · `lib/wechat-codegen/` · `lib/harmony-codegen/` |
| **19 行业真模板** | models + services + pages + widgets 四层 | `templates/industry-*` |
| **detectIndustry** | 从 Spec/报告文本识别行业 | `lib/flutter-codegen/emit-industry.ts` |
| **industry parity** | 同一 Spec 三栈能力对齐（脚手架 ~90%） | `scripts/verify-industry-parity.mjs` |
| **BaseCodegenExecutor** | 三栈 codegen 编排抽象 | `lib/codegen/base-executor.ts` |
| **9 Agent 工作流** | CEO→…→商业顾问 串行方案生产 | `lib/workflow.ts` · `lib/agents.ts` |
| **codegen_runs** | 异步 codegen 状态表 | `lib/codegen/runs.ts` · Supabase |
| **GHA 桌面包** | Mac .app / Win 桌面构建 | `.github/workflows/flutter-desktop-dual-build.yml` |
| **R1 发行层** | 签名/公证/提审（非工厂本身上架） | [R1-发行路线图.md](docs/R1-发行路线图.md) |
| **工厂 vs 成品** | 工厂 Web 不上架；**生成的 App** 分阶段上架 | [产品路径一览.md](docs/产品路径一览.md) |
| **Supabase 真源** | 仅此项目 **`dllaezdyxmoebkkwbftd`** | `.env.local` · 勿用其他项目 |
| **本地端口** | 工厂 Web **`http://localhost:3001`**（非 3000） | `npm run dev:codegen:3001` |
| **INNGEST_DEV=1** | 本地 Inngest 必开，否则 `/api/inngest` 500 | 终端 B：`npm run inngest:dev:3001` |

**规则：不要编造上表中不存在的概念、URL、项目 ID。需要新概念时，先更新术语表或问维护者。**

---

## 二、架构红线（不可侵犯）

```
用户 → Next.js (app/) → lib/workflow | lib/codegen → 三栈 emit → ZIP/Storage
                              ↓
                         Supabase + Inngest + DeepSeek API（仅服务端）
```

| 红线 | 说明 |
|------|------|
| **Spec IR 先行** | 改生成逻辑前先理解 App Spec；勿绕过 `validateAppSpec` |
| **三栈独立 emit** | Flutter / 微信 / 鸿蒙 各走各自 `generate.ts`；共享逻辑放 `lib/app-spec/` 或 `base-executor` |
| **行业模板拷贝** | 行业页走 `copyIndustryTemplate` + `industry-page-ref`；勿 duplicate 整页字符串 |
| **密钥不进前端** | 无 `NEXT_PUBLIC_` 的 service role / OpenAI key / Inngest signing key |
| **LLM 仅服务端** | 浏览器不调 DeepSeek；走 `lib/llm.ts` |
| **勿 commit** | `.env.local` · `tmp/` · 含 `ghp_` 的文件 |
| **parity 门禁** | 禁止把 `verify-industry-parity` 从**动态 19×3 生成**退化为纯 `includes()` 静态 grep |
| **Inngest 双进程** | 测 codegen 异步链：3001 + `inngest:dev:3001` 同时运行 |

依赖方向（简化）：

```
app/ (UI)  →  lib/codegen  →  *-codegen/generate  →  templates/
     ❌ 禁止 UI 直接 import emit 字符串生成器写业务逻辑
     ❌ 禁止 wechat-codegen import React
```

---

## 三、代码规范（硬性）

| 规则 | 标准 |
|------|------|
| TypeScript | 严格模式；避免无注释的 `any` |
| 改动范围 | **最小 diff**；不顺手重构无关模块 |
| 命名 | codegen 输出与 `templates/` 现有风格一致 |
| 函数长度 | emit 函数过长时拆配置表 + 循环，勿堆 200 行字符串 |
| 测试 | 改 codegen / detectIndustry 必须跑 `npm test` + 相关 `verify:industry:*` |
| 文档 | 里程碑变更同步 `docs/HANDOFF.md` 变更记录 |
| commit message | 禁止「全线贯通/全部完成」除非 DoD 命令全绿 |

---

## 四、Skill / 场景触发规则（思维链注入）

以下场景**必须先读对应文档再写代码**：

| 触发条件 | 先读 / 先跑 | 原因 |
|----------|-------------|------|
| 改 Flutter/微信/鸿蒙 emit | [模板能力矩阵.md](docs/模板能力矩阵.md) | 能力边界 + complianceFlags |
| 改 industry / parity | [下一阶段-三栈parity-Claude接力.md](docs/下一阶段-三栈parity-Claude接力.md) | 避免重复劳动 |
| 改 Auth / RLS / middleware | [v4-Auth-RLS-设计草案.md](docs/v4-Auth-RLS-设计草案.md) | 安全回归 |
| 改支付 / Stripe | `app/api/stripe/` + 安全清单 | 计费事故 |
| 改 Inngest / codegen API | [v2-Inngest-codegen.md](docs/v2-Inngest-codegen.md) | 异步链复杂 |
| 宣称收工 / PR | `npm run build` + `npm test` + 本任务相关 `verify:*` | 门禁 |
| 生产相关 | [运行环境与真机调试-重启备忘.md](docs/运行环境与真机调试-重启备忘.md) | 代理/端口 |

---

## 五、Workflow 多 Agent 验证（关键变更必用）

| 场景 | 流程 |
|------|------|
| **A. 改三栈 codegen 核心** | 方案确认 → 实现 → 跑 `verify:industry:parity` + `verify:industry:e2e` → 第二人审查 diff |
| **B. 改 base-executor / Inngest** | 实现 → `npm test` + `verify:codegen:*` → 审查失败路径与类型 |
| **C. 大型重构（≥5 文件）** | 拆 Phase → 每 Phase 独立 commit + 独立门禁 |
| **D. 安全 / 支付 / RLS** | 实现 → 对抗性检查（越权、密钥泄露）→ [安全审计与清单.md](docs/安全审计与清单.md) |

**原则：一个人写的 codegen，必须跑脚本验收；不能把「请你本地点点看」甩给维护者。**

维护者**只做**：`.env` 密钥 · 首次 SQL · `git push`/PAT · 可选 GUI（微信/DevEco）。

---

## 六、常见反模式（禁止列表）

- ❌ commit `tmp/device-samples/` 或整棵 Flutter 工程样本
- ❌ parity 门禁只做静态 `includes()` 不做动态生成
- ❌ 微信 detail/form 绕过 `services/industry.js` 裸 `request()`
- ❌ 鸿蒙 game/payment 纯 UI 不调 `IndustryServices`
- ❌ `pageWidgetRef` 不传 `industry` 导致 generic 页覆盖行业模板
- ❌ 未跑 `npm run build` 就宣称完成
- ❌ 把可脚本验收的事交给维护者手测
- ❌ 使用错误的 Supabase 项目 ID
- ❌ 本地测 codegen 不开 `INNGEST_DEV=1`
- ❌ 向 AI 粘贴 `.env.local` 或 PAT

---

## 七、Memory 累积机制

Memory 文件分布在两处，互为补充：

| 位置 | 用途 | 同步方式 |
|------|------|----------|
| `docs/memory/` | 项目级记忆（git 追踪） | Cursor / Claude / 团队成员共享 |
| `~/.claude/.../memory/` | Claude 会话记忆（带 frontmatter） | Claude Code 自动加载 |

### 项目 Memory 文件（`docs/memory/`）

| 文件 | 用途 | 更新触发 |
|------|------|----------|
| [[docs/memory/architecture-decisions]] | 架构决策日志（ADR） | 每次重要架构决策后追加 |
| [[docs/memory/code-review-checklist]] | PR 前逐项自检清单 | 每次发现新坑后追加 |
| [[docs/memory/app-factory-tech-stack]] | 技术栈 + 踩坑记录 | 环境/版本变更、踩坑后 |

### Claude 会话 Memory（`~/.claude/`）

| 文件 | 用途 |
|------|------|
| [[app-factory-comprehensive-understanding]] | 2026-06-23 架构/管道/能力边界全维度理解 |
| [[app-factory-quality-assessment]] | 2026-06-22 全面质量评判（C 级、原型级产出） |

### 更新规则

| 事件 | 更新目标 |
|------|----------|
| 重要架构决策 | [[docs/memory/architecture-decisions]] |
| 踩坑 / CR 新检查项 | [[docs/memory/code-review-checklist]] |
| 技术栈 / 环境变更 | [[docs/memory/app-factory-tech-stack]] |
| 里程碑收工 | `docs/HANDOFF.md` + `docs/CONTINUOUS_DELIVERY_OUTLINE.md` §3 |

**Tier-1 开工必读（5 分钟）**：见 [Claude共享记忆-总索引.md §三](docs/Claude共享记忆-总索引.md)

---

## 八、代码智能工具（先查后读）

### CodeGraph（结构 / 调用关系）

- 首选 `codegraph_explore` · 读文件用 `codegraph_node`
- 勿一上来全仓库 grep

### jCodeMunch（改前影响面）

- 仓库 ID：`guiming-rgb/app-factory`
- 改前：`check_edit_safe` / `get_blast_radius` · 删前：`check_delete_safe`

```
理解: CodeGraph → jCodeMunch search → grep/Read
改前: get_blast_radius + check_edit_safe
```

---

## 九、一键验收（收工前）

```bash
npm run build
npm test
npm run verify:industry:templates
npm run verify:industry:parity
npm run verify:industry:e2e
npm run verify:c3:wechat-compile
npm run verify:c6:harmony
```

行业 / parity 专项改动：**以上全跑**。小改可只跑相关子集 + `build` + `test`。

---

## 十、与 Cursor 规则等价

以下 `.cursor/rules/*.mdc` 与本文件**同等效力**（Claude 须遵守）：

- `product-paths-memory.mdc` · `maintainer-daily-reminder.mdc`
- `agent-testing-minimal-human.mdc` · `tcm-continuity.mdc`
- `project-overview.mdc` · `project-architecture.mdc` · `work-conventions.mdc`

**勿将 `.env.local` 交给任何 AI。**

---

## 十一、审计追踪（2026-07-05 深度审计 v3）

### mitigations_ledger

### emit_refactor_roadmap（2026-07-06 · P0 基线）

| 阶段 | 主题 | 状态 |
|------|------|------|
| P0 | RFC + ledger + 基线 | ✅ 文档落盘 |
| P1 | snapshot · 三栈 verify · detectIndustry 置信度 · emit 行数软门禁 | ✅ 2026-07-07 |
| P2 | Mustache 迁移 · 配置表化 · shared-emit | ✅ 2026-07-07 全量 19 JSON |
| P3 | flutter-codegen 拆分 · detect-rules JSON · parity --filter · SSO schema | 🔄 首轮 2026-07-07 |
| P4 | CI 矩阵 · codegen 可观测 · WIP commit · 真机 SOP | ⏳ |

**真源**：[docs/rfc-emit-refactor.md](docs/rfc-emit-refactor.md) · [docs/HANDOFF.md](docs/HANDOFF.md) §P0/P1


```yaml
- finding_id: "M1"
  description: "Admin 路由 6 个 Supabase 查询不解构 error"
  location: "app/api/admin/route.ts:22-33"
  status: "unfixed"
  severity: "MEDIUM"
  fix: "每处查询加 if (error) console.error(...) + 返回明确错误"
  verify_method: "临时改错 RLS policy，确认 admin 面板不静默显示全零"
  
- finding_id: "M4"
  description: "spec_versions 表 version vs version_number 列名不匹配"
  location: "lib/app-spec/spec-versions.ts:16-28 + supabase/migrations/20260625_q5_versioning.sql:19"
  status: "unfixed"
  severity: "MEDIUM"
  fix: "确认 Supabase 生产 DB 实际列名后统一，如果是 version 则改 migration 约束列名"
  verify_method: "Supabase Dashboard → SQL Editor → SELECT column_name FROM information_schema.columns WHERE table_name='spec_versions'"

- finding_id: "M5"
  description: "execSync('flutter pub get') 无 timeout"
  location: "lib/sandbox/flutter.ts:31"
  status: "unfixed"
  severity: "MEDIUM"
  fix: "execSync 加 timeout: 120000 参数（对齐 runFlutterApkDebugBuild）"
  verify_method: "断网后触发 codegen，确认 120s 后进程被 kill"

# --- v3 审计新增 (2026-07-05) ---

- finding_id: "C1"
  description: "OpenAI/DeepSeek 客户端无 timeout 配置"
  location: "lib/llm.ts:55-62"
  status: "unfixed"
  severity: "CRITICAL"
  fix: "new OpenAI({ apiKey, baseURL, timeout: 120000, maxRetries: 1 })"
  verify_method: "模拟 API 超时 → 确认 120s 后请求被 abort"

- finding_id: "C2"
  description: "callLLM 无 AbortController / 请求取消机制"
  location: "lib/llm.ts:214-227"
  status: "unfixed"
  severity: "CRITICAL"
  fix: "callLLM 接受 signal?: AbortSignal 参数，用 Promise.race 包裹"
  verify_method: "用户关闭浏览器 → 确认 serverless 函数不继续阻塞"

- finding_id: "C3"
  description: "verify-artifact.ts 死代码 — 生成 ZIP 零验证"
  location: "lib/codegen/verify-artifact.ts"
  status: "unfixed"
  severity: "CRITICAL"
  fix: "BaseCodegenExecutor.execute() 的 finally 块中调用 verifyGeneratedArtifact"
  verify_method: "生成 codegen 输出 → 确认 ZIP 经过结构验证"

- finding_id: "C4"
  description: "codegen_runs 状态转换无守卫"
  location: "lib/codegen/runs.ts:89-93"
  status: "unfixed"
  severity: "CRITICAL"
  fix: "updateCodegenRun 加 currentStatus 参数，UPDATE 加 .eq('status', currentStatus)"
  verify_method: "markCodegenRunRunning(completedRunId) → 确认不覆盖已完成状态"

- finding_id: "C5"
  description: "多 execSync/spawnSync 无 timeout（超越 M5）"
  location: "lib/sandbox/flutter.ts:25,33,56,64,79"
  status: "unfixed"
  severity: "CRITICAL"
  fix: "所有 execSync/spawnSync 统一加 timeout: 120000"
  verify_method: "Docker daemon 无响应 → 确认 120s 后子进程被 kill"
```

### false_positive_ledger

```yaml
- pattern: "反射型 XSS via displayName HTML 注入"
  finding_id: "A6-C1"
  refuted_by: "反驳 agent 确认 Content-Disposition: attachment 阻止浏览器内联渲染 + POST-only 接口无法通过 link click 触发"
  lesson: "检查 XSS 前先确认 Content-Type/Content-Disposition 响应头是否已提供防护"

- pattern: "cache: no-store 禁用 HTTP keep-alive"
  finding_id: "A3-H3"
  refuted_by: "反驳 agent 确认 Fetch API cache 选项与 TCP keep-alive 是不同层，keep-alive 由 undici 管理"
  lesson: "区分 HTTP 缓存语义与传输层连接复用"

- pattern: "spec_versions 无 UNIQUE(project_id, version) 约束"
  finding_id: "A2-C1"
  refuted_by: "反驳 agent 发现 supabase/migrations/20260625_q5_versioning.sql:19 有 UNIQUE(project_id, version_number)，但列名与 app 代码使用的 version 不匹配"
  lesson: "审计前检查 supabase/migrations/ 目录，不仅 sql/migrations/；注意 migration 列名与 app 代码列名的一致性"

# --- v3 反驳新增 (2026-07-05, 双 Opus 不同 tier 交叉) ---

- pattern: "Stripe Webhook 无签名验证"
  finding_id: "S-C1"
  agent: "A6 (安全维度, GLM)"
  refuted_by: "Skeptic 1 (Opus) 读回 app/api/stripe/webhook/route.ts:31-37 — 实际调用 stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)"
  lesson: "安全维度 agent 倾向'看到缺失的安全特性'。检查 webhook 验签前必须 Read 回读实际代码"

- pattern: "API key 明文存储/对比"
  finding_id: "S-C2"
  agent: "A6 (安全维度, GLM)"
  refuted_by: "Skeptic 1 (Opus) 读回 app/api/webhook/codegen/route.ts:11-13 — hashApiKey() 用 SHA-256 哈希，.eq('key_hash', keyHash) 对比哈希"
  lesson: "审计 agent 容易虚构'明文存储'指控。检查密钥存储前必须确认 hash/salt 管道存在"

- pattern: "Mustache 模板渲染静默失败"
  finding_id: "A4-H15"
  agent: "A4 (错误处理维度, GLM)"
  refuted_by: "Skeptic 2 (Sonnet) 确认代码库无 Mustache npm 依赖、无 Mustache import、声称的行号区间含无关代码。codegen 用直接字符串 emit（非 Mustache）"
  lesson: "Agent 可能编造不存在的库依赖和文件路径。跨维度发现（如'模板断链'）必须穷举矩阵验证，不信任 Agent 自由搜索"

# --- v3.1 反驳新增 (2026-07-06, 双 Agent DeepSeek skeptic 交叉) ---

# 本次反驳 6 条 CRITICAL 全部 DOWNGRADED（无反证推翻）
# 反驳 Agent 1: C1→HIGH, C2→MEDIUM
# 反驳 Agent 2: C3→MEDIUM, C4→LOW, C5→LOW, C6→MEDIUM
# 详见 Docs/审计报告/app-factory-v3-2026-07-06.md Phase 2.5 反驳结果
```
```

### v3.1 审计新增 findings (2026-07-06 · Phase 2.5 反驳后调整)

```yaml
# -- CRITICAL→HIGH (反驳降级) --
- finding_id: "v3-C1"
  description: "SSO callback 接受未验证的邮箱声明 — 认证绕过"
  location: "lib/enterprise/sso-service.ts:298-342"
  status: "fixed"
  fixed_evidence: "lib/enterprise/sso-service.ts: handleSSOCallback 删除 decodeJWTUnsafe + sso-xxx@domain 降级；改用 jose jwtVerify + createRemoteJWKSet；强制 additionalClaims.email 存在"
  severity: "HIGH"
  open: "CLOSED"

# -- CRITICAL→MEDIUM (反驳降级) --
- finding_id: "v3-C2"
  description: "SSO callback 无 CSRF/state 验证 — state nonce 从不校验"
  location: "app/api/enterprise/sso/callback/route.ts:34-98,107-143"
  status: "partially_fixed"
  note: "redirect 逻辑已提取到 buildSsoRedirectResponse；CSRF state nonce 验证仍未实现"
  severity: "MEDIUM"
  open: "OPEN"

- finding_id: "v3-C3"
  description: "Stripe webhook 只处理 2 种事件，缺少 invoice.paid 等"
  location: "app/api/stripe/webhook/route.ts:67-148"
  status: "fixed"
  fixed_evidence: "app/api/stripe/webhook/route.ts 委托 handleStripeWebhook (lib/billing/invoicing.ts)，覆盖 checkout/invoice.paid/invoice.payment_failed/subscription.updated/deleted 5 种事件"
  severity: "MEDIUM"
  open: "CLOSED"

# -- CRITICAL→LOW (反驳降级) --
- finding_id: "v3-C4"
  description: "Octokit 无 timeout — GHA 推送阻塞"
  location: "lib/github/desktop-gha.ts:42"
  status: "unfixed"
  severity: "LOW"  # 反驳降级: CRITICAL→LOW — 轻量 REST 调用，Inngest step timeout 保护
  open: "OPEN"
  fix: "new Octokit({ auth, request: { timeout: 30000 } })"
  verify_method: "模拟 GitHub API 超时 → 确认 30s 后请求被 abort"

- finding_id: "v3-C5"
  description: "codegen_runs TOCTOU — 无 DB UNIQUE 约束防重复 run"
  location: "lib/codegen/runs.ts:17-39 + sql/migrations/20260520_codegen_runs.sql:4-16"
  status: "fixed"
  fixed_evidence: "sql/migrations/20260706_codegen_runs_active_unique.sql + supabase/migrations/ 镜像: CREATE UNIQUE INDEX idx_one_active_codegen_run ON codegen_runs(project_id, target) WHERE status IN ('queued','running')"
  severity: "LOW"
  open: "CLOSED"

- finding_id: "v3-C6"
  description: "metadata 丢失更新 — mergeCodegenRunNestedMetadata 无乐观锁"
  location: "lib/codegen/merge-run-metadata.ts:22-30"
  status: "fixed"
  fixed_evidence: "lib/codegen/merge-run-metadata.ts: 基于 updated_at 乐观锁 + 最多 5 次重试 (mergeCodegenRunWithLock)"
  severity: "MEDIUM"
  open: "CLOSED"

# --- 2026-07-06 Cursor 批量修复 (7 项全落盘, 914/914 test + lint 0 err) ---
- finding_id: "H-D1"
  description: "admin/dashboard Promise.all 6 查询不解构 error"
  location: "app/api/admin/dashboard/route.ts:16-34"
  status: "fixed"
  fixed_evidence: "app/api/admin/dashboard/route.ts: 逐项解构 { data, error }，failOnSupabaseError 辅助函数，任一 error 返回 500"
- finding_id: "H-D6"
  description: "recordUsage insert 不解构 error"
  location: "lib/billing/usage.ts:46"
  status: "fixed"
  fixed_evidence: "lib/billing/usage.ts: recordUsage 解构 { error } 并 throw；getUsageReport 解构 { data, error } 并 throw"
- finding_id: "H-D7"
  description: "getUsageReport/getCurrentUsage 不解构 error"
  location: "lib/billing/usage.ts:55-68"
  status: "fixed"
  fixed_evidence: "lib/billing/usage.ts: getCurrentUsage(members) 失败时 console.warn"
- finding_id: "H-E1"
  description: "monitoring.ts 3 处空 catch — Sentry/Supabase/慢查询降级全吞错"
  location: "lib/monitoring.ts:31-95"
  status: "fixed"
  fixed_evidence: "lib/monitoring.ts: 3 处 catch {} → catch (err) { console.warn(...) }"
- finding_id: "H-E2"
  description: "codegen webhook last_used_at 更新失败静默"
  location: "app/api/webhook/codegen/route.ts:55"
  status: "fixed"
  fixed_evidence: "app/api/webhook/codegen/route.ts:55: .then(undefined, () => {}) → .then(undefined, (err) => console.warn(...))"
- finding_id: "H-C3"
  description: "cleanupByStatus UPDATE 无 .eq('status', ...) 守卫"
  location: "lib/codegen/stale-runs.ts:44-51"
  status: "fixed"
  fixed_evidence: "lib/codegen/stale-runs.ts: UPDATE 加 .eq('status', options.status) + updateError 检查"
- finding_id: "D2-D7"
  description: "markCodegenRunFailed catch {} 空块吞异常"
  location: "lib/codegen/runs.ts:149-151"
  status: "fixed"
  fixed_evidence: "lib/codegen/runs.ts: catch {} → catch (err) { console.warn('[codegen/runs] markCodegenRunFailed skipped:', ...) }"
- finding_id: "D2-D11"
  description: "template-renderer precompilePlatformTemplates catch {} 空块"
  location: "lib/codegen/template-renderer.ts:156-158"
  status: "fixed"
  fixed_evidence: "lib/codegen/template-renderer.ts: catch {} → catch (err) { console.warn(...) }"

# 上次审计更新
- finding_id: "C1"
  status: "fixed"
  fixed_evidence: "lib/llm.ts:53 LLM_TIMEOUT_MS=120000, lib/llm.ts:62 timeout: LLM_TIMEOUT_MS"
- finding_id: "C2"
  status: "fixed"
  fixed_evidence: "lib/llm.ts:95 signal?: AbortSignal, lib/llm.ts:224,239 signal 检查与传播"
- finding_id: "C3"
  status: "partially_fixed"
  note: "Flutter 已接入 verifyGeneratedArtifact，WeChat/Harmony 仍跳过 (lib/codegen/base-executor.ts:258-265)"
- finding_id: "C4"
  status: "fixed"
  fixed_evidence: "lib/codegen/runs.ts:86 fromStatus 参数, runs.ts:97 .in('status', statuses)"
- finding_id: "C5"
  status: "fixed"
  fixed_evidence: "lib/sandbox/flutter.ts:24 SANDBOX_CMD_TIMEOUT_MS=120000 全局替换"
- finding_id: "M1"
  status: "partially_fixed"
  note: "app/api/admin/route.ts 已修复; admin/dashboard/route.ts:16-34 同类型仍存在"
- finding_id: "M5"
  status: "fixed"
  note: "合并入 C5"
```
