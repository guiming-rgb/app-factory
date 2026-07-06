import type { AppSpec, AppSpecScreen } from "@/lib/app-spec/types";
import { hasPageTemplate, renderPageTemplate } from "@/lib/codegen/template-renderer";

/** B2: extended 页 Mustache 路由 — 模板优先，缺失时回退 legacy */
export async function emitExtendedMustachePage(
  stem: string,
  screen: AppSpecScreen,
  spec: AppSpec,
  buildContext: (screen: AppSpecScreen, spec: AppSpec) => Record<string, string>,
  legacy: (screen: AppSpecScreen, spec: AppSpec) => string,
): Promise<string> {
  if (await hasPageTemplate("flutter-extended", stem)) {
    return renderPageTemplate("flutter-extended", stem, buildContext(screen, spec));
  }
  return legacy(screen, spec);
}
