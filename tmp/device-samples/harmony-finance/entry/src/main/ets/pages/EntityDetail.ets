import http from '@ohos.net.http';
import router from '@ohos.router';

const SUPABASE_URL: string = ''
const SUPABASE_ANON_KEY: string = ''

@Entry
@Component
struct EntityDetail {
  @State recordId: string = ''
  @State entityName: string = 'transactions'
  @State displayTitle: string = '详情'
  @State loading: boolean = false
  @State loadError: string = ''
  @State fieldRows: Array<{ key: string; value: string }> = []
  private readonly tableName: string = 'transactions'
  private readonly titleField: string = 'title'
  private readonly pkField: string = 'id'
  private readonly selectCols: string = 'id,title,amount,created_at'
  private readonly fieldDefs: Array<{ key: string; prop: string }> = [
    { key: 'id', prop: 'id' },
    { key: 'title', prop: 'title' },
    { key: 'amount', prop: 'amount' },
    { key: 'created_at', prop: 'created_at' }
  ]

  aboutToAppear(): void {
    const params = router.getParams() as Record<string, Object>
    const id = params['id'] != null ? String(params['id']) : ''
    const ent = params['entity'] != null ? String(params['entity']) : this.entityName
    this.recordId = id
    this.entityName = ent
    if (id.length > 0) {
      void this.loadRecord(id)
    } else {
      this.loadError = '缺少记录 id'
    }
  }

  private supabaseReady(): boolean {
    return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0
  }

  async loadRecord(recordId: string): Promise<void> {
    if (!this.supabaseReady()) {
      this.loadError = 'Supabase 未配置'
      return
    }
    this.loading = true
    this.loadError = ''
    const httpRequest = http.createHttp()
    const filter = encodeURIComponent(this.pkField + '=eq.' + recordId)
    const url =
      SUPABASE_URL.replace(/\/$/, '') +
      '/rest/v1/' +
      this.tableName +
      '?select=' +
      encodeURIComponent(this.selectCols) +
      '&' +
      filter
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
        const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null
        if (row) {
          const titleVal =
            row[this.titleField] != null
              ? String(row[this.titleField])
              : row['title'] != null
                ? String(row['title'])
                : '—'
          this.displayTitle = titleVal
          const mapped: Array<{ key: string; value: string }> = []
          for (let i = 0; i < this.fieldDefs.length; i++) {
            const f = this.fieldDefs[i]
            const v = row[f.prop] != null ? String(row[f.prop]) : '—'
            mapped.push({ key: f.key, value: v })
          }
          this.fieldRows = mapped
        } else {
          this.loadError = '未找到记录'
        }
      } else {
        this.loadError = 'HTTP ' + res.responseCode
      }
    } catch (_e) {
      this.loadError = '加载失败'
    } finally {
      httpRequest.destroy()
      this.loading = false
    }
  }

  build() {
    Column() {
      Text(this.displayTitle)
        .fontSize(22)
        .fontWeight(FontWeight.Bold)
        .margin({ bottom: 8 })
      Text(this.entityName + ' · ' + this.recordId)
        .fontSize(14)
        .opacity(0.7)
        .margin({ bottom: 12 })
      if (this.loading) {
        Text('加载中…').fontSize(12).opacity(0.6).margin({ bottom: 8 })
      }
      if (this.loadError.length > 0) {
        Text(this.loadError).fontSize(12).fontColor('#b45309').margin({ bottom: 8 })
      }
      ForEach(this.fieldRows, (row: { key: string; value: string }) => {
        Column() {
          Text(row.key).fontSize(12).opacity(0.6)
          Text(row.value).fontSize(16).margin({ top: 4 })
        }
        .width('100%')
        .alignItems(HorizontalAlign.Start)
        .padding({ top: 8, bottom: 8 })
      }, (row: { key: string }) => row.key)
    }
    .width('100%')
    .height('100%')
    .padding(16)
  }
}
