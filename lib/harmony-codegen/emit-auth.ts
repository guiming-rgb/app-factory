/**
 * 鸿蒙 Auth 页面生成（登录/注册）
 */

export function emitHarmonyLoginPage(displayName: string): string {
  const name = displayName.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  return `import { promptAction, router } from '@kit.ArkUI';

@Entry
@Component
struct LoginPage {
  @State email: string = ''
  @State password: string = ''
  @State loading: boolean = false
  @State errorText: string = ''

  build() {
    Column() {
      Text('${name}')
        .fontSize(24)
        .fontWeight(FontWeight.Bold)
        .margin({ top: 60, bottom: 8 })
      Text('登录以使用完整功能')
        .fontSize(14)
        .opacity(0.6)
        .margin({ bottom: 32 })

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

      TextInput({ placeholder: '密码', text: this.password })
        .type(InputType.Password)
        .onChange((value: string) => { this.password = value })
        .margin({ bottom: 20 })

      Button('登录')
        .width('100%')
        .enabled(!this.loading)
        .onClick(() => { this.onLogin() })

      Button('没有账号？立即注册')
        .fontColor('#7c3aed')
        .backgroundColor(Color.Transparent)
        .onClick(() => { router.pushUrl({ url: 'pages/Register' }) })
    }
    .width('100%')
    .height('100%')
    .padding(24)
  }

  onLogin() {
    if (!this.email || !this.password) {
      this.errorText = '请填写邮箱和密码'
      return
    }
    this.loading = true
    this.errorText = ''
    // TODO: Supabase Auth 集成
    setTimeout(() => {
      promptAction.showToast({ message: '登录成功（演示）' })
      router.replaceUrl({ url: 'pages/Index' })
      this.loading = false
    }, 500)
  }
}
`;
}

export function emitHarmonyRegisterPage(displayName: string): string {
  const name = displayName.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  return `import { promptAction, router } from '@kit.ArkUI';

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
      Text('加入 ${name}')
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
`;
}
