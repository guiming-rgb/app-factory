import { callLLM } from "@/lib/llm";

import { formatValidationErrorsForLlm } from "./format-validation-errors";
import { buildMinimalSpecFromProject } from "./from-project";
import { mergeSpecWithMinimal } from "./merge-spec";
import { parseJsonFromLlmText } from "./parse-json";
import {
  REPORT_RETRY_SLICE_CHARS,
  REPORT_SLICE_CHARS,
  REPORT_SPEC_MAX_ATTEMPTS,
  REPORT_SPEC_SYSTEM
} from "./prompts/report-to-spec";
import type { AppSpec } from "./types";
import { validateAppSpec } from "./validate";

export type SpecBuildSource = "report-llm" | "title-heuristic";

export type SpecBuildResult = {
  spec: AppSpec;
  source: SpecBuildSource;
  warning?: string;
  attempts?: number;
};

function buildRetryUserPrompt(
  project: {
    id: string;
    title: string;
    idea?: string | null;
    final_report: string;
  },
  validationErrors: string[]
): string {
  const reportSlice = project.final_report.slice(0, REPORT_RETRY_SLICE_CHARS);
  const hints = formatValidationErrorsForLlm(validationErrors);
  return [
    `项目标题：${project.title}`,
    `原始想法：${project.idea ?? "（无）"}`,
    `项目 ID：${project.id}`,
    "",
    "上次 JSON 未通过 Schema 校验。请输出**完整**修正后的 JSON（不要只输出 diff）：",
    hints.map((e) => `- ${e}`).join("\n"),
    "",
    "=== 方案报告（节选）===",
    reportSlice
  ].join("\n");
}

async function extractSpecFromReportOnce(
  project: {
    id: string;
    title: string;
    idea?: string | null;
    final_report: string;
  },
  options?: { retryErrors?: string[] }
): Promise<SpecBuildResult> {
  const reportSlice = project.final_report.slice(0, REPORT_SLICE_CHARS);
  const minimal = buildMinimalSpecFromProject(project);

  const userPrompt = options?.retryErrors?.length
    ? buildRetryUserPrompt(project, options.retryErrors)
    : [
        `项目标题：${project.title}`,
        `原始想法：${project.idea ?? "（无）"}`,
        `项目 ID：${project.id}`,
        "",
        "=== 方案报告（节选）===",
        reportSlice
      ].join("\n");

  const { content } = await callLLM({
    systemPrompt: REPORT_SPEC_SYSTEM,
    userPrompt,
    temperature: options?.retryErrors?.length ? 0.1 : 0.15
  });

  const parsed = parseJsonFromLlmText(content);
  const merged =
    typeof parsed === "object" && parsed !== null
      ? mergeSpecWithMinimal(parsed as Record<string, unknown>, minimal)
      : minimal;

  const validation = validateAppSpec(merged);
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

export async function extractSpecFromReport(project: {
  id: string;
  title: string;
  idea?: string | null;
  final_report: string;
}): Promise<SpecBuildResult> {
  let lastErrors: string[] = [];
  const maxAttempts = REPORT_SPEC_MAX_ATTEMPTS;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const result = await extractSpecFromReportOnce(project, {
        retryErrors: attempt > 0 ? lastErrors : undefined
      });
      const attempts = attempt + 1;
      return {
        ...result,
        attempts,
        spec: {
          ...result.spec,
          metadata: {
            ...(result.spec.metadata ?? {}),
            reportToSpecAttempts: attempts
          }
        }
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!message.includes("App Spec 校验失败")) {
        throw err;
      }
      lastErrors = message.replace(/^App Spec 校验失败：/, "").split("; ");
      if (attempt === maxAttempts - 1) {
        throw err;
      }
    }
  }

  throw new Error("App Spec 抽取失败");
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
