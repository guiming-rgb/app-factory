# v2a-实现-3 — Generator PoC（Spec → Flutter → ZIP）

> **状态**：已实现（2026-05-20）  
> **上位**：[v2a-调研报告.md](./v2a-调研报告.md) §四 步骤 3～4

## 能力范围

| 项 | 说明 |
|----|------|
| 输入 | 通过 Validator 的 **App Spec v0.1** JSON |
| 模板 | `templates/flutter-minimal/` 复制并补丁 |
| 生成 | `pubspec` 名/描述、`app.dart` 标题、列表页标题、`app_router.dart`（按 `navigation.tabs`）、额外 Tab 的 `lib/generated/pages/*` |
| 产物 | ZIP；根目录含 `app_spec.json`、`LIMITATIONS.md` |
| API | `GET /api/projects/[id]/export-flutter`（从项目标题生成最小 Spec）；`POST` + `body.spec` 传入完整 Spec |
| CLI | `npm run codegen:flutter` / `npm run verify:codegen` |

**未做**（后续里程碑）：Inngest 长任务、`codegen_runs` 表、报告→Spec Agent、`sql/schema.sql` 变更。

## 命令组 G6 — codegen 门禁（5 条）

```bash
cd "/Users/guiming/Desktop/app生产工厂/app-factory"
npm run validate:spec:examples
npm run codegen:flutter -- --spec docs/schemas/examples/valid-minimal.json --out /tmp/app-factory-codegen-verify --verify
test -f /tmp/app-factory-codegen-verify/kids_soccer-flutter.zip || test -f /tmp/kids_soccer-flutter.zip
ls -la /tmp/app-factory-codegen-verify 2>/dev/null | head -5
echo "G6 完成（若 --verify 失败请安装 Flutter SDK）"
```

快捷：`npm run verify:codegen`（= validate + codegen + dart analyze）。

## 本地解压验收

```bash
unzip -o /tmp/kids_soccer-flutter.zip -d /tmp/flutter-unzip
cd /tmp/flutter-unzip/kids_soccer   # 目录名 = appName
dart analyze
```

PoC 过关标准：**`dart analyze` 无 issue**（与调研报告一致；`flutter build` 首版不强制）。

## 维护者

- **默认**：对 Agent 说「跑 **G6**」或 `npm run verify:codegen`。
- **可选 UI**：项目详情页「下载 Flutter 工程（ZIP）」。
- **无需**改 `sql/schema.sql`。
