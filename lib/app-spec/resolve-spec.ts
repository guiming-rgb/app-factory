import { validateAppSpec } from "./validate";
import { buildSpecForProject, type SpecBuildResult } from "./from-report";

/**
 * 统一 Spec 解析入口：优先使用用户编辑的 spec_override，
 * 回退到 LLM 从报告提取（或标题启发式）。
 *
 * P0: Spec 编辑交互 — 核心库
 */
export async function resolveSpecForCodegen(project: {
  id: string;
  title: string;
  idea?: string | null;
  final_report?: string | null;
  spec_override?: unknown;
}): Promise<SpecBuildResult> {
  // 优先使用用户编辑的 Spec
  if (project.spec_override != null) {
    const validation = validateAppSpec(project.spec_override);
    if (validation.ok) {
      return {
        spec: validation.spec,
        source: "user-edited" as SpecBuildResult["source"]
      };
    }
    // 用户 Spec 校验失败，回退到 LLM 提取并附带警告
    const fallback = await buildSpecForProject(project);
    return {
      ...fallback,
      warning: [
        fallback.warning,
        `用户编辑的 Spec 校验失败（${validation.errors.join("; ")}），已回退到自动提取`
      ]
        .filter(Boolean)
        .join(" | ")
    };
  }

  // 无用户编辑，走原有 LLM 提取路径
  return buildSpecForProject(project);
}

export { type SpecBuildResult };
