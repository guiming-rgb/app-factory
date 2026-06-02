import type { AppSpec, AppSpecScreen } from "@/lib/app-spec/types";
import { isTodoAppSpec } from "@/lib/app-spec/detect-todo-app";
import { resolveCodegenScreens } from "@/lib/app-spec/resolve-codegen-screens";
import { emitHarmonyEntityListEts } from "./emit-entity-list";
import { HARMONY_ENTITY_DETAIL_ROUTE } from "./emit-entity-detail";
import { emitHarmonyTodoIndexEts } from "./emit-todo";
import { resolveEntityForScreen } from "@/lib/app-spec/entity-scaffold";

export function findEntityListScreen(spec: AppSpec): AppSpecScreen | undefined {
  for (const screen of resolveCodegenScreens(spec)) {
    if (screen.type === "list" && resolveEntityForScreen(spec, screen)) return screen;
  }
  return undefined;
}

export function harmonyPageComponentName(screenId: string, index: number): string {
  if (index === 0) return "Index";
  const parts = screenId.split(/[^a-z0-9]+/i).filter(Boolean);
  const pascal = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join("");
  return pascal || `Page${index}`;
}

export function harmonyPageRoute(componentName: string): string { return `pages/${componentName}`; }

export function buildHarmonyMainPages(spec: AppSpec): string[] {
  const screens = resolveCodegenScreens(spec);
  const pages = screens.map((screen, i) => harmonyPageRoute(harmonyPageComponentName(screen.id, i)));
  if (findEntityListScreen(spec)) pages.push(HARMONY_ENTITY_DETAIL_ROUTE);
  return pages;
}

export function emitHarmonyPageEts(screen: AppSpecScreen, componentName: string, options: { entry: boolean; spec?: AppSpec }): string {
  if (options.entry && componentName === "Index" && options.spec) {
    if (isTodoAppSpec(options.spec)) return emitHarmonyTodoIndexEts(options.spec.displayName);
    if (screen.type === "list" && resolveEntityForScreen(options.spec, screen)) {
      const body = emitHarmonyEntityListEts(options.spec, screen, { entry: true });
      if (body) return body;
    }
  }

  // Entity list (non-index)
  if (options.spec && screen.type === "list" && resolveEntityForScreen(options.spec, screen)) {
    const body = emitHarmonyEntityListEts(options.spec, screen, { entry: options.entry });
    if (body) return body;
  }

  // Entity detail
  if (options.spec && screen.type === "detail" && resolveEntityForScreen(options.spec, screen)) {
    const entity = resolveEntityForScreen(options.spec, screen)!;
    const df = entity.fields.map((f) => {
      const n = f.name.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
      return `      Text('${n}: ' + (item?.['${n}']?.toString() ?? '—')).fontSize(15).margin({ bottom: 8 })`;
    }).join("\n");
    const e = options.entry ? "@Entry\n" : "";
    return e + `@Component\nstruct ${componentName} {\n  @State item: Record<string, Object> | null = null\n  @State loading: boolean = true\n\n  build() {\n    Column() {\n      if (this.loading) { Text('加载中…').fontSize(16) }\n      else if (this.item) {\n${df}\n      } else { Text('暂无数据').fontSize(16).opacity(0.5) }\n    }.width('100%').height('100%').padding(20).justifyContent(FlexAlign.Start)\n  }\n}`;
  }

  // Form page
  if (options.spec && screen.type === "form") {
    const entity = resolveEntityForScreen(options.spec, screen);
    let ff = '      TextInput({ placeholder: "标题" }).margin({ bottom: 16 })\n      TextInput({ placeholder: "备注" }).margin({ bottom: 16 })';
    if (entity) {
      ff = entity.fields.filter((f) => !f.primary || f.name !== "id").map((f) => {
        const n = f.name.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
        return `      Text('${n}').fontSize(13).opacity(0.6).margin({ bottom: 4 })\n      TextInput({ placeholder: '请输入${n}' }).margin({ bottom: 16 })`;
      }).join("\n");
    }
    const e = options.entry ? "@Entry\n" : "";
    const t = screen.title.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    return e + `@Component\nstruct ${componentName} {\n  build() {\n    Column() {\n      Text('${t}').fontSize(22).fontWeight(FontWeight.Bold).margin({ bottom: 20 })\n${ff}\n      Button('提交').width('100%').onClick(() => { promptAction.showToast({ message: '提交成功' }) })\n    }.width('100%').height('100%').padding(20)\n  }\n}`;
  }

  const title = screen.title.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const entry = options.entry ? "@Entry\n" : "";
  return entry + `@Component\nstruct ${componentName} {\n  @State message: string = '${title}'\n\n  build() {\n    Column() {\n      Text(this.message).fontSize(22).fontWeight(FontWeight.Bold).margin({ bottom: 12 })\n      Text('${screen.id} · ${screen.type}').fontSize(14).opacity(0.7)\n    }.width('100%').height('100%').justifyContent(FlexAlign.Center)\n  }\n}`;
}

export function buildHarmonyMainPagesJson(spec: AppSpec): string {
  const src = buildHarmonyMainPages(spec);
  return JSON.stringify({ src }, null, 2) + "\n";
}
