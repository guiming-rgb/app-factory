# HANDOFF — App 生产工厂接力单

> **最后更新**：2026-05-20  
> **配套**：[ONE_PAGER.md](./ONE_PAGER.md) · [CONTINUOUS_DELIVERY_OUTLINE.md](./CONTINUOUS_DELIVERY_OUTLINE.md) · [执行计划.md](./执行计划.md)

## 当前进度（勾选）

- [x] MVP v1 / v1.1 功能与文档基线
- [x] MVP v1.2 代码侧：Inngest 异步 + 文档（README、`INNGEST_DEV`、收工备忘）
- [x] 路线图：小程序必选；里程碑 MVP v2 / v2a / v2b + 虚拟汇总行
- [x] TCM 连续性资产：`.cursor/rules/tcm-continuity.mdc`、本 HANDOFF、`CONTINUOUS_DELIVERY_OUTLINE`、`SESSION_START_TEMPLATE`、`ONE_PAGER`
- [x] **验收 A**：真机双进程 + 完整生成 + 产品/库侧确认（见 [验收记录.md](./验收记录.md)；样本项目见下）
- [x] `feature/v1.2-inngest` 合并 `main`（2026-05-19；见 [合并main-议事记录.md](./合并main-议事记录.md)）
- [x] MVP v1.3 可观测与成本（`usage_logs` 8/8；样本 `833ad678-f204-40d7-a47c-5b76e803f64f`；检验 `npm run verify:v13`）
- [x] **v2a 实现-3**：Generator PoC（`codegen:flutter` / `export-flutter` / G6）

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

1. **v2b 实现-1**：`templates/wechat-miniprogram-minimal/`（见 [v2b-调研报告.md](./v2b-调研报告.md)）。
2. **v2a 增强**（可选）：报告→Spec Agent、Inngest `codegen_runs`、完整 `flutter build` 门禁。
3. 安全中期（Auth/RLS 草案）或 v2.1 沙箱。

## 阻塞 / 风险（简）

- **Inngest 未开** → `后台任务投递失败：fetch failed`；须保持 **终端 B** 运行。
- **详情页缓存**（已修）：生产模式曾缓存旧 `pending`；已对项目页/API 加 `force-dynamic`（见 2026-05-19 提交）。
- 联调：`PUT /api/inngest` 500 时查 **`INNGEST_DEV=1`**。

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-05-20 | **v2a 实现-3**：Generator PoC + `export-flutter` API + `npm run codegen:flutter` / `verify:codegen`（见 [v2a-实现-3-Generator-PoC.md](./v2a-实现-3-Generator-PoC.md)） |
| 2026-05-20 | **v2a 实现-1/2**：`templates/flutter-minimal` + `npm run validate:spec`；**v2b 线 B 调研** |
| 2026-05-20 | **v2a 线 A 调研完成**（App Spec Schema 草案 + Flutter 目录结构 + 能力矩阵） |
| 2026-05-20 | **章程**：命令组 G0～G5 批量执行（开发纲要 §二点六、[命令组-联调与验收.md](./命令组-联调与验收.md)） |
| 2026-05-20 | **章程**：验收执行 Agent 终端优先（开发纲要 §二点五、TCM §0、Cursor 规则 §五） |
| 2026-05-20 | **验收 B（v1.3）通过**；排查记录见 [验收B-v1.3-问题与结论记录.md](./验收B-v1.3-问题与结论记录.md)；检验 `npm run verify:v13` |
| 2026-05-19 | **`feature/v1.2-inngest` 合并 `main`**（fast-forward）；`mvp-v1.2` 标签；议事记录落盘 |
| 2026-05-19 | **验收 A 通过**；HANDOFF/验收记录/执行计划/TCM 大纲/简报同步；样本：海洋生态 + 踢足球 |
| 2026-05-14 | 初版 HANDOFF；与 TCM 大纲同日建立 |
