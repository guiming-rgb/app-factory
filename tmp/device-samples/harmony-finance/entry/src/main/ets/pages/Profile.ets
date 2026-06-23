@Component
struct Profile {
  @State message: string = '我的'

  build() {
    Column() {
      Text(this.message).fontSize(22).fontWeight(FontWeight.Bold).margin({ bottom: 12 })
      Text('profile · placeholder').fontSize(14).opacity(0.7)
    }.width('100%').height('100%').justifyContent(FlexAlign.Center)
  }
}