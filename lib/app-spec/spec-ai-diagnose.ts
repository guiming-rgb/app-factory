import { callLLM } from "@/lib/llm";
import type { AppSpec } from "./types";

const DIAGNOSE_SYSTEM = "你是一个 App Spec 质量诊断专家。用户会提供 App Spec JSON 和质量评分详情。请分析 Spec 存在的问题，并返回修复后的完整 Spec JSON。用 markdown code fence 包裹 JSON。只返回修复后的 Spec，不要加解释。";

export type SpecDiagnosis = {
  score: number;
  issues: string[];
  suggestions: string[];
  fixedSpec?: AppSpec;
};

export async function diagnoseAndFixSpec(
  spec: AppSpec,
  quality: { score: number; warnings: string[] }
): Promise<SpecDiagnosis> {
  const issues: string[] = [...quality.warnings];
  const suggestions: string[] = [];

  if (spec.screens.length < 2) {
    issues.push("页面数不足（至少需要 2 个页面）");
    suggestions.push("在 App 想法中明确列出需要的页面：首页、列表页、详情页等");
  }
  if (!spec.screens.some((s) => s.type === "list")) {
    issues.push("缺少列表页（list type）");
    suggestions.push("数据管理类 App 至少需要一个列表页面");
  }
  if ((spec.entities ?? []).length === 0) {
    issues.push("未定义实体（entities 为空）");
    suggestions.push("在项目想法中描述数据模型");
  }
  if (!spec.navigation?.tabs?.length) {
    issues.push("未定义导航（navigation.tabs 为空）");
    suggestions.push("添加导航定义，如 tabs: [main_list, profile]");
  }

  const score = quality.score;

  // LLM 修复仅用于极低质量 Spec
  if (score < 40 && quality.warnings.length > 2) {
    try {
      const result = await callLLM({
        systemPrompt: DIAGNOSE_SYSTEM,
        userPrompt: [
          `Spec 质量评分: ${score}/100`,
          `问题列表:`,
          ...issues.map((i) => `- ${i}`),
          ``,
          `当前 Spec:`,
          "```json",
          JSON.stringify(spec, null, 2),
          "```",
          ``,
          `请返回修复后的完整 Spec JSON。`,
        ].join("\n"),
        temperature: 0.2,
      });

      const match = result.content.match(/```json\n?([\s\S]*?)\n?```/);
      if (match) {
        try {
          const fixed = JSON.parse(match[1]) as AppSpec;
          return { score, issues, suggestions, fixedSpec: fixed };
        } catch { /* continue */ }
      }
    } catch {
      /* LLM unavailable, continue with rules */
    }
  }

  // 规则修复
  let fixedSpec: AppSpec | undefined;
  if (!spec.navigation?.tabs?.length && spec.screens.length >= 2) {
    const tabs = spec.screens
      .filter((s) => s.type !== "tabRoot")
      .slice(0, 3)
      .map((s) => s.id);
    if (tabs.length >= 2) {
      fixedSpec = { ...spec, navigation: { tabs } };
    }
  }

  return { score, issues, suggestions, fixedSpec };
}
