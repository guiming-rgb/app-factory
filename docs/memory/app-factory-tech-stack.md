# App 生产工厂 — 技术栈与踩坑记录

> **用途**：环境、版本、常见故障；Claude 开工前扫一眼。  
> **路径真源**：[产品路径一览.md](../产品路径一览.md) · [运行环境与真机调试-重启备忘.md](../运行环境与真机调试-重启备忘.md)

---

## 技术栈速查

| 层 | 选型 |
|----|------|
| Web | Next.js 14 App Router · Tailwind |
| DB/Auth | Supabase `dllaezdyxmoebkkwbftd` |
| LLM | DeepSeek（OpenAI 兼容 API） |
| 队列 | Inngest（本地 8288 Dev UI） |
| 单测 | Vitest（160+ cases，随版本增长） |
| E2E | Playwright |
| 生成 | Flutter 3.x · 微信 wcc/wcsc · 鸿蒙 ArkTS |
| 部署 | Vercel · https://app-factory-five.vercel.app |
| 文档站 | VitePress `docs-site/` |

---

## 本地环境

```bash
cd "/Users/guiming/Desktop/app生产工厂/app-factory"
npm run dev:codegen:3001    # → http://localhost:3001 + Inngest 8288
```

| 变量 | 值 / 说明 |
|------|-----------|
| `INNGEST_DEV` | **1**（必） |
| `V3_HTTP_PROXY` | `http://127.0.0.1:7897`（生产探针/git push） |
| Flutter SDK | `~/flutter-sdk` 3.44.x stable（本机） |
| 微信 CLI | 需 GUI 开服务；`verify:c3:wechat-compile` 可用 |

---

## 门禁命令（常用）

```bash
npm run build && npm test
npm run verify:industry:parity
npm run verify:industry:e2e
npm run verify:c3:wechat-compile
npm run verify:c6:harmony
npm run verify:p:desktop:flutter
```

---

## 踩坑记录

### Flutter

- **startup lock**：多进程同时 `flutter pub get` / precache 会互锁；集成测试可假超时数小时。
- **dart analyze**：必须先 `flutter pub get`，否则误报海量 error。
- **analyze 退出码 2**：可能只有 info/warning，区分 `error` 行数。

### Codegen / Git

- **勿 commit tmp/**：样本用 `npm run export:industry:device-samples` 本地导出即可。
- **8938ca9 教训**：整包 tmp 进 main 后需 `047d475` 清理。

### Inngest / 网络

- `PUT /api/inngest` 500 → 查 `INNGEST_DEV=1` 与终端 B 是否运行。
- 生产验证需 `V3_HTTP_PROXY` 或维护者网络。

### Parity

- 静态 `includes()` 门禁易「假绿」；必须保留 **19 行业 × 三栈动态生成**。
- 微信 wcc **已有** C3 门禁，但未对 19 行业生成物逐个编译。

### 战略（勿忘）

- 工厂 Web **不上架**；生成 App **R1 分阶段上架**。
- 当前 parity 脚手架 ~90%；商店就绪 ~25–30%（签名/提审待做）。

---

## 更新日志

| 日期 | 变更 |
|------|------|
| 2026-06-25 | 初版：合并路径/环境/parity 踩坑 |
| 2026-06-25 | Q2-M2：Mustache Widget · 373 tests 世代（见 main 后续 commit） |

---

## 关联 Memory

- [[docs/memory/architecture-decisions]] — 架构决策日志（ADR）
- [[docs/memory/code-review-checklist]] — CR 清单
- [[app-factory-comprehensive-understanding]] — 架构/管道全维度理解（Claude 会话 memory）
- [[app-factory-quality-assessment]] — 全面质量评判（Claude 会话 memory）
