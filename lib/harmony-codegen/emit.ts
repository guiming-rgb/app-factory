import type { AppSpec, AppSpecScreen } from "@/lib/app-spec/types";
import { isTodoAppSpec } from "@/lib/app-spec/detect-todo-app";
import { resolveCodegenScreens } from "@/lib/app-spec/resolve-codegen-screens";
import { emitHarmonyEntityListEts } from "./emit-entity-list";
import { HARMONY_ENTITY_DETAIL_ROUTE } from "./emit-entity-detail";
import { emitHarmonyTodoIndexEts } from "./emit-todo";
import { resolveEntityForScreen } from "@/lib/app-spec/entity-scaffold";

/** 首个带实体的列表屏（用于详情页路由） */
export function findEntityListScreen(spec: AppSpec): AppSpecScreen | undefined {
  for (const screen of resolveCodegenScreens(spec)) {
    if (screen.type === "list" && resolveEntityForScreen(spec, screen)) {
      return screen;
    }
  }
  return undefined;
}

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
  const pages = screens.map((screen, i) =>
    harmonyPageRoute(harmonyPageComponentName(screen.id, i))
  );
  if (findEntityListScreen(spec)) {
    pages.push(HARMONY_ENTITY_DETAIL_ROUTE);
  }
  return pages;
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

  if (
    options.entry &&
    componentName === "Index" &&
    options.spec &&
    screen.type === "list" &&
    resolveEntityForScreen(options.spec, screen)
  ) {
    const body = emitHarmonyEntityListEts(options.spec, screen, {
      entry: true
    });
    if (body) return body;
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
