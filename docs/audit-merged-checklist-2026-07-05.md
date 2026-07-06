# App 生产工厂 · 合并审计清单与修复执行顺序

> **日期**: 2026-07-05  
> **来源**: Cursor v3 全范围审计 + `audit-2026-07-05-v3.md` + `audit-2026-07-05-supplement.md` + `CLAUDE.md` ledger  
> **基线**: WIP 本地门禁全绿（896 test / build / parity 173 / e2e 180 / templates 105），**62+ 文件未 commit**  
> **口径**: 默认内部工具；标 `[公网]` 项在对外 SaaS 时升为 P0

---

## 执行顺序总览

```
第 0 步  交付对齐（0.5h）     → 否则「修了等于没修」
第 1 步  可靠性 P0（~2.5h）  → Claude C1–C5
第 2 步  安全 P0（~4h）       → 鉴权 / 导出 / admin / 支付
第 3 步  产品结构 P0（~6h）   → Mustache 三栈 + 门禁
第 4 步  数据/运维 P1（~4h）  → Claude M1–M6 + workflow 收尾
第 5 步  CI & 文档 P1（~2h）
第 6 步  防御性 P2（按需）     → 剩余 ~50 条 LOW/MEDIUM
```

**预估**: P0 ~12.5h · P1 ~6h

---

## 第 0 步 · 交付对齐（必须先做）

| # | ID | 问题 | 位置 | 动作 | 工时 | 来源 |
|---|-----|------|------|------|------|------|
| 0.1 | D-01 | **62+ WIP 未 commit**，HEAD=`f0aab20` 与本地不一致 | git | 分批 commit：安全 / industry / 测试 / 文档 | 0.5h | Cursor |
| 0.2 | D-02 | HANDOFF 自相矛盾（「全线贯通 ✅」vs「WIP 不完整」） | `docs/HANDOFF.md` | 以实测为准重写：896 test、29 Playwright E2E、9 Agent | 0.5h | Cursor |

**验收**: `git log` 含 WIP 修复；HANDOFF 无矛盾表述。

---

## 第 1 步 · 可靠性 P0（Claude C1–C5）

| # | ID | 问题 | 位置 | 修复 | 工时 | 验收 |
|---|-----|------|------|------|------|------|
| 1.1 | **C1** | OpenAI/DeepSeek 客户端无 timeout | `lib/llm.ts:55-62` | `new OpenAI({ ..., timeout: 120000, maxRetries: 1 })` | 0.25h | 模拟超时 120s 内 abort |
| 1.2 | **C2** | `callLLM` 无 AbortSignal | `lib/llm.ts:214-227` | 接受 `signal?`，`Promise.race` | 0.5h | 取消请求不阻塞到 600s |
| 1.3 | **C3** | `verifyGeneratedArtifact` 死代码，ZIP 零验证 | `lib/codegen/verify-artifact.ts` | 在 `BaseCodegenExecutor.execute()` finally 调用 | 0.5h | 生成物必经结构校验 |
| 1.4 | **C4** | `codegen_runs` 状态转换无守卫 | `lib/codegen/runs.ts:89-93` | `updateCodegenRun` 加 `currentStatus`，`.eq("status", expected)` | 0.5h | completed 不可被改回 running |
| 1.5 | **C5** | 多处 `execSync/spawnSync` 无 timeout | `lib/sandbox/flutter.ts:25,33,56,64,79` | 统一 `timeout: 120000`（含 pub get） | 0.5h | Docker/网络 hang 时 120s kill |

---

## 第 2 步 · 安全 P0（Cursor + supplement CONFIRMED）

### 2A · API 鉴权 `[公网]` 必修

| # | ID | 问题 | 位置 | 修复 | 工时 |
|---|-----|------|------|------|------|
| 2.1 | **S-01** | Billing subscribe 无 session | `billing/subscribe/route.ts` | `requireAuth` + workspace 成员校验 | 0.5h |
| 2.2 | **S-02** | Billing portal IDOR | `billing/portal/route.ts` | 同上 | 0.25h |
| 2.3 | **S-03** | Billing usage 无鉴权 | `billing/usage/route.ts` | 同上 | 0.25h |
| 2.4 | **S-04** | Stripe 未配置时本地免费升 Pro | `lib/billing/subscriptions.ts` | 无 Stripe key 时拒绝 paid plan | 0.25h |
| 2.5 | **S-05** | feedback 读写无鉴权 | `projects/[id]/feedback/route.ts` | auth + 项目归属 | 0.5h |
| 2.6 | **S-06** | templates POST 无鉴权造孤儿项目 | `templates/route.ts` | auth + `owner_id` | 0.25h |
| 2.7 | **S-07** | data-export 导出全平台 usage_logs | `data-export/route.ts` | 按 `user.id` 过滤项目 | 0.5h |
| 2.8 | **S-08** | `ADMIN_USER_IDS` 空时 dashboard/workspaces-all 开放 | `admin/dashboard`, `workspaces-all` | 统一 `requireAdmin()`：空 env → deny | 0.5h |
| 2.9 | **S-09** | Checkout 开放重定向 | `billing/subscribe/route.ts` | 校验 successUrl/cancelUrl 同源 | 0.25h |

