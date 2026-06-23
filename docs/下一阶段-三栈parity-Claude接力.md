# 下一阶段 — 三栈 Parity（Claude 接力单）

> **创建**：2026-06-23  
> **目标**：同一 App Spec → Flutter / 微信 / 鸿蒙 在「行业能力、页面类型、数据层」上可对齐验收  
> **当前 main**：`d9694ac` — finance 模板 + dashboard emit 通过 dart analyze；三栈 industry 接线已 push  
> **勿提交**：`.env.local`、`tmp/`（本地真机样本）

---

## 一、背景（Claude 先读）

### 已完成（勿重复做）

| 项 | 状态 |
|----|------|
| 19 行业 Flutter 四层模板 + `detectIndustry` + `copyIndustryTemplate` | ✅ |
| 微信 `services/industry.js`（19 service）+ list/扩展页 `require` + `.list()` | ✅ |
| 鸿蒙 `IndustryServices.ets` + `industry.json` | ✅ |
| Flutter 行业 **list** 路由（`industry-page-ref.ts` + `dart-emit.ts`） | ✅ |
| finance 模板 + dashboard emit → **dart analyze 0 error** | ✅ `d9694ac` |
| 门禁：`verify:industry:templates` 104/104、`verify:industry:e2e` 58/58（**仅 Flutter**） | ✅ |
| 新增：`verify:industry:device`、`export:industry:device-samples` | ✅ 脚本在 main |
| 生产 Web | https://app-factory-five.vercel.app |
| Supabase 项目 | `dllaezdyxmoebkkwbftd` |

### 仍不一致（本阶段要修）

| 缺口 | Flutter | 微信 | 鸿蒙 |
|------|:-------:|:----:|:----:|
| detail/form 行业页路由 | ❌ 多走 generic | ⚠️ 部分 | ⚠️ 部分 |
| game / payment 行业真页 | ✅ | ❌ | ❌ |
| 19 行业细分 service API | ✅ 模板内 | ✅ industry.js | ❌ 仅通用 CRUD |
| E2E 三栈 | 58/58 | 无统一 E2E | 无统一 E2E |
| 真机/ analyze | finance 0 error | wcc 19/19 | 结构门禁 only |

---

## 二、任务清单（按顺序执行）

### P0 — 定义一致 + 建门禁（1～2 天）

| ID | 任务 | 产出 | 验收 |
|----|------|------|------|
| P0-1 | 更新 `docs/模板能力矩阵.md` v4（game/payment 微信鸿蒙目标态） | 文档 | 与代码一致 |
| P0-2 | 新建 `scripts/verify-industry-parity.mjs` | 对 finance / ecommerce / game 三栈生成并 diff | 输出 parity 报告 |
| P0-3 | `package.json` → `verify:industry:parity` | npm script | 本地可跑 |
| P0-4 | HANDOFF 变更记录补 v6 三栈 parity 里程碑 | 文档 | 链接本文 |

**DoD**：`npm run verify:industry:parity` 一条命令报三栈 diff。

---

### P1 — Flutter detail/form 行业路由（2～3 天）

| ID | 任务 | 关键文件 |
|----|------|----------|
| P1-1 | `industry-page-ref.ts` 扩展 detail/form 类名 | `lib/flutter-codegen/industry-page-ref.ts` |
| P1-2 | `pageWidgetRef` 接 detail/form | `lib/flutter-codegen/dart-emit.ts` |
| P1-3 | 行业已有页时跳过 generic 生成 | `lib/flutter-codegen/generate.ts` |
| P1-4 | finance + crm + ecommerce `dart analyze` 0 error | 样本 + `export:industry:device-samples` |

**DoD**：3 行业 router 引用 `*DetailPage` / `*FormPage`；analyze 0 error。

---

### P2 — 微信 parity 深化（3～4 天）

| ID | 任务 | 说明 |
|----|------|------|
| P2-1 | game / payment 页面 JS/WXML（模板或 emit） | 对齐 Flutter 真页 |
| P2-2 | detail/form emit 接 `industry-bindings`（`.get()` / `.create()`） | `emit-entity-detail.ts` 等 |
| P2-3 | `verify-industry-parity` 断言页面含 `*Service` | 19 行业快扫 |
| P2-4 | （可选）微信开发者工具 finance + game 模拟器 | E3 |

**DoD**：矩阵 game/payment 微信列 ✅；wcc 仍 19/19。

---

### P3 — 鸿蒙 parity 深化（3～5 天）

