import type { AppSpec, AppSpecScreen } from "@/lib/app-spec/types";
import { buildKanbanPageContext } from "@/lib/app-spec/emit-shared/extended-context";
import { emitExtendedMustachePage } from "./mustache-route";

export async function emitFlutterKanbanPage(
  screen: AppSpecScreen,
  spec: AppSpec,
): Promise<string> {
  return emitExtendedMustachePage(
    "kanban",
    screen,
    spec,
    buildKanbanPageContext,
    () => `// kanban legacy fallback`,
  );
}
