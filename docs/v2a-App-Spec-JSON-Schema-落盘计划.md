# v2a — App Spec JSON Schema 落盘计划

> **状态**：计划已定；**`docs/schemas/app-spec-v0.1.schema.json`** 为草案，**未**接入主业务流程。  
> **上位**：[App-Spec-v0.1-草案.md](./App-Spec-v0.1-草案.md) · [v2a-调研报告.md](./v2a-调研报告.md)

---

## 一、落盘路径（真源）

| 路径 | 说明 |
|------|------|
| `docs/App-Spec-v0.1-草案.md` | 人类可读字段说明 + 示例 JSON |
| `docs/schemas/app-spec-v0.1.schema.json` | 机器校验（JSON Schema draft 2020-12） |
| `docs/schemas/README.md` | 版本、校验命令、与 Validator 关系 |
| `docs/schemas/examples/` | （建议下一实现步）`valid-minimal.json`、`invalid-missing-version.json` |

**刻意不放** `packages/` 直到 monorepo 立项；首版 Validator 可用 `node scripts/validate-app-spec.mjs`（**未实现**，仅规划）。

---

## 二、版本策略

| 层级 | 规则 |
|------|------|
| `specVersion`（文档内） | SemVer 字符串，如 `0.1.0` |
| Schema 文件名 | `app-spec-v0.1.schema.json` 对应 **0.1.x** 文档 |
| 破坏性变更 | 新文件 `app-spec-v0.2.schema.json`，旧版 Validator 仍可读旧 Spec |
| 与 Flutter 模板 | `metadata.flutterTemplateVersion`（规划字段）锁定模板 Git tag |

---

## 三、校验流程（目标形态）

```text
Spec JSON
   → ① JSON 语法 parse
   → ② JSON Schema validate（ajv 或 @cfworker/json-schema）
   → ③ 模板能力矩阵校验（自定义 rules，超出 → limitations 必填）
   → ④ 可选：与 sourceProjectId 对应 projects.final_report 一致性抽检
```

**v2a PoC 只做 ①②**；③ 在 Generator 前必做。

---

## 四、Schema 草案范围（v0.1 首版）

当前 `app-spec-v0.1.schema.json` **必填**：

- `specVersion`、`appName`、`displayName`
- `targets`（含 `flutter.enabled`、`backend.provider`）
- `screens`（数组，至少 1 项）
- `limitations`（数组）

**故意放宽**（避免首版阻塞）：`entities` 详细字段、`api` 全文、鸿蒙段。

---

## 五、与数据库的关系（仅规划，本阶段不改表）

| 表（未来评审） | 字段草案 |
|----------------|----------|
| `app_specs` | `id`, `project_id`, `spec_version`, `spec_json`, `validation_errors`, `created_at` |
| `codegen_runs` | `id`, `project_id`, `target`(`flutter`), `status`, `artifact_url`, `log` |

**本调研不修改** `sql/schema.sql`；立项时单独 PR + 迁移。

---

## 六、与 Inngest 事件（规划）

| 事件名 | 触发 | 执行 |
|--------|------|------|
| `project/spec.validate.requested` | 上传/保存 Spec | Validator only |
| `project/codegen.flutter.requested` | 用户点「生成 Flutter」 | Generator + ZIP |

与现有 `project/generate.requested` **并列**，不合并为一步（避免方案未就绪就 codegen）。

---

## 七、验收（文档阶段）

- [x] 落盘路径写清  
- [x] Schema 草案文件存在且可 `ajv validate`（下一实现步自动化）  
- [ ] `schemas/examples/*.json` 样例（实现步）  
- [ ] `npm run validate:spec` 脚本（实现步）

---

## 八、变更记录

| 日期 | 说明 |
|------|------|
| 2026-05-20 | 初版落盘计划 + schema 草案文件 |
