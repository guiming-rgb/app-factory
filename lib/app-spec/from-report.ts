import { callLLM } from "@/lib/llm";

import { buildMinimalSpecFromProject } from "./from-project";
import { parseJsonFromLlmText } from "./parse-json";
import type { AppSpec } from "./types";
import { validateAppSpec } from "./validate";

const REPORT_SPEC_SYSTEM = `你是 App 生产工厂的 App Spec 抽取器。根据「8-Agent 方案报告」输出**唯一**一个 JSON 对象，必须符合 App Spec v0.1。

硬性要求：
- specVersion 固定 "0.1.0"
- appName：小写英文+下划线，2～48 字符，以字母开头
- displayName：中文或英文产品名
- targets.flutter.enabled 默认 true；platforms 含 ios、android；backend.provider 默认 supabase
- targets.wechatMiniProgram.enabled 若报告提到小程序则为 true
- screens：至少 3 个（含 tabRoot、list、profile 占位）；screen.id 匹配 ^[a-z][a-z0-9_]*$
- navigation.tabs：与 Tab 页面对应的 screen id 数组
- limitations：数组，列出报告中的范围限制（不少于 1 条）
- 不要输出 markdown，不要解释，只输出 JSON`;

export type SpecBuildSource = "report-llm" | "title-heuristic";

export type SpecBuildResult = {
  spec: AppSpec;
  source: SpecBuildSource;
  warning?: string;
};

export async function extractSpecFromReport(project: {
  id: string;
  title: string;
  idea?: string | null;
  final_report: string;
}): Promise<SpecBuildResult> {
  const reportSlice = project.final_report.slice(0, 14000);
  const { content } = await callLLM({
    systemPrompt: REPORT_SPEC_SYSTEM,
    userPrompt: [
      `项目标题：${project.title}`,
      `原始想法：${project.idea ?? "（无）"}`,
      `项目 ID：${project.id}`,
      "",
      "=== 方案报告（节选）===",
      reportSlice
    ].join("\n"),
    temperature: 0.2
  });

  const parsed = parseJsonFromLlmText(content);
  const validation = validateAppSpec(parsed);
  if (!validation.ok) {
    throw new Error(`App Spec 校验失败：${validation.errors.join("; ")}`);
  }

  const spec: AppSpec = {
    ...validation.spec,
    sourceProjectId: project.id,
    metadata: {
      ...(validation.spec.metadata ?? {}),
      generatedBy: "app-factory-report-to-spec",
      locale: "zh-CN"
    }
  };

  return { spec, source: "report-llm" };
}

/** 优先从 final_report 抽取 Spec；失败则回退标题启发式 */
export async function buildSpecForProject(
  project: {
    id: string;
    title: string;
    idea?: string | null;
    final_report?: string | null;
  },
  options?: { preferReport?: boolean; minReportLength?: number }
): Promise<SpecBuildResult> {
  const preferReport = options?.preferReport !== false;
  const minLen = options?.minReportLength ?? 200;
  const report = project.final_report?.trim() ?? "";

  if (preferReport && report.length >= minLen) {
    try {
      return await extractSpecFromReport({
        id: project.id,
        title: project.title,
        idea: project.idea,
        final_report: report
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const fallback = buildMinimalSpecFromProject(project);
      return {
        spec: fallback,
        source: "title-heuristic",
        warning: `报告→Spec 失败，已回退标题启发式：${message}`
      };
    }
  }

  return {
    spec: buildMinimalSpecFromProject(project),
    source: "title-heuristic"
  };
}
