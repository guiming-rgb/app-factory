import type { AppSpec, AppSpecScreen } from "@/lib/app-spec/types";
import { buildDashboardPageContext } from "@/lib/app-spec/emit-shared/extended-context";
import { emitExtendedMustachePage } from "./mustache-route";

/** B2: dashboard 页 — Mustache 真源 */
export async function emitFlutterDashboardPage(
  screen: AppSpecScreen,
  spec: AppSpec,
): Promise<string> {
  return emitExtendedMustachePage(
    "dashboard",
    screen,
    spec,
    buildDashboardPageContext,
    () => `// dashboard legacy fallback`,
  );
}
