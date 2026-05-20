# v2a 增强 — 报告 → App Spec

> **状态**：PoC（2026-05-20）

## 能力

| 项 | 说明 |
|----|------|
| 抽取 | `lib/app-spec/from-report.ts`：LLM 读 `final_report` → JSON → Validator |
| 回退 | 失败或无报告 → `buildMinimalSpecFromProject`（标题启发式） |
| API | `GET /api/projects/[id]/spec`（`?source=title` 强制启发式） |
| 导出 | `export-flutter` / `export-wechat` **默认**走 `buildSpecForProject` |
| CLI | `npm run extract:spec -- <projectId>` |

## 维护者

- **无需手测**；Agent 跑 `extract:spec` 或 `curl` spec API（需 `.env` + 已完成项目有 `final_report`）。
- **仅当**无 `OPENAI_API_KEY` 或项目无报告时，自动回退启发式。

## 示例

```bash
npm run extract:spec -- 833ad678-f204-40d7-a47c-5b76e803f64f
curl -s "http://localhost:3001/api/projects/<id>/spec" | head
```
