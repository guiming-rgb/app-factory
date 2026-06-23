@Entry
@Component
struct Index {
  @State message: string = '首页'

  build() {
    Column() {
      Text(this.message).fontSize(22).fontWeight(FontWeight.Bold).margin({ bottom: 12 })
      Text('home · tabRoot').fontSize(14).opacity(0.7)
    }.width('100%').height('100%').justifyContent(FlexAlign.Center)
  }
}