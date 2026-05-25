# MVP v4 — Supabase Auth + RLS 设计草案

> **状态**：设计草案（2026-05-26）· **未改** `sql/schema.sql`  
> **上位**：[安全审计与清单.md](./安全审计与清单.md) §3.2、§4.2 · [执行计划.md](./执行计划.md) v4 行  
> **生产现状**：https://app-factory-five.vercel.app 已公网，**无登录/RLS** → v4 为上线前必做

---

## 1. 目标与非目标

### 1.1 目标（v4 最小可验收）

| # | 目标 |
|---|------|
| G1 | 用户可 **注册/登录**（Supabase Auth） |
| G2 | 每个 `projects` 行绑定 **`owner_id`**（= `auth.users.id`） |
| G3 | **RLS**：用户只能读写自己的项目及关联数据 |
| G4 | 工厂 API / Inngest 在写操作前校验 **资源归属** |
| G5 | 前端/客户端 **不再** 需要 Service Role；仅服务端保留 |

### 1.2 非目标（v4 不做）

- 团队/组织、多成员协作（v4.1+）
- 细粒度 Admin 控制台（仅预留 `app_metadata.role`）
- 完整限流产品化（v4 只做 API 层简单配额钩子）
- 鸿蒙 / 小程序登录打通

---

## 2. 现状与风险（摘要）

| 现状 | 风险 |
|------|------|
| 所有 `/api/projects*` 无会话校验 | 任意访客可建项、触 generate、耗 LLM 额度 |
| `projects` 无 `owner_id` | 无法隔离租户 |
| 服务端统一 `SUPABASE_SERVICE_ROLE_KEY` | 密钥泄露 = 全库读写 |
| RLS 未启用 | 即使将来暴露 anon client 也无法自保 |

---

## 3. 认证方案（推荐）

**首版**：Supabase Auth **Email + Password** 或 **Magic Link**（二选一或并存，Magic Link 运维更轻）。

| 项 | 选择 |
|----|------|
| Provider | Supabase Auth（与现有库同项目 `dllaezdyxmoebkkwbftd`） |
| Session | `@supabase/ssr` 或 `@supabase/supabase-js` + Next.js Middleware |
| 客户端 Key | 新增 `NEXT_PUBLIC_SUPABASE_ANON_KEY`（Vercel Production） |
| 服务端 | 保留 Service Role **仅** Inngest / 后台任务 / 跨用户管理 |

**UI 最小集**：

- `/login` · `/signup`（或合并为 `/auth`）
- 未登录访问 `/projects` → 重定向登录
- 首页「开始生产」→ 未登录先登录

---

## 4. 数据模型变更

### 4.1 迁移文件（计划名）

`sql/migrations/20260526_v4_owner_id_rls.sql`（**评审通过后**再执行）

### 4.2 列变更

```sql
-- projects：所有者
alter table projects
  add column if not exists owner_id uuid references auth.users(id) on delete set null;

create index if not exists idx_projects_owner_id on projects(owner_id);

-- codegen_runs：冗余 owner 便于 RLS 子查询优化（可选，或通过 project 关联）
-- 首版仅通过 project_id → projects.owner_id 做策略，不冗余
```

### 4.3 历史数据回填

| 策略 | 说明 |
|------|------|
| **A（推荐 PoC）** | 现有行 `owner_id = null` 保留；RLS 下 **仅 service_role 可见**；新创建必须带 owner |
| **B** | 一次性脚本：将全部历史项目赋给维护者 `auth.users.id` |
| **C** | 软删除历史：公网上线前清空演示库 |

维护者拍板前默认 **策略 A**，避免误绑他人数据。

### 4.4 关联表 RLS 范围

通过 `project_id → projects.owner_id` 继承：

| 表 | 策略 |
|----|------|
| `agent_runs` | 仅 owner 的项目 |
| `usage_logs` | 同上 |
| `codegen_runs` | 同上 |
| `memories` | 已有 `user_id`；与 `project_id` 双重约束 |
| `evals` | 随 project |
| `agents` / `skills` / `tools` | **全局只读**（模板配置，无 user 维度） |

---

## 5. RLS 策略草案

> 启用：`alter table projects enable row level security;` 等  
> 角色：`authenticated` 读写自己的；`anon` 默认 **无** projects 访问

### 5.1 projects