### 2B · 支付与 XSS

| # | ID | 问题 | 位置 | 修复 | 工时 |
|---|-----|------|------|------|------|
| 2.10 | **S-10** | 微信支付 XML 无验签 | `payment/webhook` + `payment-state-machine.ts` | 实现 V3 签名验证 | 2h |
| 2.11 | **S-11** | payment webhook Stripe 路径无 stripe_events 幂等 | `payment/webhook/route.ts` | 对齐 `/api/stripe/webhook` 幂等 | 0.5h |
| 2.12 | **S-12** | generated-privacy HTML 未转义 | `generated-privacy/route.ts` | escape + rate limit | 0.5h |

### 2C · RLS / 策略

| # | ID | 问题 | 位置 | 修复 | 工时 |
|---|-----|------|------|------|------|
| 2.13 | **S-13** | `security_audit_log` RLS 过宽 | `q3_security.sql:60-61` | `TO service_role` 或收紧 | 0.5h |
| 2.14 | **S-14** | audit_log 策略 `user_id` 应为 `owner_id` | `q3_security.sql:65-72` | 修正列名 | 0.25h |
| 2.15 | **S-15** | experiments RLS `WITH CHECK(true)` | `q4_publishing_abtest.sql` | 限定 admin/service_role | 0.5h |

**第 2 步验收**: billing/feedback/templates/export/admin 有 auth；`npm test` 仍绿。

---

## 第 3 步 · 产品结构 P0（Codegen / Parity）

| # | ID | 问题 | 位置 | 修复 | 工时 | 来源 |
|---|-----|------|------|------|------|------|
| 3.1 | **G-01** | Mustache renderer 只认 `.dart.mustache` | `lib/codegen/template-renderer.ts` | 平台配置表：Flutter / 微信 wxml+js / 鸿蒙 ets | 4–6h | 双方 CONFIRMED |
| 3.2 | **G-02** | WXML `{{products}}` 与 Mustache 冲突 | `*.wxml.mustache` | `{{= }}` 转义或禁用 Mustache 改 emit | 2h | Cursor |
| 3.3 | **G-03** | Mustache 失败静默 → `Page({})` | `wechat-codegen/generate.ts:131-134` | fail-fast 或 warn；禁止空 JS | 0.5h | Cursor |
| 3.4 | **G-04** | `hasWidgetTemplate` 用 Flutter 误判 | `wechat/harmony generate.ts` | 平台专用 `hasPlatformTemplate()` | 0.5h | Cursor |
| 3.5 | **G-05** | 演示模式 list 用 `Supabase.instance` | `templates/industry-*/pages/list_page.dart` | 统一 `supabaseOrNull` + sample data | 1h | Cursor |
| 3.6 | **G-06** | parity 173 不跑编译 | `scripts/verify-industry-parity.mjs` | 抽样 dart analyze / wcc；skip≠pass | 1h | 双方 |
| 3.7 | **G-07** | `verify-artifact` 忽略 analyze 失败 | `lib/codegen/verify-artifact.ts:80-81` | analyze failed → `ok: false` | 0.25h | Cursor |

---

## 第 4 步 · 数据 / 运维 P1（Claude M1–M6 + workflow）

