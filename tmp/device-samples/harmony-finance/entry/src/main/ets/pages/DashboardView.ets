import { http } from '@kit.NetworkKit';
import { promptAction } from '@kit.ArkUI';

@Component
struct StatCard {
  @Prop label: string = '';
  @Prop value: string = '';

  build() {
    Column() {
      Text(this.value)
        .fontSize(32).fontWeight(FontWeight.Bold).fontColor('#0D9488')
      Text(this.label)
        .fontSize(12).fontColor('#9CA3AF').margin({ top: 4 })
    }
    .width('45%').padding(16).borderRadius(12)
    .backgroundColor('#F0FDFA').margin({ bottom: 8 })
  }
}

@Entry
@Component
struct DashboardPage {
  @State summary: Record<string, number> = { total: 0, 'amount': 0 };
  @State loading: boolean = true;
  @State error: string = '';

  aboutToAppear() {
    this.loadSummary();
  }

  async loadSummary() {
    this.loading = true;
    try {
      const BASE = 'https://your-project.supabase.co';
      const ANON = 'your-anon-key';
      const resp = await http.createHttp().request(
        BASE + '/rest/v1/transactions?select=count',
        { method: http.RequestMethod.GET, header: { apikey: ANON, Authorization: 'Bearer ' + ANON } }
      );
      this.loading = false;
    } catch (e) {
      this.error = '加载失败';
      this.loading = false;
    }
  }

  build() {
    Column() {
      Text('总览')
        .fontSize(20).fontWeight(FontWeight.Bold).margin({ top: 16, bottom: 16, left: 16 })

      if (this.loading) {
        LoadingProgress().width(36).height(36)
      } else if (this.error) {
        Column() {
          Text(this.error).fontSize(14).fontColor('#EF4444')
          Button('重试').onClick(() => this.loadSummary())
        }
      } else {
        Scroll() {
          Column() {
            // 统计卡片
            Flex({ wrap: FlexWrap.Wrap, justifyContent: FlexAlign.SpaceAround }) {
      Row() { StatCard({ label: 'amount', value: (this.summary['amount'] ?? 0).toString() }) }
            }
            .width('100%').padding(8)

            // 快捷操作
            Text('快捷操作').fontSize(16).fontWeight(FontWeight.Medium).margin({ top: 20, left: 16 })
            Row() {
              Button('添加记录').type(ButtonType.Capsule).margin(8)
              Button('查看全部').type(ButtonType.Capsule).margin(8)
            }
          }
        }
      }
    }
    .width('100%').height('100%')
  }
}
