# v2a 增强 — 报告 → App Spec

> **状态**：C1 收紧 ✅（2026-05-22）· 验收 `npm run verify:c1:report-to-spec`

## 能力

| 项 | 说明 |
|----|------|
| 抽取 | `lib/app-spec/from-report.ts`：LLM 读 `final_report` → JSON → Validator（最多 4 次 AJV 重试） |
| Prompt | `lib/app-spec/prompts/report-to-spec.ts`（禁止 id 误填为 type） |
| 归一化 | `normalize-screens.ts` / `normalize-navigation.ts`：修正 LLM 常见 screen.type、tabs 错误 |
| 校验修复 | `lib/app-spec/format-validation-errors.ts`：AJV 错误 → LLM 修复提示 |
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
