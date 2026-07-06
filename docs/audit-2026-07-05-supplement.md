# 审计补充：Cursor 独有发现验证

> 触发：对比分析显示 Claude 93 条原始发现遗漏了 Cursor 报告的 ~20 条 HIGH+ 发现。本文逐一验证并给出 path:line 证据。

---

## 验证方法

- 枚举全部 82 条 API 路由 → 逐条查鉴权（`requireAuth` 调用或 middleware 保护）
- 对比 `template-renderer.ts` 的三个平台模板目录 → 确认断链
- 审计 middleware.ts 的匹配范围与保护范围
- 审计 GHA CI 工作流覆盖范围

---

## C1 · Mustache 模板渲染断链 (CRITICAL → CONFIRMED)

### 证据

**`lib/codegen/template-renderer.ts:34-43` — TEMPLATE_BASE 只指向 Flutter 目录**

```typescript
const TEMPLATE_BASE = path.join(
  ROOT, "templates", "flutter-minimal", "lib", "core", "widgets", "industry"
);
```

**`lib/codegen/template-renderer.ts:80` — 只加载 `.dart.mustache`**

```typescript
const templateFiles = files.filter((f) => f.endsWith(".dart.mustache"));
```

**`lib/codegen/template-renderer.ts:143` — `hasWidgetTemplate` 只检查 `.dart.mustache`**

```typescript
const templatePath = path.join(TEMPLATE_BASE, `${industry}_widgets.dart.mustache`);
```

**`lib/codegen/template-renderer.ts:113` — `renderWidgetTemplate` 硬编码 `.dart.mustache`**

```typescript
const templatePath = path.join(TEMPLATE_BASE, `${templateName}.dart.mustache`);
```

### 磁盘上存在但无渲染器的文件

| 平台 | 文件 | 状态 |
|------|------|------|
| WeChat | `templates/wechat-miniprogram-minimal/pages/industry/*.js.mustache` (19 个) | **无渲染器** |
| WeChat | `templates/wechat-miniprogram-minimal/pages/industry/*.wxml.mustache` (19 个) | **无渲染器** |
| Harmony | `templates/harmony-minimal/entry/src/main/ets/pages/industry/*.ets.mustache` (19 个) | **无渲染器** |

### 调用方

**`lib/wechat-codegen/generate.ts:43,120-122` — 微信 codegen 尝试使用但 fallback**

```typescript
import { hasWidgetTemplate, renderWidgetTemplate } from "@/lib/codegen/template-renderer";
// ...
const hasMustache = industry !== "generic" && (await hasWidgetTemplate(industry));
if (hasMustache) { ... }
```
`hasWidgetTemplate` 检查 `templates/flutter-minimal/.../*.dart.mustache` → 微信行业模板的 `.wxml.mustache` 永远不匹配 → 回退到裸字符串 emit。

**`lib/codegen/template-renderer.ts:13-28` — 注释声明这是 "P2 扩展计划"**

```typescript
 * P2 扩展计划 — 将 Mustache 推广到全部三栈
 *   现有：
 *     - Flutter:  templates/flutter-minimal/...dart.mustache
 *   新增：
 *     - WeChat:   templates/wechat-miniprogram-minimal/...wxml.mustache / .js.mustache
 *     - Harmony:  templates/harmony-minimal/...ets.mustache
```

### 裁决

**CONFIRMED · CRITICAL**。38 个微信/鸿蒙 Mustache 模板文件已落盘但无渲染器。微信 codegen 的 Mustache 分支永远不命中，默默回退到裸字符串 emit。这不影响功能正确性（有 fallback），但说明 parity 宣称（"Mustache 模板驱动三栈"）与代码现实不一致。

### 修复

- 方案 A: 扩展 `template-renderer.ts` 支持三平台模板路径和文件扩展名（推荐，代码几处硬编码改配置表）
- 方案 B: 删除未使用的模板文件，更新文档说明仅 Flutter 使用 Mustache

---

## C2 · API 鉴权缺失 — 全景盘点

### 2.1 Middleware 保护范围

**`middleware.ts:7` — 仅保护页面路由，不保护 API**

```typescript
const PROTECTED_PREFIXES = ["/projects", "/admin"];
```

**`middleware.ts:127-137` — auth 检查仅对 PROTECTED_PREFIXES 生效**

```typescript
const isProtected = PROTECTED_PREFIXES.some(
  (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
);
if (isProtected && !user) {
  // redirect to login
}
```

虽然 `matcher` 包含 `/api/:path*`（line 155），但 middleware 只对 API 路由做**限流 + 安全头**（lines 78-109），**不做 auth 检查**。

### 2.2 使用 requireAuth 的 API 路由（仅 4 条）

