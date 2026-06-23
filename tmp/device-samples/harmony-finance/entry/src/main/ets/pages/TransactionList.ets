import http from '@ohos.net.http';
import router from '@ohos.router';

const SUPABASE_URL: string = ''
const SUPABASE_ANON_KEY: string = ''

@Component
struct Index {
  @State pageTitle: string = '账单'
  @State items: Array<{ id: string; title: string; subtitle: string }> = [
    { id: '1', title: '账单一', subtitle: 'transactions.title — 离线示例（拉取失败时显示）' },
    { id: '2', title: '账单二', subtitle: 'transactions.title — 由 App Spec 生成' },
    { id: '3', title: '账单三', subtitle: 'transactions.title — 记账本·真机样本' }
  ]
  @State loading: boolean = false
  @State loadError: string = ''
  private readonly fallback: Array<{ id: string; title: string; subtitle: string }> = [
    { id: '1', title: '账单一', subtitle: 'transactions.title — 离线示例（拉取失败时显示）' },
    { id: '2', title: '账单二', subtitle: 'transactions.title — 由 App Spec 生成' },
    { id: '3', title: '账单三', subtitle: 'transactions.title — 记账本·真机样本' }
  ]
  private readonly tableName: string = 'transactions'
  private readonly titleField: string = 'title'
  private readonly pkField: string = 'id'
  private readonly selectCols: string = 'id,title,amount,created_at'
  private readonly entityLabel: string = 'transactions'

  aboutToAppear(): void {
    void this.loadItems()
  }

  private supabaseReady(): boolean {
    return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0
  }

  async loadItems(): Promise<void> {
    if (!this.supabaseReady()) {
      this.items = this.fallback
      return
    }
    this.loading = true
    this.loadError = ''
    const httpRequest = http.createHttp()
    const url =
      SUPABASE_URL.replace(/\/$/, '') +
      '/rest/v1/' +
      this.tableName +
      '?select=' +
      encodeURIComponent(this.selectCols) +
      '&limit=20'
    try {
      const res = await httpRequest.request(url, {
        method: http.RequestMethod.GET,
        header: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        expectDataType: http.HttpDataType.STRING,
        connectTimeout: 15000,
        readTimeout: 15000
      })
      if (res.responseCode === 200 && res.result) {
        const raw = res.result as string
        const rows = JSON.parse(raw) as Array<Record<string, Object>>
        if (Array.isArray(rows) && rows.length > 0) {
          const mapped: Array<{ id: string; title: string; subtitle: string }> = []
          for (let i = 0; i < rows.length; i++) {
            const row = rows[i]
            const idVal = row[this.pkField] != null ? String(row[this.pkField]) : String(i + 1)
            const titleVal =
              row[this.titleField] != null
                ? String(row[this.titleField])
                : row['title'] != null
                  ? String(row['title'])
                  : '—'
            mapped.push({
              id: idVal,
              title: titleVal,
              subtitle: this.entityLabel + ' · ' + idVal
            })
          }
          this.items = mapped
        } else {
          this.items = this.fallback
        }
      } else {
        this.items = this.fallback
        this.loadError = 'HTTP ' + res.responseCode
      }
    } catch (_e) {
      this.items = this.fallback
      this.loadError = '拉取失败，已显示示例'
    } finally {
      httpRequest.destroy()
      this.loading = false
    }
  }

  build() {
    Column() {
      Text(this.pageTitle)
        .fontSize(22)
        .fontWeight(FontWeight.Bold)
        .margin({ bottom: 8 })
      Text(this.entityLabel + ' · 记账本·真机样本')
        .fontSize(14)
        .opacity(0.7)
        .margin({ bottom: 8 })
      if (this.loading) {
        Text('加载中…').fontSize(12).opacity(0.6).margin({ bottom: 8 })
      }
      if (this.loadError.length > 0) {
        Text(this.loadError).fontSize(12).fontColor('#b45309').margin({ bottom: 8 })
      }
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
          .onClick(() => {
            router.pushUrl({
              url: 'pages/EntityDetail',
              params: { id: item.id, entity: this.entityLabel }
            })
          })
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
