# MVP v2a 调研报告（线 A · 文档交付）

> **日期**：2026-05-20  
> **状态**：调研完成（文档），**未**实现 Generator / 未改 `sql/schema.sql`  
> **批次**：TCM `Batch-2026-05-20-post-v1.3` · 并行线 **A**

---

## 一、v2a 要做什么（一句话）

在 **App Spec IR v0.1** 驱动下，从现有「8 Agent 方案流水线」**并行延伸**出 **Flutter 可安装客户端工程** 的生成能力；首版以 **固定最小模板 + 文件树生成 + ZIP 下载** 为验收，不要求鸿蒙/小程序（v2b 独立）。

---

## 二、与当前仓库的关系

| 已有（不动主链路） | v2a 新增（规划） |
|-------------------|------------------|
| `projects` + 8 Agent → Markdown 报告 | 可选 `sourceProjectId` 关联同一 `projects.id` |
| Inngest `project/generate.requested` | 新事件 **`project/codegen.flutter.requested`**（规划，未实现） |
| `usage_logs` / v1.3 可观测 |  codegen 步骤同样记入 `usage_logs`（后续） |
| 用户下载 Markdown 报告 | 用户下载 **Flutter ZIP** |

**原则**：Spec 校验与代码生成 **不替换** 现有 generate；用户可先拿方案，再点「生成 Flutter 工程」（产品交互后续设计）。

---

## 三、调研产出（本线 A 文档清单）

| 文档 | 用途 |
|------|------|
| [v2a-App-Spec-JSON-Schema-落盘计划.md](./v2a-App-Spec-JSON-Schema-落盘计划.md) | Schema 文件路径、校验流程、版本策略 |
| [App-Spec-v0.1-草案.md](./App-Spec-v0.1-草案.md) | IR 字段真源（已存在，已链入 v2a） |
| [docs/schemas/app-spec-v0.1.schema.json](../schemas/app-spec-v0.1.schema.json) | JSON Schema **草案**（校验 PoC，非生产强依赖） |
| [docs/schemas/README.md](../schemas/README.md) | Schema 目录说明 |
| [v2a-Flutter-最小模板-目录结构.md](./v2a-Flutter-最小模板-目录结构.md) | 模板仓库目录树与模块职责 |
| [模板能力矩阵.md](./模板能力矩阵.md) | Flutter 首版支持/不支持对照 |
| [多平台App生产工厂路线图.md](./多平台App生产工厂路线图.md) | 总路线（已存在） |

---

## 四、建议实施顺序（v2a 代码阶段，供下一批立项）

| 步 | 交付 | 验收（Agent 终端优先） |
|----|------|------------------------|
| 1 | Spec Validator CLI/API（读 JSON + Schema） | ✅ `npm run validate:spec` + 正反样例 |
| 2 | 固化 `templates/flutter-minimal/` 模板仓库 | ✅ `dart analyze` 无 issue + `flutter test` 通过 |
| 3 | Generator：Spec → 渲染 `lib/`、`pubspec` 片段 | 输出目录树符合 [目录结构文档](./v2a-Flutter-最小模板-目录结构.md) |
| 4 | 产物 ZIP + `GET /api/projects/[id]/export-flutter`（规划） | 解压后本地 build 通过（约定 Flutter 版本） |
| 5 | Inngest 长任务 + `codegen_runs` 表（**须单独立项评审** `sql/schema.sql`） | 与 v1.3 类似可观测 |

**本调研不包含步 2～5 的代码实现**，仅冻结文档与目录约定。

---

## 五、v2a 最小验收标准（里程碑对齐）

引用 [执行计划.md](./执行计划.md)「MVP v2a」：

1. 输入：一份通过 Validator 的 **App Spec v0.1** JSON（可由 Agent 从 `final_report` 抽取，或人工编辑）。  
2. 输出：ZIP 内 Flutter 工程。  
3. 本地（约定环境，见模板文档）：

```bash
unzip app.zip && cd <app_dir>
flutter pub get
dart analyze
# 首版可选不强制 flutter build apk（耗时），analyze 通过即可算 PoC 过关；正式验收再加 build
```

4. **不依赖** 维护者手点工厂详情页；验收用 **命令组**（后续可增 `G6` codegen 门禁）。

---

## 六、风险与边界

| 风险 | 缓解 |
|------|------|
| Spec 与 8-Agent 报告结构不一致 | 首版 Generator 只吃 **结构化 Spec**，报告→Spec 单独 Agent/步骤 |
| Flutter 版本漂移 | 模板锁定 `sdk` / `flutter` 约束写在模板 `pubspec` |
| 生成代码不可编译 | v2.1 沙箱 + 有限自动修；首版接受「analyze 过即可」 |
| 与 v2b 小程序字段耦合 | Spec 根级 `targets.flutter` / 未来 `targets.wechatMiniProgram` **分字段**，互不强依赖 |

---

## 七、下一批建议（维护者口头即可）

- **「立项 v2a-实现-1：模板仓库」** — 在 `templates/flutter-minimal/` 落真实 Flutter 骨架  
- **「立项 v2a-实现-2：Validator + Generator PoC」** — 只生成 1 个 Tab + 1 个 List 屏  
- 或 **「先做 v2b 调研」** — 小程序模板矩阵（线 A 并行的另一条）

---

## 八、变更记录

| 日期 | 说明 |
|------|------|
| 2026-05-20 | 线 A 调研报告初版；配套 Schema 草案 + Flutter 目录结构 + 能力矩阵 |
