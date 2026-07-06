import type { AppSpec, AppSpecScreen } from "@/lib/app-spec/types";
import { buildCalendarPageContext } from "@/lib/app-spec/emit-shared/extended-context";
import { emitExtendedMustachePage } from "./mustache-route";

export async function emitFlutterCalendarPage(
  screen: AppSpecScreen,
  spec: AppSpec,
): Promise<string> {
  return emitExtendedMustachePage(
    "calendar",
    screen,
    spec,
    buildCalendarPageContext,
    () => `// calendar legacy fallback`,
  );
}
