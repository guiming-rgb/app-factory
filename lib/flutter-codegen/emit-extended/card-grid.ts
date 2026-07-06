import type { AppSpec, AppSpecScreen } from "@/lib/app-spec/types";
import { buildCardGridPageContext } from "@/lib/app-spec/emit-shared/extended-context";
import { emitExtendedMustachePage } from "./mustache-route";

export async function emitFlutterCardGridPage(
  screen: AppSpecScreen,
  spec: AppSpec,
): Promise<string> {
  return emitExtendedMustachePage(
    "card-grid",
    screen,
    spec,
    buildCardGridPageContext,
    () => `// card-grid legacy fallback`,
  );
}
