import type { AppSpec, AppSpecScreen } from "@/lib/app-spec/types";
import {
  buildEntityListRows,
  resolveEntityForScreen
} from "@/lib/app-spec/entity-scaffold";

function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export function emitHarmonyEntityListEts(
  spec: AppSpec,
  screen: AppSpecScreen,
  options: { entry: boolean }
): string {
  const entity = resolveEntityForScreen(spec, screen);
  if (!entity) return "";
  const rows = buildEntityListRows(entity, screen, spec);
  const entry = options.entry ? "@Entry\n" : "";
  const items = rows
    .map(
      (r) =>
        `    { id: '${esc(r.id)}', title: '${esc(r.title)}', subtitle: '${esc(r.subtitle)}' }`
    )
    .join(",\n");

  return `${entry}@Component
struct Index {
  @State pageTitle: string = '${esc(screen.title)}'
  @State items: Array<{ id: string; title: string; subtitle: string }> = [
${items}
  ]

  build() {
    Column() {
      Text(this.pageTitle)
        .fontSize(22)
        .fontWeight(FontWeight.Bold)
        .margin({ bottom: 8 })
      Text('${esc(entity.name)} · ${esc(spec.displayName)}')
        .fontSize(14)
        .opacity(0.7)
        .margin({ bottom: 16 })
      List() {
        ForEach(this.items, (item: { id: string; title: string; subtitle: string }) => {
          ListItem() {
            Column() {
              Text(item.title).fontSize(16).fontWeight(FontWeight.Medium)
              Text(item.subtitle).fontSize(12).opacity(0.65).margin({ top: 4 })
            }
            .width('100%')
            .alignItems(HorizontalAlign.Start)
            .padding(12)
          }
        }, (item: { id: string }) => item.id)
      }
      .layoutWeight(1)
      .width('100%')
    }
    .width('100%')
    .height('100%')
    .padding(16)
  }
}
`;
}
