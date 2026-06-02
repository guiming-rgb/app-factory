import { callLLM } from "@/lib/llm";
import { validateAppSpec } from "./validate";
import { parseJsonFromLlmText } from "./parse-json";
import { mergeSpecWithMinimal } from "./merge-spec";
import { buildMinimalSpecFromProject } from "./from-project";
import { assessSpecQuality } from "./spec-quality";
import type { AppSpec } from "./types";

/**
 * 方向 A-4：Spec 提取失败自动重试
 * 换温度、换 prompt 多次尝试，最多 3 轮
 */

type RetryResult = {
  spec: AppSpec;
  source: "report-llm" | "title-heuristic";
  attempts: number;
  promptUsed: string;
  temperatureUsed: number;
  log: string[];
};

const RETRY_CONFIGS = [
  { name: "standard", temperature: 0.15, systemExtra: "输出纯 JSON，不要 markdown 包装。" },
  { name: "detailed", temperature: 0.1, systemExtra: "仔细检查：screens 至少 3 个、entities 字段完整、navigation.tabs 引用有效 screen id。输出纯 JSON。" },
  { name: "creative", temperature: 0.25, systemExtra: "如果报告中信息不足，合理推断补全字段。screens 至少 2 个并包含一个 list 类型。输出纯 JSON。" },
];

const BASE_SYSTEM = "你是 App Spec 提取专家。从项目报告提取结构化 App Spec JSON。";

export async function extractSpecWithRetry(
  project: { id: string; title: string; idea?: string | null; final_report: string }
): Promise<RetryResult> {
  const log: string[] = [];
  const minimal = buildMinimalSpecFromProject({ id: project.id, title: project.title, idea: project.idea });
  const reportSlice = project.final_report.slice(0, 8000);

  for (let i = 0; i < RETRY_CONFIGS.length; i++) {
    const config = RETRY_CONFIGS[i];
    log.push(`第 ${i + 1}/${RETRY_CONFIGS.length} 轮 (${config.name}, T=${config.temperature})`);

    try {
      const result = await callLLM({
        systemPrompt: `${BASE_SYSTEM}\n${config.systemExtra}`,
        userPrompt: `项目: ${project.title}\n想法: ${project.idea ?? ""}\n报告:\n${reportSlice}`,
        temperature: config.temperature,
      });

      const parsed = parseJsonFromLlmText(result.content) as Record<string, unknown> | null;
      if (!parsed) { log.push("  JSON 解析失败"); continue; }

      const merged = mergeSpecWithMinimal(parsed, minimal);
      const validation = validateAppSpec(merged);

      if (validation.ok) {
        const quality = assessSpecQuality(validation.spec);
        if (quality.score >= 40) {
          log.push(`  ✅ 成功 (score=${quality.score})`);
          return {
            spec: validation.spec,
            source: "report-llm",
            attempts: i + 1,
            promptUsed: config.name,
            temperatureUsed: config.temperature,
            log,
          };
        }
        log.push(`  质量不足 (score=${quality.score}<40)，继续下一轮`);
      } else {
        log.push(`  校验失败: ${validation.errors.slice(0, 2).join("; ")}`);
      }
    } catch (e) {
      log.push(`  LLM 异常: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // 全部失败，回退
  log.push("  ⚠ 全部重试失败，回退到标题启发式");
  return {
    spec: minimal,
    source: "title-heuristic",
    attempts: RETRY_CONFIGS.length,
    promptUsed: "fallback",
    temperatureUsed: 0,
    log,
  };
}
