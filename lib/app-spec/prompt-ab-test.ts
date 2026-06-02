import { callLLM } from "@/lib/llm";
import { validateAppSpec } from "./validate";
import { parseJsonFromLlmText } from "./parse-json";
import { mergeSpecWithMinimal } from "./merge-spec";
import { buildMinimalSpecFromProject } from "./from-project";
import type { AppSpec } from "./types";

/**
 * 方向 A-2：LLM Prompt A/B 测试
 * 对比多套 Spec 提取 prompt 的成功率和质量分
 */

type PromptVariant = {
  name: string;
  systemPrompt: string;
  temperature: number;
};

type ABTestResult = {
  winner: string;
  variants: Array<{
    name: string;
    ok: boolean;
    screens: number;
    entities: number;
    durationMs: number;
    errors: string[];
  }>;
};

const VARIANT_A: PromptVariant = {
  name: "A (standard)",
  systemPrompt: "你是 App Spec 提取专家。从用户报告提取结构化 App Spec JSON。确保 screens、entities、navigation 字段完整。输出纯 JSON。",
  temperature: 0.15,
};

const VARIANT_B: PromptVariant = {
  name: "B (detailed)",
  systemPrompt: `你是资深 App Spec 架构师。严格按照以下规则提取：
1. screens 至少 3 个，type 从 [tabRoot, list, detail, form, placeholder] 中选择
2. entities 每个至少 2 个字段，包含 name 和 fields
3. navigation.tabs 必须引用已定义的 screen id
4. appName 必须小写英文+下划线
5. 不猜测不填，缺失字段留空
输出纯 JSON，不要 markdown 包装。`,
  temperature: 0.1,
};

const VARIANT_C: PromptVariant = {
  name: "C (creative)",
  systemPrompt: "你是 App Spec 设计师。从项目报告创造性地提取 App Spec。如果报告中信息不足，合理推断补全字段。输出纯 JSON。",
  temperature: 0.3,
};

export async function runPromptABTest(
  project: { id: string; title: string; idea?: string | null; final_report: string },
  testVariants?: PromptVariant[]
): Promise<ABTestResult> {
  const variants = testVariants ?? [VARIANT_A, VARIANT_B, VARIANT_C];
  const results: ABTestResult["variants"] = [];
  const minimal = buildMinimalSpecFromProject({ id: project.id, title: project.title, idea: project.idea });

  const reportSlice = project.final_report.slice(0, 8000);

  for (const variant of variants) {
    const start = Date.now();
    const errors: string[] = [];
    let ok = false;
    let screens = 0;
    let entities = 0;

    try {
      const result = await callLLM({
        systemPrompt: variant.systemPrompt,
        userPrompt: `项目: ${project.title}\n想法: ${project.idea ?? ""}\n报告片段:\n${reportSlice}`,
        temperature: variant.temperature,
      });

      const parsed = parseJsonFromLlmText(result.content) as Record<string, unknown> | null;
      if (!parsed) {
        errors.push("JSON 解析失败");
      } else {
        const merged = mergeSpecWithMinimal(parsed, minimal);
        const validation = validateAppSpec(merged);
        if (validation.ok) {
          ok = true;
          screens = validation.spec.screens.length;
          entities = (validation.spec.entities ?? []).length;
        } else {
          errors.push(...validation.errors.slice(0, 3));
        }
      }
    } catch (e) {
      errors.push(e instanceof Error ? e.message : "LLM 调用失败");
    }

    results.push({
      name: variant.name,
      ok,
      screens,
      entities,
      durationMs: Date.now() - start,
      errors,
    });
  }

  // 选最优：成功率优先，其次 screens 数量
  const sorted = [...results].sort((a, b) => {
    if (a.ok !== b.ok) return a.ok ? -1 : 1;
    if (a.screens !== b.screens) return b.screens - a.screens;
    return b.entities - a.entities;
  });

  return { winner: sorted[0].name, variants: results };
}