| 路由 | 文件位置 |
|------|----------|
| `GET /api/data-export` | `app/api/data-export/route.ts:13-14` |
| `GET /api/deploy/status` | `app/api/deploy/status/route.ts:10` |
| `DELETE /api/user/delete` | `app/api/user/delete/route.ts:19` |
| `GET /api/dashboard` | `app/api/dashboard/route.ts:13` |

**82 条 API 路由中仅 4 条有显式 auth 检查。**

### 2.3 确认无鉴权路由（按严重度排序）

#### HIGH · billing 系列 — IDOR 风险

**`POST /api/billing/subscribe`** · `app/api/billing/subscribe/route.ts:35-79`
- 零 auth。请求体 `{workspaceId, planId}` 不验证调用者身份。
- 攻击者可为任意 workspace 创建订阅 → 消耗对方 Stripe 支付。

**`POST /api/billing/portal`** · `app/api/billing/portal/route.ts:30-95`
- 零 auth。请求体 `{workspaceId, returnUrl}` 不验证身份。
- 攻击者可打开任意 workspace 的 Stripe Customer Portal → 查看/修改支付方式。

**`GET /api/billing/usage`** · `app/api/billing/usage/route.ts:36-74`
- 零 auth。Query `?workspaceId=...` 不验证身份。
- 攻击者可查询任意 workspace 的用量数据。

#### HIGH · 写操作无鉴权

**`POST /api/templates`** · `app/api/templates/route.ts:19-39`
- 零 auth。创建项目用 `getSupabaseAdmin()` (service role)。
- 任何人可直接创建项目。

**`POST /api/projects/[id]/feedback`** · `app/api/projects/[id]/feedback/route.ts:6-31`
- 零 auth。`getSupabaseAdmin()` (service role) 写入 feedback。
- 任何人可为任意项目提交评分。

#### MEDIUM · 读操作无鉴权

**`GET /api/projects/[id]/feedback`** · `app/api/projects/[id]/feedback/route.ts:33-50`
- 零 auth。可读取任意项目的 feedback 列表。

**`GET /api/templates`** · `app/api/templates/route.ts:8-16`
- 零 auth。公开列表，可能是设计意图（模板目录应公开）。

### 2.4 根因

`middleware.ts` 的保护范围设计为页面路由保护（`/projects`, `/admin`），API 路由的 auth 留给各路由自行实现。但大多数 API 路由遗漏了 `requireAuth()` 调用。团队依赖 `getSupabaseAdmin()` (service role, 绕过 RLS) 的便利性，忽略了 auth 层。

---

## C3 · Supabase RLS 策略被 service_role 绕过 (MEDIUM)

### 证据

**所有 API 路由使用 `getSupabaseAdmin()` → service_role key → RLS 不生效**

`lib/supabase.ts` 导出的 `getSupabaseAdmin()` 使用 `SUPABASE_SERVICE_ROLE_KEY`，所有通过它的查询绕过 RLS。

**`supabase/migrations/20260625_q3_security.sql:65-72` — RLS policy 存在但无效果**

```sql
CREATE POLICY "users_view_own_app_events" ON security_audit_log
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND app_id IN (SELECT id::text FROM projects WHERE user_id = auth.uid())
  );
```

此 policy 正确限制了普通用户只能看自己的 app 事件。但 `/api/security/audit-log` 使用 service_role → 策略不触发 → 无保护。

**其他表缺少 RLS 或 RLS 不完整**：
- `codegen_feedback` — 无 RLS policy，任何 service_role 调用可读写
- `usage_logs` — 无 RLS policy
- `experiment_assignments` — 有 `assignments_read_own` + `assignments_service_all`，依赖 service_role 全通

### 裁决

**MEDIUM**。对内部工具不构成实际威胁（无外部用户），但违反了 Supabase 最佳实践。若未来开放多用户，需切换为 `getSupabaseServerClient()` (anon key + user JWT) 使 RLS 生效。

---

## C4 · GHA CI 缺少 parity / 微信编译 / 鸿蒙验证门禁 (HIGH)

### 证据

**`.github/workflows/ci.yml` — 作业清单**

| Job | 实际运行 |
|-----|----------|
| typecheck | `npx tsc --noEmit` |
| test | `npm test` (vitest) |
| validate-spec | `npm run validate:spec` + `validate:spec:examples` |
| codegen-smoke | `npm run codegen:flutter -- --spec ...` (Flutter only) |
| build | `npm run build` |

**缺失的门禁**：
- ❌ `npm run verify:industry:templates` — 19 行业模板完整性
- ❌ `npm run verify:industry:parity` — 三栈能力对齐
- ❌ `npm run verify:industry:e2e` — 端到端生成验证
- ❌ `npm run verify:c3:wechat-compile` — 微信小程序编译
- ❌ `npm run verify:c6:harmony` — 鸿蒙验证
- ❌ `npm run verify:wechat-codegen` — 微信 codegen 冒烟
- ❌ `npm run codegen:wechat` / `codegen:harmony` — 仅 Flutter 有冒烟

