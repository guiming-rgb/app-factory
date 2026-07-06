import type { AppSpec, AppSpecScreen } from "@/lib/app-spec/types";
import { buildChartPageContext } from "@/lib/app-spec/emit-shared/extended-context";
import { emitExtendedMustachePage } from "./mustache-route";

export async function emitFlutterChartPage(
  screen: AppSpecScreen,
  spec: AppSpec,
): Promise<string> {
  return emitExtendedMustachePage(
    "chart",
    screen,
    spec,
    buildChartPageContext,
    () => `// chart legacy fallback`,
  );
}