| ID | 任务 | 说明 |
|----|------|------|
| P3-1 | `emit-industry-services.ts` 生成 19 命名 service | 对齐微信 exports |
| P3-2 | 扩展页/列表 ETS 调用行业 service | `emit-extended` / pages |
| P3-3 | game / payment 行业 ETS | 对齐 Flutter |
| P3-4 | 扩展 `verify:c6:harmony` | finance spec + API 断言 |
| P3-5 | （可选）DevEco finance 样本 Run | E4 |

**DoD**：鸿蒙 service 与微信同名；结构门禁通过。

---

### P4 — 三栈 E2E 统一（2～3 天）

| ID | 任务 | 说明 |
|----|------|------|
| P4-1 | `verify-industry-e2e.mjs` 拆 flutter / wechat / harmony | 19×3 |
| P4-2 | 失败输出 parity diff | 可维护 |
| P4-3 | （可选）GHA 跑 `verify:industry:parity` | 防回归 |

**DoD**：`npm run verify:industry:e2e` 含三栈全绿（结构级）。

---

### P5 — 文档（0.5 天）

- ONE_PAGER / HANDOFF：parity ~70% → 目标 90%
- 能力矩阵 Screen Type 三列同步
- 收工记录一条

---

## 三、关键路径速查

```
lib/flutter-codegen/
  industry-page-ref.ts    ← P1 list/detail/form 路由
  dart-emit.ts            ← P1 pageWidgetRef
  generate.ts             ← P1 跳过 duplicate 生成
  emit-industry.ts        ← widgets
  emit-extended.ts        ← dashboard 等（finance 已修）

lib/wechat-codegen/
  industry-bindings.ts    ← 已有
  emit-entity-list.ts     ← 已接 list
  emit-extended.ts        ← 已接扩展页
  emit-entity-detail.ts   ← P2 detail service

lib/harmony-codegen/
  emit-industry-services.ts  ← P3 扩展 19 service
  generate.ts

templates/industry-*/     ← 19 套真模板
templates/wechat-miniprogram-minimal/services/industry.js

scripts/
  verify-industry-parity.mjs   ← P0 新建
  verify-industry-e2e.mjs      ← P4 扩展
  verify-industry-device.mjs   ← 已有
  export-industry-device-samples.mjs
```

---

## 四、验收命令（每批结束必跑）

```bash
npm test
npm run build
npm run verify:industry:templates
npm run verify:industry:e2e          # 当前仅 Flutter；P4 后应三栈
npm run verify:industry:parity       # P0 后新增
npm run verify:c3:wechat-compile
npm run verify:c6:harmony

# Flutter analyze 样本（finance 已 0 error）
npm run export:industry:device-samples
cd tmp/device-samples/flutter-finance && dart analyze
```

---

## 五、范围外（本阶段不做）

- 19 行业全部真机
- 鸿蒙 hvigor CI / 应用市场上架
- Stripe / 微信 JSAPI 支付真打通
- 重写 19 套 UI

---

## 六、维护者仍需手工

1. Supabase migration：`sql/migrations/20260616_security_compliance_agent.sql`
2. GitHub Secrets：Apple / Windows 签名（R1）
3. 微信开发者工具：开服务端口 → 模拟器/预览

---

## 七、给 Claude 的用户第一条消息（复制粘贴）

```text
你好。请先读仓库内：

1. docs/下一阶段-三栈parity-Claude接力.md（本批主任务）
2. docs/模板能力矩阵.md
3. docs/HANDOFF.md

项目：App 生产工厂
仓库：https://github.com/guiming-rgb/app-factory
本地：/Users/guiming/Desktop/app生产工厂/app-factory
当前 main：d9694ac

本批认领：三栈 Parity（P0 → P1 → P2 → P3 → P4，按顺序；可先做 P0+P1）

目标：同一 App Spec 下 Flutter / 微信 / 鸿蒙 行业能力对齐，并建 verify:industry:parity 门禁。

不要改动：.env.local、tmp/、勿 force push main。

请先列出将改动的文件路径，再从 P0-2 新建 verify-industry-parity.mjs 和 P1-1 industry-page-ref detail/form 开始。
每批结束跑：npm test && npm run verify:industry:templates && npm run verify:c3:wechat-compile
```

---

## 八、给 Claude Project Instructions 摘要（可选）

```text
你是 App 生产工厂维护 Agent。当前阶段：三栈 Parity（Flutter/微信/鸿蒙 行业一致）。
已完成的不要重做：19 行业 Flutter 模板、微信 industry.js 接线、鸿蒙 IndustryServices、Flutter list 路由、finance dart analyze 0 error。
优先：P0 verify-industry-parity 门禁 → P1 Flutter detail/form 路由 → P2 微信 game/payment → P3 鸿蒙 19 service → P4 三栈 E2E。
事实源：docs/下一阶段-三栈parity-Claude接力.md。勿提交密钥与 tmp/。
```