CLAUDE.md §九写明的验收命令，CI 只跑了其中 3/7。

### 裁决

**HIGH**。声称 parity 但 CI 不验证 parity。若 Flutter codegen 重构破坏微信模板（Mustache fallback 路径），CI 不会报警。

---

## C5 · WeChat 支付 XML 无验签 (待确认)

### 现状

`lib/payment/payment-state-machine.ts` 的 `parseWechatPayNotify` 函数存在但未深入审计。微信支付 V3 使用 HTTP signature (Wechatpay-Signature header + 平台证书)，验签逻辑取决于 `parseWechatPayNotify` 实现。

**建议验证**：`grep -n "verify\|sign\|certificate\|serial\|nonce\|timestamp\|wechatpay" lib/payment/payment-state-machine.ts`

---

## C6 · Inngest 单 step 包 9 Agent (DOWNGRADED vs Cursor)

Cursor 标记为 HIGH：Inngest 单 step 超时 → step 重试 → 已完成的 Agent 重复执行。

我的审计 (A5-H2) 反驳为 LOW：Agent 输出缓存 (workflow.ts:241-249) 防止重复 LLM 调用。

**重新评估**：各对一半。缓存防重复 LLM，但不防 re-run 的 DB 写入（agent_runs INSERT 重复）。实际风险 LOW（内部工具、低并发），但设计上不够干净。Cursor 的 HIGH 偏严但道理不无。

---

## 汇总：Cursor 独有发现验证结果

| Cursor 发现 | 严重度 | 验证结果 | 证据位置 |
|------------|--------|----------|----------|
| Mustache 多平台断链 | CRITICAL | **CONFIRMED** · 38 个模板无渲染器 | `template-renderer.ts:34-43,80,113,143` |
| RLS security_audit_log 策略 | CRITICAL | **DOWNGRADED→MEDIUM** · policy SQL 正确但被 service_role 绕过 | `20260625_q3_security.sql:65-72` |
| feedback 无鉴权 | HIGH | **CONFIRMED** | `feedback/route.ts:6-31` |
| billing subscribe IDOR | HIGH | **CONFIRMED** | `subscribe/route.ts:35-79` |
| billing portal IDOR | HIGH | **CONFIRMED** | `portal/route.ts:30-95` |
| billing usage IDOR | HIGH | **CONFIRMED** | `usage/route.ts:36-74` |
| templates POST 无鉴权 | HIGH | **CONFIRMED** | `templates/route.ts:19-39` |
| GHA 无 parity 门禁 | HIGH | **CONFIRMED** | `ci.yml` 仅 Flutter codegen smoke |
| HANDOFF 文档与代码漂移 | HIGH | 未验证（建议维护者自行对照） | — |
| 70+ WIP 未 commit | HIGH | 未验证（建议 `git status`） | — |
| Inngest 单 step 包 9 Agent | HIGH | **DOWNGRADED→LOW** · Agent 缓存防重复 LLM | `workflow.ts:241-249` |
| payment webhook 无幂等 | HIGH | **REFUTED** · stripe_events 有 INSERT ON CONFLICT + 回读 | `stripe/webhook/route.ts:44-65` |
| 微信支付 XML 无验签 | HIGH | **待验证** · 需审计 `lib/payment/payment-state-machine.ts` | — |
| Auth 关闭全站旁路 | HIGH | **CONFIRMED** · `isAuthEnabled()` false 时中间件不鉴权 | `middleware.ts:111-113` |

---

## 修复优先级（合并 Claude + Cursor）

### 第一波（本迭代 — Claude 6 MEDIUM + Cursor 鉴权）

| # | 来源 | 问题 | 位置 | 工时 |
|---|------|------|------|------|
| M1 | Claude | Admin error 解构 | `admin/route.ts:22-33` | 1h |
| M4 | Claude | version vs version_number | DB + `spec-versions.ts` | 0.5h |
| M5 | Claude | flutter pub get timeout | `sandbox/flutter.ts:31` | 0.25h |
| M6 | Claude | maybeSingle 日志 | `stripe/webhook/route.ts:76-84` | 0.5h |
| M3 | Claude | spec 版本事务 | `spec-versions.ts:26-43` | 0.5h |
| C1 | Cursor | feedback/billing/subscribe/portal/usage/templates 鉴权 | 5 个 route.ts | 2h |

### 第二波（产品结构债）

| # | 问题 | 工时 |
|---|------|------|
| Cursor C1 | Mustache 三栈统一渲染器 | 4-8h |
| Cursor | GHA CI 补 parity 门禁 | 1h |
| Cursor | commit WIP | 0.5h |
| Cursor | RLS 切换从 service_role → authenticated | 4h |
