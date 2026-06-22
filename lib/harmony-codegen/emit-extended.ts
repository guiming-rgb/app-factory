/**
 * 鸿蒙 ArkTS 扩展页面类型发射器
 * dashboard / card_grid / calendar
 */
import type { AppSpec, AppSpecScreen } from "@/lib/app-spec/types";

function escapeString(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

function entityOrFirst(spec: AppSpec, screen: AppSpecScreen) {
  const entityName = screen.entity;
  const entities = (spec.entities ?? []) as Array<{ name: string; fields: Array<{ name: string; type: string; primary?: boolean }> }>;
  if (entityName) {
    const e = entities.find((x: { name: string }) => x.name === entityName);
    if (e) return e;
  }
  return entities[0] ?? { name: "items", fields: [{ name: "id", type: "uuid", primary: true }, { name: "title", type: "string" }] };
}

function tableName(e: { name: string }) { return e.name; }
function titleField(e: { fields: Array<{ name: string; type: string }> }) {
  return e.fields.find((f: { name: string }) => f.name.includes("title") || f.name.includes("name"))?.name ?? "id";
}

// ─── Dashboard ────────────────────────────────────

export function emitHarmonyDashboard(screen: AppSpecScreen, spec: AppSpec): string {
  const title = escapeString(screen.title);
  const entity = entityOrFirst(spec, screen);
  const table = tableName(entity);
  const numericFields = entity.fields.filter((f: { type: string }) => ["int", "float", "number"].includes(f.type));
  const statCards = numericFields.length > 0
    ? numericFields.map((f: { name: string }) => `      Row() { StatCard({ label: '${escapeString(f.name)}', value: (this.summary['${escapeString(f.name)}'] ?? 0).toString() }) }`).join("\n")
    : `      Row() { StatCard({ label: '总记录', value: (this.summary['total'] ?? 0).toString() }) }`;

  return `import { http } from '@kit.NetworkKit';
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
  @State summary: Record<string, number> = { total: 0${numericFields.map((f: { name: string }) => `, '${escapeString(f.name)}': 0`).join("")} };
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
        BASE + '/rest/v1/${table}?select=count',
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
      Text('${title}')
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
${statCards}
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
`;
}

// ─── Card Grid ─────────────────────────────────────

export function emitHarmonyCardGrid(screen: AppSpecScreen, spec: AppSpec): string {
  const title = escapeString(screen.title);
  const entity = entityOrFirst(spec, screen);
  const table = tableName(entity);
  const tf = titleField(entity);
  const hasImage = entity.fields.some((f: { name: string; type: string }) =>
    f.type === "image" || f.name.includes("image") || f.name.includes("thumb")
  );

  return `import { http } from '@kit.NetworkKit';

@Component
struct GridCard {
  @Prop title: string = '';
  @Prop imageUrl: string = '';
  @Prop itemId: string = '';
  onTap?: () => void;

  build() {
    Column() {
      ${hasImage
        ? `if (this.imageUrl) {
        Image(this.imageUrl).width('100%').height(140).objectFit(ImageFit.Cover)
      } else {
        Column() { Image($r('app.media.icon')).width(40).height(40) }
          .width('100%').height(140).backgroundColor('#F3F4F6').justifyContent(FlexAlign.Center)
      }`
        : `Column() { Text('📷').fontSize(32) }
        .width('100%').height(140).backgroundColor('#F3F4F6').justifyContent(FlexAlign.Center)`}

      Text(this.title)
        .fontSize(13).fontWeight(FontWeight.Medium)
        .maxLines(2).textOverflow({ overflow: TextOverflow.Ellipsis })
        .padding({ left: 10, right: 10, top: 8, bottom: 10 })
    }
    .width('48%').borderRadius(12).backgroundColor('#FFFFFF')
    .shadow({ radius: 4, color: '#10000000', offsetY: 2 })
    .margin({ bottom: 12 })
    .onClick(() => { if (this.onTap) this.onTap(); })
  }
}

@Entry
@Component
struct CardGridPage {
  @State items: Array<Record<string, Object>> = [];
  @State loading: boolean = true;
  @State keyword: string = '';

  aboutToAppear() { this.loadItems(); }

  async loadItems() {
    this.loading = true;
    try {
      const BASE = 'https://your-project.supabase.co';
      const ANON = 'your-anon-key';
      const resp = await http.createHttp().request(
        BASE + '/rest/v1/${table}?select=*&order=created_at.desc&limit=50',
        { method: http.RequestMethod.GET, header: { apikey: ANON, Authorization: 'Bearer ' + ANON } }
      );
      this.items = JSON.parse((resp.result as string) || '[]');
    } catch (e) { console.error('load failed', e); }
    this.loading = false;
  }

  build() {
    Column() {
      Text('${title}')
        .fontSize(20).fontWeight(FontWeight.Bold).margin({ top: 16, bottom: 8, left: 16 })

      Search({ placeholder: '搜索…', value: this.keyword })
        .width('100%').margin({ left: 16, right: 16, bottom: 8 })

      if (this.loading) {
        LoadingProgress().margin({ top: 60 })
      } else if (this.items.length === 0) {
        Text('暂无内容').margin({ top: 60 }).fontColor('#9CA3AF')
      } else {
        Scroll() {
          Flex({ wrap: FlexWrap.Wrap, justifyContent: FlexAlign.SpaceBetween }) {
            ForEach(this.items, (item: Record<string, Object>) => {
              GridCard({
                title: ((item['${tf}'] as string) || '—'),
                imageUrl: ${hasImage ? "((item['image_url'] as string) || (item['thumbnail'] as string) || '')" : "''"},
                itemId: (item['id'] as string) || '',
                onTap: () => { /* navigate to detail */ }
              })
            })
          }
          .width('100%').padding({ left: 12, right: 12 })
        }
      }
    }
    .width('100%').height('100%')
  }
}
`;
}

// ─── Calendar ──────────────────────────────────────

export function emitHarmonyCalendar(screen: AppSpecScreen, spec: AppSpec): string {
  const title = escapeString(screen.title);
  const entity = entityOrFirst(spec, screen);
  const table = tableName(entity);
  const dateField = entity.fields.find((f: { name: string; type: string }) =>
    f.type === "datetime" || f.name.includes("date")
  )?.name ?? "created_at";
  const tf = titleField(entity);

  return `@Entry
@Component
struct CalendarPage {
  @State currentYear: number = new Date().getFullYear();
  @State currentMonth: number = new Date().getMonth() + 1;
  @State selectedDate: string = '';
  @State events: Array<Record<string, Object>> = [];
  @State allEvents: Array<Record<string, Object>> = [];

  aboutToAppear() { this.loadEvents(); }

  async loadEvents() {
    try {
      const BASE = 'https://your-project.supabase.co';
      const ANON = 'your-anon-key';
      const resp = await http.createHttp().request(
        BASE + '/rest/v1/${table}?select=*&order=${dateField}.asc&limit=200',
        { method: http.RequestMethod.GET, header: { apikey: ANON, Authorization: 'Bearer ' + ANON } }
      );
      this.allEvents = JSON.parse((resp.result as string) || '[]');
    } catch (e) { console.error('load failed', e); }
  }

  prevMonth() {
    if (this.currentMonth === 1) { this.currentYear--; this.currentMonth = 12; }
    else { this.currentMonth--; }
  }
  nextMonth() {
    if (this.currentMonth === 12) { this.currentYear++; this.currentMonth = 1; }
    else { this.currentMonth++; }
  }

  getEventsForDate(dateStr: string): Array<Record<string, Object>> {
    return this.allEvents.filter((e: Record<string, Object>) =>
      ((e['${dateField}'] as string) || '').startsWith(dateStr)
    );
  }

  buildCalendarDays(): Array<{ day: number; dateStr: string; hasEvent: boolean }> {
    const days: Array<{ day: number; dateStr: string; hasEvent: boolean }> = [];
    const firstDay = new Date(this.currentYear, this.currentMonth - 1, 1).getDay();
    const daysInMonth = new Date(this.currentYear, this.currentMonth, 0).getDate();
    for (let i = 0; i < firstDay; i++) days.push({ day: 0, dateStr: '', hasEvent: false });
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = this.currentYear + '-' + String(this.currentMonth).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      days.push({ day: d, dateStr: ds, hasEvent: this.getEventsForDate(ds).length > 0 });
    }
    return days;
  }

  build() {
    Column() {
      Text('${title}')
        .fontSize(20).fontWeight(FontWeight.Bold).margin({ top: 16, bottom: 8 })

      // 月份切换
      Row() {
        Button('◀').type(ButtonType.Capsule).onClick(() => this.prevMonth())
        Text(this.currentYear + '年 ' + this.currentMonth + '月')
          .fontSize(16).fontWeight(FontWeight.Medium).layoutWeight(1).textAlign(TextAlign.Center)
        Button('▶').type(ButtonType.Capsule).onClick(() => this.nextMonth())
      }
      .width('100%').padding(16)

      // 星期头
      Row() {
        ForEach(['日', '一', '二', '三', '四', '五', '六'], (d: string) => {
          Text(d).fontSize(12).fontColor('#9CA3AF').layoutWeight(1).textAlign(TextAlign.Center)
        })
      }.padding({ left: 8, right: 8 })

      // 日期网格
      Grid() {
        ForEach(this.buildCalendarDays(), (d: { day: number; dateStr: string; hasEvent: boolean }, i: number) => {
          GridItem() {
            Column() {
              Text(d.day > 0 ? d.day.toString() : '').fontSize(14)
              if (d.hasEvent) {
                Circle({ width: 4, height: 4 }).fill('#0D9488').margin({ top: 2 })
              }
            }
            .width('100%').aspectRatio(1).justifyContent(FlexAlign.Center)
            .borderRadius(8)
            .backgroundColor(d.dateStr === this.selectedDate ? '#E6F7F5' : 'transparent')
            .onClick(() => {
              if (d.dateStr) { this.selectedDate = d.dateStr; this.events = this.getEventsForDate(d.dateStr); }
            })
          }
        })
      }
      .columnsTemplate('1fr 1fr 1fr 1fr 1fr 1fr 1fr')
      .rowsGap(2).columnsGap(2).padding(8)

      // 当日事件
      if (this.events.length > 0) {
        Text(this.selectedDate + ' 安排').fontSize(14).fontWeight(FontWeight.Medium).margin({ top: 16, left: 16 })
        List() {
          ForEach(this.events, (e: Record<string, Object>) => {
            ListItem() {
              Text((e['${tf}'] as string) || '—')
                .fontSize(14).padding(12)
            }
          })
        }
      }
    }
    .width('100%').height('100%')
  }
}
`;
}

// ─── Chart (柱状图) ────────────────────────────────────

// ─── Chart ──────────────────────────────────────

export function emitHarmonyChart(screen: AppSpecScreen): string {
  const t = escapeString(screen.title);
  return [
    'import { http } from "@kit.NetworkKit";',
    '',
    '@Entry @Component struct ChartPage {',
    '  @State data: Array<{label:string,value:number}> = [];',
    '  aboutToAppear() { this.loadData(); }',
    '  async loadData() {',
    '    try {',
    '      const BASE="https://your-project.supabase.co"; const ANON="your-anon-key";',
    '      const resp = await http.createHttp().request(BASE+"/rest/v1/items?limit=100",',
    '        {method:http.RequestMethod.GET,header:{apikey:ANON,Authorization:"Bearer "+ANON}});',
    '      const rows = JSON.parse((resp.result as string)||"[]");',
    '      const map:Record<string,number>={};',
    '      for(const r of rows){const k=r["category"]||"其他";map[k]=(map[k]||0)+1}',
    '      this.data = Object.entries(map).map(([k,v])=>({label:k,value:v}));',
    '    } catch(e) { console.error("Chart failed",e); }',
    '  }',
    '  build() {',
    '    Column() {',
    '      Text("' + t + '").fontSize(20).fontWeight(FontWeight.Bold).margin(16)',
    '      ForEach(this.data,(d:{label:string,value:number})=>{',
    '        Row() { Text(d.label).width(80).fontSize(11)',
    '          Progress({value:0,total:100,type:ProgressType.Linear}).value(d.value).width("60%").style({strokeWidth:16,strokeRadius:8})',
    '          Text(d.value.toString()).fontSize(13).fontWeight(FontWeight.Bold).margin({left:8})',
    '        }.padding({left:8,right:8,top:4,bottom:4})',
    '      })',
    '    }.width("100%").height("100%")',
    '  }',
    '}',
  ].join("\n");
}

// ─── Kanban ─────────────────────────────────────

export function emitHarmonyKanban(screen: AppSpecScreen): string {
  const t = escapeString(screen.title);
  return [
    'import { http } from "@kit.NetworkKit";',
    '',
    'const COLS=[{key:"todo",label:"待办",color:"#3B82F6"},{key:"in_progress",label:"进行中",color:"#F59E0B"},{key:"done",label:"已完成",color:"#10B981"}];',
    '',
    '@Entry @Component struct KanbanPage {',
    '  @State cols: Array<{key:string,label:string,color:string,items:Array<Record<string,Object>>}> = [];',
    '  aboutToAppear() { this.load(); }',
    '  async load() {',
    '    try {',
    '      const BASE="https://your-project.supabase.co"; const ANON="your-anon-key";',
    '      const resp = await http.createHttp().request(BASE+"/rest/v1/items?select=*&limit=50",',
    '        {method:http.RequestMethod.GET,header:{apikey:ANON,Authorization:"Bearer "+ANON}});',
    '      const items = JSON.parse((resp.result as string)||"[]");',
    '      this.cols = COLS.map(c=>({...c,items:items.filter((i:Record<string,Object>)=>(i["status"]||"todo")===c.key)}));',
    '    } catch(e) {}',
    '  }',
    '  build() {',
    '    Column() {',
    '      Text("' + t + '").fontSize(20).fontWeight(FontWeight.Bold).margin(16)',
    '      Scroll() { Row() {',
    '        ForEach(this.cols,(c:{key:string,label:string,color:string,items:Array<Record<string,Object>>})=>{',
    '          Column() {',
    '            Row() { Circle({width:8,height:8}).fill(c.color); Text(c.label).fontSize(14).fontWeight(FontWeight.Medium).margin({left:4}) }.padding(8)',
    '            List() { ForEach(c.items,(item:Record<string,Object>)=>{ ListItem() { Text((item["title"]||item["name"]||"---") as string).fontSize(13).padding(12) } }) }',
    '          }.width(220).backgroundColor("#F9FAFB").borderRadius(12).padding(8).margin(6)',
    '        })',
    '      }}.padding(8)',
    '    }.width("100%").height("100%")',
    '  }',
    '}',
  ].join("\n");
}

// ─── Onboarding ─────────────────────────────────

export function emitHarmonyOnboarding(screen: AppSpecScreen): string {
  const t = escapeString(screen.title);
  return [
    '@Entry @Component struct OnboardingPage {',
    '  @State current: number = 0;',
    '  private swiper: SwiperController = new SwiperController();',
    '  build() {',
    '    Column() {',
    '      Swiper(this.swiper) {',
    '        Column() { Text("🚀").fontSize(64).margin({bottom:24}); Text("欢迎使用 ' + t + '").fontSize(24).fontWeight(FontWeight.Bold); Text("快速上手").fontSize(14).fontColor("#9CA3AF").margin({top:8}) }.width("100%").height("100%").justifyContent(FlexAlign.Center)',
    '        Column() { Text("☁️").fontSize(64).margin({bottom:24}); Text("数据同步").fontSize(24).fontWeight(FontWeight.Bold); Text("安全存储").fontSize(14).fontColor("#9CA3AF").margin({top:8}) }.width("100%").height("100%").justifyContent(FlexAlign.Center)',
    '        Column() { Text("🛡️").fontSize(64).margin({bottom:24}); Text("隐私安全").fontSize(24).fontWeight(FontWeight.Bold); Text("加密保护").fontSize(14).fontColor("#9CA3AF").margin({top:8}); Button("开始使用").type(ButtonType.Capsule).margin({top:40}) }.width("100%").height("100%").justifyContent(FlexAlign.Center)',
    '      }.indicator(true).onChange((i:number)=>{this.current=i})',
    '      Row() { Button("跳过").onClick(()=>{this.swiper.changeIndex(2)}); Blank(); Button(this.current===2?"开始":"下一步").onClick(()=>{if(this.current===2){}else{this.swiper.showNext()}}) }.width("100%").padding(24)',
    '    }.width("100%").height("100%")',
    '  }',
    '}',
  ].join("\n");
}
