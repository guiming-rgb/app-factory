# HANDOFF — App 生产工厂接力单

> **最后更新**：2026-05-14  
> **配套**：[ONE_PAGER.md](./ONE_PAGER.md) · [CONTINUOUS_DELIVERY_OUTLINE.md](./CONTINUOUS_DELIVERY_OUTLINE.md) · [执行计划.md](./执行计划.md)

## 当前进度（勾选）

- [x] MVP v1 / v1.1 功能与文档基线
- [x] MVP v1.2 代码侧：Inngest 异步 + 文档（README、`INNGEST_DEV`、收工备忘）
- [x] 路线图：小程序必选；里程碑 MVP v2 / v2a / v2b + 虚拟汇总行
- [x] TCM 连续性资产：`.cursor/rules/tcm-continuity.mdc`、本 HANDOFF、`CONTINUOUS_DELIVERY_OUTLINE`、`SESSION_START_TEMPLATE`、`ONE_PAGER`
- [ ] **验收 A**：双进程 + 一次完整生成 + Supabase / 产品侧验收（见 [执行计划.md](./执行计划.md) §二备忘 §4）
- [ ] `feature/v1.2-inngest` 合并 `main` 议事（验收 A 通过后）
- [ ] MVP v1.3 可观测与成本

## 待办列表（执行顺序建议）

1. 跑通验收 A → 更新本 HANDOFF 勾选 + [执行计划.md](./执行计划.md) 第二节。
2. 每阶段收工：§5 清单 + `git commit`（`收工` / `chore(收工)`）。
3. 重大决策：单页文档 + 链到 `CONTINUOUS_DELIVERY_OUTLINE` §3。

## 阻塞 / 风险（简）

- 无登记阻塞；Inngest 见 `PUT /api/inngest` 500 时先查 **`INNGEST_DEV=1`**。

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-05-14 | 初版 HANDOFF；与 TCM 大纲同日建立 |
