import { promptAction, router } from '@kit.ArkUI';

@Component
struct FormPage {
  @State submitting: boolean = false

  build() {
    Column() {
      Text('记一笔')
        .fontSize(22)
        .fontWeight(FontWeight.Bold)
        .margin({ top: 24, bottom: 20 })

      Text('title').fontSize(13).opacity(0.6)
      TextInput({ placeholder: '请输入title' })
        .margin({ top: 4, bottom: 16 })

      Text('amount').fontSize(13).opacity(0.6)
      TextInput({ placeholder: '请输入amount' })
        .margin({ top: 4, bottom: 16 })

      Text('created_at').fontSize(13).opacity(0.6)
      TextInput({ placeholder: '请输入created_at' })
        .margin({ top: 4, bottom: 16 })

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
