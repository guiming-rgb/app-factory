# 验收 B（MVP v1.3）— 问题排查与结论记录

> **检验命令**：`npm run verify:v13`（见 [验收B-最简单检验法.md](./验收B-最简单检验法.md)）  
> **迁移 SQL**：`sql/migrations/20260519_usage_logs.sql`  
> **功能说明**：[MVP-v1.3-usage_logs.md](./MVP-v1.3-usage_logs.md)

---

## 一、元信息

| 字段 | 内容 |
|------|------|
| **验收日期** | 2026-05-20（终端 `verify:v13` 通过） |
| **结论** | **v1.3 通过**（`usage_logs` 8/8） |
| **样本项目** | 少儿踢足球 · `833ad678-f204-40d7-a47c-5b76e803f64f` |
| **程序连接的 Supabase** | `dllaezdyxmoebkkwbftd.supabase.co`（以 `.env.local` 为准） |
| **本机端口** | `http://localhost:3001`；`npm run inngest:dev:3001` |
| **合并主线** | `main`（含 v1.2 + v1.3 代码） |

---

## 二、总结论（给后续接力）

| 问题 | 答案 |
|------|------|
| 是用户操作问题还是程序 bug？ | **主要是操作与环境未对齐**；核心流程无逻辑性损坏。 |
| v1.3 是什么？ | **不是**首页/报告上的版本号，而是 **`usage_logs` 表每个项目 8 行 `llm_call`**。 |
| 怎么验收？ | **`npm run verify:v13`** 出现 ✅；或 Supabase `usage_logs` 筛 `project_id` 有 8 行。 |
| 为何页面一直看不到「v1.3」？ | 旧 build、库项目不一致、或未重新生成；**以 `verify:v13` 为准**。 |

---

## 三、必须同时满足的「四件事」（缺一则 0 行）

```text
① .env.local 指向的 Supabase 项目里，已执行 usage_logs 迁移（有 usage_logs 表）
② npm run build 后再 npm run start -- -p 3001（新代码才会写入用量）
③ 终端 B：npm run inngest:dev:3001（与 3001 对齐）
④ 对已完成项目点一次「重新生成报告」，等 8/8 完成
```

**检验：**

```bash
cd app-factory
npm run verify:v13
# 或指定 ID：
npm run verify:v13 -- <projects.id>
```

---

## 四、排查过程摘要（操作类问题）

| 现象 | 原因 | 处理 |
|------|------|------|
| 浏览器打开 `https://xxx.supabase.co` 显示 JSON 报错 | API 地址不能当网页打开 | 用 **dashboard.supabase.com** + Table Editor / SQL Editor |
| SQL 报错 `relation "projects" does not exist` | 在**错的** Supabase 项目里跑迁移 | 与 `.env` 里 URL 的 **Reference ID** 对齐后再跑 `schema.sql` / 迁移 |
| 在 **guiming-rgb** 建表，程序连 **dllaezdy** | 两个 Supabase 项目混用 | 在 **dllaezdy**（与 `.env` 一致）执行 `20260519_usage_logs.sql` |
| `usage_logs` 一直 0，项目却 completed | 未 **build** 或旧 `start` | `npm run build` → 重启 3001 → 重新生成 |
| 命令 `pm run build` | 拼写错误 | 应为 **`npm run build`** |
| `/api/.../usage` 返回 404 | 旧构建无该路由 | **build + 重启** 后再访问 |
| 详情页无灰块、无黄条 | 同上，旧前端 | build 后详情页应有「当前构建：v1.2 + v1.3 用量」 |
| 项目不存在 | URL 里 **项目 ID 手敲错误** | 从 **历史项目** 点标题进入 |
| `fetch failed` / `Failed to register` | **Inngest 未开** 或端口不对 | 只保留一个 `inngest:dev:3001` |
| 连开两个 Inngest | 端口 8288/8290 冲突 | 关掉旧的，只留一个 B 终端 |
| 在首页/报告找「v1.3」 | 误解验收项 | 首页 **v1.2**、报告 **MVP v1** 文案 ≠ v1.3 数据验收 |

---

## 五、程序侧说明（非主因，已知晓）

| 项 | 说明 | 状态 |
|----|------|------|
| 用量写入失败 | `insertUsageLog` 失败仅 `console.warn`，页面仍可 8/8 | 已知；用 `verify:v13` 兜底 |
| 报告页脚「MVP v1」 | 旧 `lib/markdown.ts` 文案 | 已改为 v1.2 说明；**重新生成**后报告才更新 |
| `/usage` 自检接口 | 需新 build 才有 | 已提供；可选，不以网页为准 |

**验证依据**：同一项目在终端触发重新生成后，`verify:v13` 从 **0 → 1 → 5 → 8**，说明 **workflow + 写库逻辑正常**。

---

## 六、最终验证结果（可复制执行）

```bash
cd "/Users/guiming/Desktop/app生产工厂/app-factory"
npm run verify:v13 -- 833ad678-f204-40d7-a47c-5b76e803f64f
```

**通过输出示例：**

```text
usage_logs 行数（llm_call）：8 / 期望 8
✅ v1.3 通过：数据库里已有用量记录。
```

**Supabase 核对（可选）：**

```sql
select count(*) from usage_logs
where project_id = '833ad678-f204-40d7-a47c-5b76e803f64f'
  and event_type = 'llm_call';
-- 期望：8
```

---

## 七、日常最少操作备忘

| 角色 | 做法 |
|------|------|
| **AI Agent（默认）** | `build`、启停 3001 + Inngest、`curl` 触发生成、**`npm run verify:v13`**、更新验收记录 |
| **维护者（万不得已）** | `.env.local` 密钥、Supabase Dashboard **首次** SQL、可选 UI 看一眼 |
| 建表 | 只在 **`.env.local` 里那个 Supabase 项目** 的 SQL Editor 执行迁移 |
| 勿用 | 浏览器直接打开 `*.supabase.co` 根地址；勿仅以详情页找「v1.3」为唯一验收 |

**章程全文**：[开发纲要.md](./开发纲要.md) §二点五、[CONTINUOUS_DELIVERY_OUTLINE.md](./CONTINUOUS_DELIVERY_OUTLINE.md) §0。

---

## 八、相关文档

- [验收B-最简单检验法.md](./验收B-最简单检验法.md)
- [验收B-v1.3-逐步操作指南.md](./验收B-v1.3-逐步操作指南.md)
- [HANDOFF.md](./HANDOFF.md)
- [合并main-议事记录.md](./合并main-议事记录.md)

---

## 九、变更记录

| 日期 | 记录 |
|------|------|
| 2026-05-20 | 初版：操作 vs 程序结论、四件事、样本 833ad678、verify:v13 通过 |