```sql
-- SELECT：自己的项目
create policy "projects_select_own"
  on projects for select
  to authenticated
  using (owner_id = auth.uid());

-- INSERT：必须写自己为 owner
create policy "projects_insert_own"
  on projects for insert
  to authenticated
  with check (owner_id = auth.uid());

-- UPDATE / DELETE：仅 owner
create policy "projects_update_own"
  on projects for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "projects_delete_own"
  on projects for delete
  to authenticated
  using (owner_id = auth.uid());
```

### 5.2 agent_runs（示例）

```sql
create policy "agent_runs_select_own"
  on agent_runs for select
  to authenticated
  using (
    exists (
      select 1 from projects p
      where p.id = agent_runs.project_id
        and p.owner_id = auth.uid()
    )
  );
-- insert/update 同理 via project 归属
```

### 5.3 Service Role

- Inngest `executeProjectWorkflow` / codegen **继续** 用 Service Role 写库  
- **必须在业务代码**校验：`project.owner_id === event.payload.userId`（或从 DB 读 owner 比对触发者）

---

## 6. API / 应用层变更

### 6.1 会话获取

```
middleware.ts → 刷新 Supabase session cookie
lib/supabase-server.ts → createServerClient（cookie）
lib/supabase-browser.ts → createBrowserClient（anon）
```

### 6.2 路由守卫（按优先级）

| 路由 | v4 行为 |
|------|---------|
| `POST /api/projects` | 401 无 session；insert 带 `owner_id = user.id` |
| `GET /api/projects` | 仅返回 `owner_id = user.id` |
| `GET /api/projects/[id]` | 404 非 owner（避免泄露存在性） |
| `POST .../generate` | 401 + owner 校验 |
| `POST .../codegen/*` | 同上 |
| `GET /api/inngest` | 仍 Inngest Signing；与 Auth 无关 |

### 6.3 Inngest 事件 payload

```typescript
// 扩展 project/generate.requested
{
  projectId: string;
  userId: string;  // 新增：触发者 auth.users.id
}
```

函数入口：`if (project.owner_id !== userId) throw new NonRetriableError("forbidden")`

### 6.4 现有 `getSupabaseAdmin()`

- 保留于 `lib/supabase.ts`（Service Role）
- 新增 `getSupabaseForUser(jwt)` 或 server client 走 RLS 的读路径（列表/详情可逐步迁移）

---

## 7. 环境变量（v4 新增）

| 变量 | 位置 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel + `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | 仅服务端（已有） |

**禁止**把 Service Role 加 `NEXT_PUBLIC_` 前缀。

---

## 8. 限流（v4 最小钩子）

| 层级 | 做法 |
|------|------|
| API | `POST /generate` 每 user 每小时 N 次（内存或 Supabase 计数表） |
| LLM | 沿用 `usage_logs` 统计，超限 429 |
| 公网 | Vercel WAF / 可选 Cloudflare（后置） |

首版 N 建议：**10 次/小时/用户**（可 env 配置）。

---

## 9. 分阶段实施顺序

| 阶段 | 交付 | 验收 |
|------|------|------|
| **v4-1** | Auth UI + session middleware | 登录后可看 `/projects` | ✅ 2026-05-26 |
| **v4-2** | `owner_id` 迁移 + 新项写入 | 新 project 行有 owner | ✅ 2026-05-26 |
| **v4-3** | API owner 校验（仍 service role 写） | 用户 A 不能读 B 的项目 API |
| **v4-4** | 启用 RLS + anon client 读 | SQL 测试：A 不能 select B |
| **v4-5** | Inngest payload userId + 校验 | 伪造 projectId 不消费 |
| **v4-6** | 简单限流 | 刷接口 429 |

---

## 10. v4 验收清单（Agent 可跑）

- [ ] 未登录 `POST /api/projects` → **401**
- [ ] 用户 A 创建项目；用户 B `GET /api/projects/[id]` → **404**
- [ ] RLS：`set role authenticated; set request.jwt.claim.sub = '...'` 不能读他人行
- [ ] Inngest generate 带错误 userId → **失败且不写库**
- [ ] `npm run build` · 生产 Redeploy 后登录流可用

---

## 11. 开放问题（需维护者拍板）

1. 历史 `owner_id null` 项目：**策略 A/B/C**？  
2. 首版登录方式：**Magic Link** 还是 **邮箱密码**？  
3. 是否 v4 同步做 **GitHub OAuth**（Supabase Provider）？  
4. 公网是否在 v4 完成前加 **临时 Basic Auth / Vercel Deployment Protection**？

---

## 12. 相关文档

- [安全审计与清单.md](./安全审计与清单.md)  
- [v3-部署指南.md](./v3-部署指南.md)  
- [项目功能与架构交接.md](./项目功能与架构交接.md)
