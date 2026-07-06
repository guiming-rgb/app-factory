# App 生产工厂 — 架构决策日志 (ADR)

> 格式：**决策 · 原因 · 后果 · 日期**  
> 重要决策后追加；Claude 改架构前先查是否已有定论。

---

## ADR-001 · App Spec IR 作为三栈唯一输入

- **决策**：Flutter / 微信 / 鸿蒙 均从同一 App Spec JSON 生成，不各写一套描述语言。
- **原因**：parity、模板矩阵、Report→Spec 流水线可统一验收。
- **后果**：改 Spec schema 必须同步 AJV + 三栈 emit + 文档。
- **日期**：2026-05（v2a/v2b）

---

## ADR-002 · 工厂不上架，成品 App 分阶段上架

- **决策**：App 生产工厂 Web 不做应用商店上架；生成物走 R1 签名/提审。
- **原因**：控制范围；工厂是平台不是 SKU。
- **后果**：R1 路线图独立；GHA 条件签名。
- **日期**：2026-06-05

---

## ADR-003 · Supabase 单项目真源

- **决策**：工厂只用 `dllaezdyxmoebkkwbftd`，codegen 注入同一 anon/url。
- **原因**：避免双项目混淆导致 RLS/Storage 错配。
- **后果**：文档与脚本硬编码检查此 ID。
- **日期**：2026-05-22

---

## ADR-004 · 本地 3001 + INNGEST_DEV=1

- **决策**：开发/验收默认 `localhost:3001`；Inngest 本地 dev 必开。
- **原因**：3000 被占用；未开 Inngest 导致 codegen 异步链失败。
- **后果**：所有文档与规则统一写 3001。
- **日期**：2026-05-19

---

## ADR-005 · 三栈 Parity 分「脚手架」与「深度」两阶段

- **决策**：P0–P5 完成脚手架 parity（路由 + service 接线 + 动态门禁）；深度 parity（差异化 API、全量 analyze/wcc）单独排期。
- **原因**：避免宣称过度；Claude 接力单可验收。
- **后果**：矩阵标注 ✅ 脚手架 vs ✅ 真模板。
- **日期**：2026-06-25

---

## ADR-006 · BaseCodegenExecutor 模板方法

- **决策**：Flutter/WeChat/Harmony 执行器继承 `BaseCodegenExecutor`，共享 validate → generate → gate → zip 管线。
- **原因**：消除三份重复 orchestration。
- **后果**：改基类影响面大，必须 `npm test` + `verify:codegen:*`。
- **日期**：2026-06-25

---

## ADR-007 · Mustache 行业 Widget 模板层

- **决策**：Flutter 行业 Widget 逐步从 `emit-industry.ts` 大字符串迁到 `templates/flutter-minimal/.../*.mustache`。
- **原因**：19 行业 Widget 维护性；linter 友好。
- **后果**：`getIndustryWidgetsDart` 需与 Mustache 渲染管线对齐。
- **日期**：2026-06-25（Q2-M1/M2）

---

## 待决 / 开放

| 议题 | 选项 | 状态 |
|------|------|------|
| parity CI 上 GHA | 每 PR 跑 `verify:industry:parity` | 待做 |
| 19 行业 dart analyze CI | Docker + Flutter SDK | 待做 |
| 鸿蒙 service 差异化 | 配置表 emit vs 手写 ETS 片段 | 进行中 |

---

## 关联 Memory

- [[app-factory-comprehensive-understanding]] — 架构/管道全维度理解（Claude 会话 memory）
- [[app-factory-quality-assessment]] — 全面质量评判（Claude 会话 memory）
- [[docs/memory/code-review-checklist]] — CR 清单
- [[docs/memory/app-factory-tech-stack]] — 技术栈与踩坑
