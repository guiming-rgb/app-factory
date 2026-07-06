/**
 * 垂直行业 Flutter Widget — Mustache 路由层
 *
 * IndustryCategory + detectIndustry 已提取到 @/lib/app-spec/industry
 * Widget 内容由 templates/flutter-minimal/.../*.dart.mustache 渲染
 */
export {
  type IndustryCategory,
  detectIndustry,
  detectIndustryWithConfidence,
  type IndustryDetectionResult,
} from "@/lib/app-spec/industry";

import type { IndustryCategory } from "@/lib/app-spec/industry";
import type { AppSpec } from "@/lib/app-spec/types";
import { renderWidgetTemplate, hasWidgetTemplate } from "@/lib/codegen/template-renderer";
import { buildWidgetContext } from "@/lib/app-spec/emit-shared";

/** 获取行业 Widget（ADR-007: Mustache 模板渲染） */
export async function getIndustryWidgetsDart(
  category: IndustryCategory,
  spec: AppSpec,
): Promise<string | null> {
  const hasTemplate = await hasWidgetTemplate(category);
  if (!hasTemplate) return null;

  const context = buildWidgetContext(category, spec);
  return renderWidgetTemplate(`${category}_widgets`, context);
}
