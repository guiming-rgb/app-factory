import type { AppSpec, AppSpecScreen } from "@/lib/app-spec/types";
import { buildDashboardPageContext } from "@/lib/app-spec/emit-shared/extended-context";
import { hasPageTemplate, renderPageTemplate } from "@/lib/codegen/template-renderer";

/** B2: dashboard 页 — Mustache 优先，模板缺失时回退裸字符串 */
export async function emitFlutterDashboardPage(
  screen: AppSpecScreen,
  spec: AppSpec,
): Promise<string> {
  if (await hasPageTemplate("flutter-extended", "dashboard")) {
    const ctx = buildDashboardPageContext(screen, spec);
    return renderPageTemplate("flutter-extended", "dashboard", ctx);
  }
  return emitFlutterDashboardPageLegacy(screen, spec);
}

/** @deprecated 仅作模板缺失回退 */
function emitFlutterDashboardPageLegacy(
  screen: AppSpecScreen,
  spec: AppSpec,
): string {
  const ctx = buildDashboardPageContext(screen, spec);
  return `import "package:flutter/material.dart";
// legacy fallback — 请确保 dashboard.dart.mustache 存在
class ${ctx.className} extends StatelessWidget {
  const ${ctx.className}({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: Text("${ctx.title}")));
}`;
}
