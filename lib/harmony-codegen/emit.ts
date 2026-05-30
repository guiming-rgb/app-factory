import type { AppSpec, AppSpecScreen } from "@/lib/app-spec/types";
import { isTodoAppSpec } from "@/lib/app-spec/detect-todo-app";
import { resolveCodegenScreens } from "@/lib/app-spec/resolve-codegen-screens";
import { emitHarmonyTodoIndexEts } from "./emit-todo";

/** screen id → Harmony 页面组件名（首屏固定 Index） */
export function harmonyPageComponentName(
  screenId: string,
  index: number
): string {
  if (index === 0) return "Index";
  const parts = screenId.split(/[^a-z0-9]+/i).filter(Boolean);
  const pascal = parts
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join("");
  return pascal || `Page${index}`;
}

export function harmonyPageRoute(componentName: string): string {
  return `pages/${componentName}`;
}

export function buildHarmonyMainPages(spec: AppSpec): string[] {
  const screens = resolveCodegenScreens(spec);
  return screens.map((screen, i) =>
    harmonyPageRoute(harmonyPageComponentName(screen.id, i))
  );
}

export function emitHarmonyPageEts(
  screen: AppSpecScreen,
  componentName: string,
  options: { entry: boolean; spec?: AppSpec }
): string {
  if (
    options.entry &&
    componentName === "Index" &&
    options.spec &&
    isTodoAppSpec(options.spec)
  ) {
    return emitHarmonyTodoIndexEts(options.spec.displayName);
  }

  const title = screen.title.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const specLine = `${screen.id} · ${screen.type}`;
  const entry = options.entry ? "@Entry\n" : "";
  return `${entry}@Component
struct ${componentName} {
  @State message: string = '${title}'

  build() {
    Column() {
      Text(this.message)
        .fontSize(22)
        .fontWeight(FontWeight.Bold)
        .margin({ bottom: 12 })
      Text('${specLine}')
        .fontSize(14)
        .opacity(0.7)
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
  }
}
`;
}

export function buildHarmonyMainPagesJson(spec: AppSpec): string {
  const src = buildHarmonyMainPages(spec);
  return JSON.stringify({ src }, null, 2) + "\n";
}
