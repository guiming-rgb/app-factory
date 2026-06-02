import type { AppSpec, AppSpecScreen } from "@/lib/app-spec/types";
import { resolveEntityForScreen } from "@/lib/app-spec/entity-scaffold";

/**
 * 鸿蒙 Form 页面生成
 */
export function emitHarmonyFormPage(
  screen: AppSpecScreen,
  spec: AppSpec
): string {
  const entity = resolveEntityForScreen(spec, screen);
  const fields = entity?.fields?.filter((f) => !f.primary || f.name !== "id") ?? [
    { name: "title", type: "string" },
    { name: "note", type: "string" }
  ];

  const title = screen.title.replace(/\\/g, "\\\\").replace(/'/g, '"');
  const inputs = fields.map((f) => {
    const t = f.type.toLowerCase();
    const name = f.name;
    if (t === "bool" || t === "boolean") {
      return `      Row() {
        Text('${name}').fontSize(15).fontWeight(500).margin({ right: 12 })
        Toggle({ type: ToggleType.Switch, isOn: false })
          .onChange((isOn: boolean) => { /* 存储状态 */ })
      }.margin({ bottom: 16 })`;
    }
    return `      Text('${name}').fontSize(13).opacity(0.6)
      TextInput({ placeholder: '请输入${name}' })
        .margin({ top: 4, bottom: 16 })`;
  }).join("\n\n");

  return `import { promptAction, router } from '@kit.ArkUI';

@Component
struct FormPage {
  @State submitting: boolean = false

  build() {
    Column() {
      Text('${title}')
        .fontSize(22)
        .fontWeight(FontWeight.Bold)
        .margin({ top: 24, bottom: 20 })

${inputs}

      Button(this.submitting ? '提交中…' : '提交')
        .width('100%')
        .enabled(!this.submitting)
        .onClick(() => {
          this.submitting = true;
          setTimeout(() => {
            promptAction.showToast({ message: '提交成功（演示）' });
            router.back();
            this.submitting = false;
          }, 500);
        })
    }
    .width('100%')
    .height('100%')
    .padding(20)
  }
}
`;
}
