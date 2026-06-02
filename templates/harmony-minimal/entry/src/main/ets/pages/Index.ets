import router from '@ohos.router';

@Entry
@Component
struct Index {
  @State currentIndex: number = 0
  private tabsController: TabsController = new TabsController()

  build() {
    Tabs({ barPosition: BarPosition.End, controller: this.tabsController }) {
      TabContent() {
        MainListPage()
      }.tabBar(this.TabBuilder('列表', 0, $r('sys.media.ohos_ic_public_list'))

      TabContent() {
        ProfilePage()
      }.tabBar(this.TabBuilder('我的', 1, $r('sys.media.ohos_ic_public_contacts'))
    }
    .onChange((index: number) => { this.currentIndex = index })
  }

  @Builder
  TabBuilder(title: string, index: number, icon: Resource) {
    Column() {
      Image(icon).width(24).height(24).objectFit(ImageFit.Contain)
      Text(title).fontSize(10).fontColor(this.currentIndex === index ? '#007DFF' : '#999')
    }
  }
}

@Component
struct MainListPage {
  @State message: string = '__DISPLAY_NAME__'
  @State items: Array<{id: string, title: string, subtitle: string}> = [
    { id: '1', title: '示例项目 1', subtitle: '点击查看详情' },
    { id: '2', title: '示例项目 2', subtitle: '描述信息' },
  ]

  build() {
    Column() {
      Text(this.message)
        .fontSize(22)
        .fontWeight(FontWeight.Bold)
        .margin({ top: 16, bottom: 12, left: 16 })
      List() {
        ForEach(this.items, (item: {id: string, title: string, subtitle: string}) => {
          ListItem() {
            Row() {
              Column() {
                Text(item.title).fontSize(16).fontWeight(500)
                Text(item.subtitle).fontSize(12).opacity(0.6).margin({ top: 4 })
              }.alignItems(HorizontalAlign.Start)
              Blank()
              Image($r('sys.media.ohos_ic_public_arrow_right')).width(16).height(16).opacity(0.4)
            }.width('100%').padding(16)
          }.onClick(() => { router.pushUrl({ url: 'pages/Detail', params: { id: item.id } }) })
        })
      }
    }.width('100%').height('100%')
  }
}

@Component
struct ProfilePage {
  build() {
    Column() {
      Text('个人中心').fontSize(22).fontWeight(FontWeight.Bold).margin({ top: 16, bottom: 12, left: 16 })
      Column() {
        Text('功能设置').fontSize(14).opacity(0.6).margin({ bottom: 8 })
        Text('关于应用').fontSize(15).margin({ bottom: 4 })
        Text('__DISPLAY_NAME__ · App 生产工厂').fontSize(12).opacity(0.5)
      }.padding(16)
    }.width('100%').height('100%')
  }
}
