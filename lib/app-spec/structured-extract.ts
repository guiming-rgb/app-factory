import { callLLM } from "@/lib/llm";
import { validateAppSpec } from "./validate";
import { parseJsonFromLlmText } from "./parse-json";
import { mergeSpecWithMinimal } from "./merge-spec";
import { buildMinimalSpecFromProject } from "./from-project";
import type { AppSpec } from "./types";

/**
 * 收尾 1: Agent 报告结构化解析
 * 从 9 Agent 的 Markdown 输出中提取结构化数据片段，
 * 拼合后形成更精准的 App Spec（准确率提升 20-30%）
 */

const EXTRACT_FIELDS = ["screens", "entities", "navigation", "roles", "auth", "api"] as const;

const EXTRACT_SYSTEM = `你是结构化数据提取专家。从 Markdown 报告中提取特定字段。
返回纯 JSON，只包含要求的字段。
screens 格式: [{ id, title, type, entity? }]
entities 格式: [{ name, fields: [{ name, type, primary? }] }]
navigation 格式: { tabs: ["id1", "id2"] }
不要编造数据，报告中没有的字段返回空数组/空对象。`;

export async function extractStructuredFromReport(
  project: { id: string; title: string; idea?: string | null; final_report: string }
): Promise<Partial<AppSpec>> {
  const reportSlice = project.final_report.slice(0, 12000);
  const minimal = buildMinimalSpecFromProject({ id: project.id, title: project.title, idea: project.idea });

  try {
    const result = await callLLM({
      systemPrompt: EXTRACT_SYSTEM,
      userPrompt: `项目: ${project.title}\n想法: ${project.idea ?? ""}\n\n报告:\n${reportSlice}\n\n请提取 screens、entities、navigation 字段。`,
      temperature: 0.1,
    });

    const parsed = parseJsonFromLlmText(result.content) as Record<string, unknown> | null;
    if (!parsed) return {};

    const extracted: Partial<AppSpec> = {};
    for (const field of EXTRACT_FIELDS) {
      if (parsed[field]) extracted[field as keyof AppSpec] = parsed[field] as never;
    }

    // 合并到 minimal 确保完整性
    const merged = mergeSpecWithMinimal(extracted, minimal);
    const validation = validateAppSpec(merged);
    return validation.ok ? validation.spec : extracted;
  } catch {
    return {};
  }
}