| # | ID | 问题 | 位置 | 修复 | 工时 | 来源 |
|---|-----|------|------|------|------|------|
| 4.1 | **M1** | Admin 6 处不解构 Supabase error | `admin/route.ts:22-33` | 每处 `if (error)` | 1h | Claude |
| 4.2 | **M4** | spec `version` vs `version_number` 列名 | DB + `spec-versions.ts` | SQL 查列名 → 统一 | 0.5h | Claude |
| 4.3 | **M3** | spec 版本 INSERT+DELETE 无事务 | `spec-versions.ts:26-43` | RPC 或定期 cleanup | 0.5h | Claude |
| 4.4 | **M6** | Stripe maybeSingle null 静默跳过配额 | `stripe/webhook/route.ts:76-84` | warn + Inngest 延迟重试 | 0.5h | Claude |
| 4.5 | **M2** | Stripe 仅 2 种事件 | `stripe/webhook/route.ts` | 未处理事件 `console.warn` | 0.5h | Claude |
| 4.6 | **W-01** | `markProjectFailed` 无 status 守卫 | `lib/workflow.ts:333-354` | `.eq("status", "running")` | 0.25h | Cursor |
| 4.7 | **W-02** | `resumeProjectWorkflow` 重复 final_report + 无入口 | `lib/workflow.ts:358+` | 修 bug 或删除死代码 | 1h | Cursor |
| 4.8 | **W-03** | Inngest 单 step 包 9 Agent | `lib/inngest/functions.ts` | 拆 per-agent step 或加 maxDuration | 2h | Cursor |
| 4.9 | **H-07** | `getUserQuota` 无 error 检查 | `lib/auth/quota.ts:30-49` | 检查 error，不静默 free | 0.5h | Claude |
| 4.10 | **H-08** | WeChat/Harmony executor 无监控 | `execute-wechat/harmony.ts:144` | 对齐 Flutter `captureError` | 0.25h | Claude |

> **注**: `prepareProjectWorkflow` TOCTOU（条件 UPDATE + `{ count: 'exact' }`）WIP 已修，无需重复。

---

## 第 5 步 · CI & 文档 P1

| # | ID | 问题 | 位置 | 修复 | 工时 |
|---|-----|------|------|------|------|
| 5.1 | **CI-01** | GHA 无 parity/templates 门禁 | `.github/workflows/ci.yml` | 加 `verify:industry:parity` + `templates` | 0.5h |
| 5.2 | **CI-02** | 无 `npm run lint` | `ci.yml` | 加 lint job | 0.25h |
| 5.3 | **CI-03** | Playwright 未进 CI | `ci.yml` + `playwright.config.ts` | smoke 29 用例；端口对齐 3001 | 1h |
| 5.4 | **CI-04** | deploy-staging 用 `--prod` | `deploy-staging.yml` | 改 staging 或改名 | 0.25h |
| 5.5 | **DOC-01** | 「8 Agent」文案 | README/landing/workflow 注释 | 统一 **9 Agent** | 0.5h |
| 5.6 | **DOC-02** | UI 进度分母固定 9 | `projects/[id]/page.tsx` | 用 `filterAgentsForApp` 实际数量 | 0.5h |

---

## 第 6 步 · 防御性 P2（按需）

| 类别 | 代表项 | 位置 |
|------|--------|------|
| 限流 | 全局计数器非 per-IP | `middleware.ts` |
| CSP | unsafe-inline/eval | `middleware.ts:17` |
| 实验 | A/B 任意登录用户可管理 | `experiments/route.ts` |
| Analytics | `x-analytics-key`=app_id | `analytics/events/route.ts` |
| SSO | token 经 URL | `enterprise/sso/callback` |
| 三栈重复 | generate.ts / emit-extended 三份 | 三栈 codegen |
| Spec | 无语义校验 | `lib/app-spec/validate.ts` |
| 测试 | workflow 零单测 | `lib/__tests__/` |
| 依赖 | npm audit CVE | `package.json` |
| RLS 长期 | service_role bypass | 全 API |

---

## Sprint 切分

### Sprint A（1 天）— 能信任本地状态
0.1、0.2 → 1.1–1.5 → 2.1–2.9

### Sprint B（1–1.5 天）— 能对外演示 codegen
2.10–2.12 → 3.1–3.4

### Sprint C（0.5 天）— 数据与 CI 可信
4.1–4.6 → 5.1–5.3 → 3.5–3.7

### Sprint D（按需）— 产品化
4.7–4.10 → 5.4–5.6 → 第 6 步 P2

---

## 验收命令（每 Sprint 结束）

```bash
npm test
npm run build
npm run verify:industry:parity
npm run verify:industry:e2e
npm run verify:industry:templates
# Sprint C 后追加:
npm run lint
```

---

## 统计摘要

| 来源 | 原始 | 合并 actionable |
|------|------|-----------------|
| Cursor v3 | ~94 | ~35 P0/P1 |
| Claude v3 | 75 | ~20 P0/P1 |
| supplement | 12 验证 | 并入 P0-2 / P0-3 |
| **本清单** | — | **P0: 22 · P1: 16 · P2: ~30** |

---

## 相关文档

- [audit-2026-07-05-v3.md](./audit-2026-07-05-v3.md) — Claude 基础设施审计
- [audit-2026-07-05-supplement.md](./audit-2026-07-05-supplement.md) — Cursor 独有发现验证
- [HANDOFF.md](./HANDOFF.md) — 接力单（待办真源指向本文）
