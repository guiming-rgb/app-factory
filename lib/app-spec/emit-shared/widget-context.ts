/**
 * P2: 三栈共享 Widget 渲染上下文构建
 */
import type { IndustryCategory } from "@/lib/app-spec/industry";
import type { AppSpec } from "@/lib/app-spec/types";
import type { WidgetTemplateContext } from "@/lib/codegen/template-renderer";
import { getIndustryEmitConfig } from "./industry-config";

export function buildWidgetContext(
  industry: IndustryCategory,
  spec: AppSpec,
): WidgetTemplateContext {
  const config = getIndustryEmitConfig(industry);
  const entity = spec.entities?.[0] as Record<string, unknown> | undefined;
  const fields = (entity?.fields ?? []) as Array<Record<string, unknown>>;

  const metaColor = (spec.metadata as Record<string, unknown> | undefined)?.primaryColor;
  const primaryColor =
    typeof metaColor === "string" && metaColor.startsWith("Color(")
      ? metaColor
      : config?.primaryColor ?? "Color(0xFF0D9488)";

  return {
    industry,
    displayName: spec.displayName || config?.displayName || industry,
    tableName: (entity?.name as string) || config?.tableName || "items",
    titleField:
      (fields.find((f) => f.type === "string")?.name as string) || "name",
    primaryKey: (fields.find((f) => f.primary)?.name as string) || "id",
    hasImage:
      fields.some((f) => f.type === "image") || (config?.hasImage ?? false),
    primaryColor,
    extra: { entityName: entity?.name, displayName: spec.displayName },
  };
}
