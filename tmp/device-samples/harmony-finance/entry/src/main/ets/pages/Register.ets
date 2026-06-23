import { promptAction, router } from '@kit.ArkUI';

@Entry
@Component
struct RegisterPage {
  @State email: string = ''
  @State password: string = ''
  @State confirm: string = ''
  @State loading: boolean = false
  @State errorText: string = ''

  build() {
    Column() {
      Text('加入 记账本·真机样本')
        .fontSize(24)
        .fontWeight(FontWeight.Bold)
        .margin({ top: 60, bottom: 24 })

      if (this.errorText) {
        Text(this.errorText)
          .fontSize(13)
          .fontColor(Color.Red)
          .margin({ bottom: 12 })
      }

      TextInput({ placeholder: '邮箱', text: this.email })
        .type(InputType.Email)
        .onChange((value: string) => { this.email = value })
        .margin({ bottom: 12 })

      TextInput({ placeholder: '密码（至少6位）', text: this.password })
        .type(InputType.Password)
        .onChange((value: string) => { this.password = value })
        .margin({ bottom: 12 })

      TextInput({ placeholder: '确认密码', text: this.confirm })
        .type(InputType.Password)
        .onChange((value: string) => { this.confirm = value })
        .margin({ bottom: 20 })

      Button('注册')
        .width('100%')
        .enabled(!this.loading)
        .onClick(() => { this.onRegister() })
    }
    .width('100%')
    .height('100%')
    .padding(24)
  }

  onRegister() {
    if (!this.email || !this.password) {
      this.errorText = '请填写邮箱和密码'
      return
    }
    if (this.password !== this.confirm) {
      this.errorText = '两次密码不一致'
      return
    }
    if (this.password.length < 6) {
      this.errorText = '密码至少6位'
      return
    }
    this.loading = true
    this.errorText = ''
    setTimeout(() => {
      promptAction.showToast({ message: '注册成功（演示）' })
      router.back()
      this.loading = false
    }, 500)
  }
}
