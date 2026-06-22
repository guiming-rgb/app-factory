/**
 * 微信小程序扩展页面类型发射器
 * dashboard / card_grid / calendar / kanban
 */
import type { AppSpec, AppSpecScreen } from "@/lib/app-spec/types";

function escapeWxml(s: string): string {
  return s.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function entityOrFirst(spec: AppSpec, screen: AppSpecScreen) {
  const entityName = screen.entity;
  const entities = (spec.entities ?? []) as Array<{ name: string; fields: Array<{ name: string; type: string; primary?: boolean }> }>;
  if (entityName) {
    const e = entities.find((x) => x.name === entityName);
    if (e) return e;
  }
  return entities[0] ?? { name: "items", fields: [{ name: "id", type: "uuid", primary: true }, { name: "title", type: "string" }] };
}

function tableName(e: { name: string }) { return e.name; }
function titleField(e: { fields: Array<{ name: string; type: string }> }) {
  return e.fields.find((f) => f.name.includes("title") || f.name.includes("name"))?.name ?? "id";
}

// ─── Dashboard ─────────────────────────────────────────

export function emitWechatDashboardWxml(screen: AppSpecScreen, spec: AppSpec): string {
  const title = escapeWxml(screen.title);
  const entity = entityOrFirst(spec, screen);
  const table = tableName(entity);
  const numericFields = entity.fields.filter((f) => ["int", "float", "number"].includes(f.type));
  const statCards = numericFields.length > 0
    ? numericFields.map((f) => `    <view class="stat-card">
      <text class="stat-value">{{summary.${f.name} || 0}}</text>
      <text class="stat-label">${escapeWxml(f.name)}</text>
    </view>`).join("\n")
    : `    <view class="stat-card">
      <text class="stat-value">{{summary.total || 0}}</text>
      <text class="stat-label">总记录</text>
    </view>`;

  return `<view class="page">
  <privacy-popup show="{{showPrivacy}}" bind:accept="onPrivacyAccept" />

  <view class="dashboard-header">
    <text class="dashboard-title">${title}</text>
    <text class="dashboard-subtitle">数据概览</text>
  </view>

  <view class="stat-grid">
${statCards}
  </view>

  <view class="section">
    <text class="section-title">快捷操作</text>
    <view class="quick-actions">
      <view class="action-btn" bindtap="onAddRecord">
        <text class="action-icon">+</text>
        <text>添加</text>
      </view>
      <view class="action-btn" bindtap="onViewAll">
        <text class="action-icon">☰</text>
        <text>查看全部</text>
      </view>
    </view>
  </view>

  <view class="section" wx:if="{{recentItems.length > 0}}">
    <text class="section-title">最近记录</text>
    <block wx:for="{{recentItems}}" wx:key="id">
      <view class="list-item">
        <text>{{item.${titleField(entity)} || '—'}}</text>
        <text class="item-date">{{item.created_at}}</text>
      </view>
    </block>
  </view>
</view>`;
}

export function emitWechatDashboardJs(screen: AppSpecScreen, spec: AppSpec): string {
  const entity = entityOrFirst(spec, screen);
  const table = tableName(entity);
  const numericFields = entity.fields.filter((f) => ["int", "float", "number"].includes(f.type));

  return `const { request } = require("../../utils/supabase");

Page({
  data: {
    showPrivacy: false,
    summary: { total: 0${numericFields.map((f) => `, "${f.name}": 0`).join("")} },
    recentItems: [],
  },

  onShow() {
    const app = getApp();
    this.setData({ showPrivacy: !app.globalData.privacyAccepted });
    if (app.globalData.privacyAccepted) this.loadDashboard();
  },

  onPrivacyAccept() {
    const app = getApp();
    app.globalData.privacyAccepted = true;
    wx.setStorageSync("privacy_accepted", true);
    this.setData({ showPrivacy: false });
    this.loadDashboard();
  },

  async loadDashboard() {
    try {
      const rows = await request("${table}?order=created_at.desc&limit=5");
      const recent = (rows || []).map(r => ({ ...r, id: String(r.id) }));
      const summary = { total: recent.length ${numericFields.map((f) => `, "${f.name}": (rows || []).reduce((s, r) => s + (Number(r["${f.name}"]) || 0), 0)`).join("")} };
      this.setData({ recentItems: recent, summary });
    } catch (e) {
      console.warn("Dashboard load failed:", e);
    }
  },

  onAddRecord() {
    wx.navigateTo({ url: "/pages/form/form" });
  },

  onViewAll() {
    wx.switchTab({ url: "/pages/index/index" });
  },
});
`;
}

// ─── Card Grid ─────────────────────────────────────────

export function emitWechatCardGridWxml(screen: AppSpecScreen, spec: AppSpec): string {
  const title = escapeWxml(screen.title);
  const entity = entityOrFirst(spec, screen);
  const tf = titleField(entity);
  const hasImage = entity.fields.some((f) => f.type === "image" || f.name.includes("image") || f.name.includes("thumb"));

  return `<view class="page">
  <privacy-popup show="{{showPrivacy}}" bind:accept="onPrivacyAccept" />

  <view class="search-bar">
    <input class="search-input" placeholder="搜索…" value="{{keyword}}" bindinput="onSearch" />
  </view>

  <text class="page-title">${title}</text>

  <view class="card-grid">
    <block wx:for="{{items}}" wx:key="id">
      <view class="grid-card" bindtap="onTapCard" data-id="{{item.id}}">
        ${hasImage ? '<image class="grid-card-img" src="{{item.image_url || item.thumbnail}}" mode="aspectFill" lazy-load />' : '<view class="grid-card-img-placeholder"><text class="placeholder-icon">📷</text></view>'}
        <view class="grid-card-body">
          <text class="grid-card-title">{{item.${tf} || '—'}}</text>
        </view>
      </view>
    </block>
  </view>

  <view class="empty-hint" wx:if="{{items.length === 0 && !loading}}">
    <text>暂无内容，下拉刷新</text>
  </view>
</view>`;
}

export function emitWechatCardGridJs(screen: AppSpecScreen, spec: AppSpec): string {
  const entity = entityOrFirst(spec, screen);
  const table = tableName(entity);
  const tf = titleField(entity);

  return `const { request } = require("../../utils/supabase");

Page({
  data: {
    showPrivacy: false,
    items: [],
    keyword: "",
    loading: true,
  },

  onShow() {
    const app = getApp();
    this.setData({ showPrivacy: !app.globalData.privacyAccepted });
    if (app.globalData.privacyAccepted) this.loadItems();
  },

  onPrivacyAccept() {
    const app = getApp();
    app.globalData.privacyAccepted = true;
    wx.setStorageSync("privacy_accepted", true);
    this.setData({ showPrivacy: false });
    this.loadItems();
  },

  onPullDownRefresh() { this.loadItems().then(() => wx.stopPullDownRefresh()); },

  onSearch(e) {
    const keyword = e.detail.value;
    this.setData({ keyword });
    this.loadItems(keyword);
  },

  async loadItems(search) {
    this.setData({ loading: true });
    try {
      let query = "${table}?order=created_at.desc&limit=50";
      if (search) query += "&${tf}=ilike.*" + encodeURIComponent(search) + "*";
      const rows = await request(query);
      this.setData({ items: (rows || []).map(r => ({ ...r, id: String(r.id) })), loading: false });
    } catch (e) {
      this.setData({ loading: false });
    }
  },

  onTapCard(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: "/pages/detail/detail?id=" + id });
  },
});
`;
}

// ─── Calendar ──────────────────────────────────────────

export function emitWechatCalendarWxml(screen: AppSpecScreen): string {
  const title = escapeWxml(screen.title);

  return `<view class="page">
  <privacy-popup show="{{showPrivacy}}" bind:accept="onPrivacyAccept" />

  <view class="calendar-header">
    <text class="calendar-title">${title}</text>
    <view class="month-switcher">
      <text bindtap="prevMonth">◀</text>
      <text class="month-label">{{currentYear}} 年 {{currentMonth}} 月</text>
      <text bindtap="nextMonth">▶</text>
    </view>
  </view>

  <view class="calendar-grid">
    <view class="weekday-row">
      <text class="weekday">日</text><text class="weekday">一</text><text class="weekday">二</text>
      <text class="weekday">三</text><text class="weekday">四</text><text class="weekday">五</text><text class="weekday">六</text>
    </view>
    <view class="day-grid">
      <block wx:for="{{days}}" wx:key="index">
        <view class="day-cell {{item.isToday ? 'today' : ''}} {{item.hasEvent ? 'has-event' : ''}}" bindtap="onTapDay" data-date="{{item.date}}">
          <text class="day-num">{{item.day}}</text>
          <view class="day-dot" wx:if="{{item.hasEvent}}"></view>
        </view>
      </block>
    </view>
  </view>

  <view class="events-section" wx:if="{{selectedEvents.length > 0}}">
    <text class="section-title">{{selectedDate}} 安排</text>
    <block wx:for="{{selectedEvents}}" wx:key="id">
      <view class="event-item">
        <text>{{item.title || '—'}}</text>
      </view>
    </block>
  </view>
</view>`;
}

export function emitWechatCalendarJs(screen: AppSpecScreen, spec: AppSpec): string {
  const entity = entityOrFirst(spec, screen);
  const table = tableName(entity);
  const dateField = entity.fields.find((f) => f.type === "datetime" || f.name.includes("date"))?.name ?? "created_at";

  return `const { request } = require("../../utils/supabase");

Page({
  data: {
    showPrivacy: false,
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth() + 1,
    days: [],
    selectedDate: "",
    selectedEvents: [],
    allEvents: [],
  },

  onShow() {
    const app = getApp();
    this.setData({ showPrivacy: !app.globalData.privacyAccepted });
    if (app.globalData.privacyAccepted) {
      this.generateCalendar();
      this.loadEvents();
    }
  },

  onPrivacyAccept() {
    const app = getApp();
    app.globalData.privacyAccepted = true;
    wx.setStorageSync("privacy_accepted", true);
    this.setData({ showPrivacy: false });
    this.generateCalendar();
    this.loadEvents();
  },

  prevMonth() {
    let { currentYear, currentMonth } = this.data;
    if (currentMonth === 1) { currentYear--; currentMonth = 12; }
    else { currentMonth--; }
    this.setData({ currentYear, currentMonth });
    this.generateCalendar();
  },

  nextMonth() {
    let { currentYear, currentMonth } = this.data;
    if (currentMonth === 12) { currentYear++; currentMonth = 1; }
    else { currentMonth++; }
    this.setData({ currentYear, currentMonth });
    this.generateCalendar();
  },

  generateCalendar() {
    const { currentYear, currentMonth } = this.data;
    const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const today = new Date();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push({ day: "", isToday: false, hasEvent: false, date: "" });
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = currentYear + "-" + String(currentMonth).padStart(2, "0") + "-" + String(d).padStart(2, "0");
      const isToday = currentYear === today.getFullYear() && currentMonth === today.getMonth() + 1 && d === today.getDate();
      const hasEvent = this.data.allEvents.some(e => (e["${dateField}"] || "").startsWith(dateStr));
      days.push({ day: d, isToday, hasEvent, date: dateStr });
    }
    this.setData({ days });
  },

  async loadEvents() {
    try {
      const rows = await request("${table}?order=${dateField}.asc&limit=200");
      this.setData({ allEvents: (rows || []).map(r => ({ ...r, id: String(r.id) })) });
      this.generateCalendar();
    } catch (e) {
      console.warn("Calendar load failed:", e);
    }
  },

  onTapDay(e) {
    const date = e.currentTarget.dataset.date;
    if (!date) return;
    const events = this.data.allEvents.filter(e => (e["${dateField}"] || "").startsWith(date));
    this.setData({ selectedDate: date, selectedEvents: events });
  },
});
`;
}

// ─── Kanban ─────────────────────────────────────────────

export function emitWechatKanbanWxml(screen: AppSpecScreen): string {
  const title = escapeWxml(screen.title);

  return `<view class="page">
  <privacy-popup show="{{showPrivacy}}" bind:accept="onPrivacyAccept" />

  <view class="kanban-header">
    <text class="page-title">${title}</text>
  </view>

  <scroll-view scroll-x class="kanban-scroll">
    <view class="kanban-row">
      <block wx:for="{{columns}}" wx:key="key" wx:for-item="col">
        <view class="kanban-col">
          <view class="kanban-col-header">
            <view class="col-dot" style="background: {{col.color}}"></view>
            <text class="col-title">{{col.label}}</text>
            <text class="col-count">{{col.items.length}}</text>
          </view>
          <block wx:for="{{col.items}}" wx:key="id" wx:for-item="item">
            <view class="kanban-card" bindtap="onTapCard" data-id="{{item.id}}">
              <text>{{item.title || '—'}}</text>
            </view>
          </block>
        </view>
      </block>
    </view>
  </scroll-view>
</view>`;
}

export function emitWechatKanbanJs(screen: AppSpecScreen, spec: AppSpec): string {
  const entity = entityOrFirst(spec, screen);
  const table = tableName(entity);
  const statusField = entity.fields.find((f) => f.name.includes("status") || f.name.includes("stage") || f.name.includes("state"))?.name ?? "status";

  return `const { request } = require("../../utils/supabase");

const COLUMNS = [
  { key: "todo", label: "待办", color: "#3B82F6" },
  { key: "in_progress", label: "进行中", color: "#F59E0B" },
  { key: "done", label: "已完成", color: "#10B981" },
];

Page({
  data: {
    showPrivacy: false,
    columns: COLUMNS.map(c => ({ ...c, items: [] })),
  },

  onShow() {
    const app = getApp();
    this.setData({ showPrivacy: !app.globalData.privacyAccepted });
    if (app.globalData.privacyAccepted) this.loadBoard();
  },

  onPrivacyAccept() {
    const app = getApp();
    app.globalData.privacyAccepted = true;
    wx.setStorageSync("privacy_accepted", true);
    this.setData({ showPrivacy: false });
    this.loadBoard();
  },

  onPullDownRefresh() { this.loadBoard().then(() => wx.stopPullDownRefresh()); },

  async loadBoard() {
    try {
      const rows = await request("${table}?order=created_at.desc&limit=50");
      const items = (rows || []).map(r => ({ ...r, id: String(r.id) }));
      const columns = COLUMNS.map(c => ({
        ...c,
        items: items.filter(i => (i["${statusField}"] || "todo") === c.key)
      }));
      this.setData({ columns });
    } catch (e) {
      console.warn("Kanban load failed:", e);
    }
  },

  onTapCard(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: "/pages/detail/detail?id=" + id });
  },
});
`;
}

// ─── WXSS 样式 ─────────────────────────────────────────

export function emitWechatExtendedWxss(): string {
  return `/* Dashboard */
.dashboard-header { padding: 32rpx; background: linear-gradient(135deg, #0D9488, #2563EB); color: #fff; }
.dashboard-title { font-size: 40rpx; font-weight: 700; display: block; }
.dashboard-subtitle { font-size: 24rpx; opacity: 0.8; margin-top: 8rpx; }
.stat-grid { display: flex; flex-wrap: wrap; padding: 24rpx; gap: 16rpx; }
.stat-card { flex: 1; min-width: 200rpx; background: #fff; border-radius: 16rpx; padding: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.stat-value { font-size: 48rpx; font-weight: 700; color: #0D9488; display: block; }
.stat-label { font-size: 24rpx; color: #9CA3AF; margin-top: 8rpx; }
.section { padding: 24rpx; }
.section-title { font-size: 28rpx; font-weight: 600; margin-bottom: 16rpx; }
.quick-actions { display: flex; gap: 16rpx; }
.action-btn { flex: 1; background: #F3F4F6; border-radius: 12rpx; padding: 24rpx; text-align: center; font-size: 26rpx; }
.action-icon { font-size: 40rpx; display: block; margin-bottom: 8rpx; }

/* Card Grid */
.search-bar { padding: 16rpx 24rpx; }
.search-input { background: #F3F4F6; border-radius: 12rpx; padding: 16rpx 24rpx; font-size: 28rpx; }
.card-grid { display: flex; flex-wrap: wrap; padding: 0 16rpx; }
.grid-card { width: calc(50% - 32rpx); margin: 16rpx; background: #fff; border-radius: 16rpx; overflow: hidden; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.grid-card-img { width: 100%; height: 240rpx; }
.grid-card-img-placeholder { width: 100%; height: 240rpx; background: #F3F4F6; display: flex; align-items: center; justify-content: center; }
.placeholder-icon { font-size: 64rpx; }
.grid-card-body { padding: 16rpx; }
.grid-card-title { font-size: 26rpx; font-weight: 500; }

/* Calendar */
.calendar-header { padding: 32rpx 24rpx 16rpx; }
.month-switcher { display: flex; align-items: center; justify-content: center; gap: 32rpx; margin-top: 16rpx; font-size: 32rpx; }
.month-label { font-weight: 600; }
.weekday-row { display: flex; padding: 0 16rpx; }
.weekday { flex: 1; text-align: center; font-size: 24rpx; color: #9CA3AF; padding: 12rpx 0; }
.day-grid { display: flex; flex-wrap: wrap; padding: 0 16rpx; }
.day-cell { width: calc(100% / 7); aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; }
.day-cell.today { background: #EFF6FF; border-radius: 50%; }
.day-dot { width: 8rpx; height: 8rpx; border-radius: 50%; background: #0D9488; margin-top: 4rpx; }
.events-section { padding: 24rpx; }
.event-item { padding: 16rpx; background: #F9FAFB; border-radius: 8rpx; margin-bottom: 8rpx; }

/* Kanban */
.kanban-header { padding: 24rpx; padding-bottom: 0; }
.kanban-scroll { white-space: nowrap; }
.kanban-row { display: inline-flex; padding: 16rpx; gap: 16rpx; }
.kanban-col { width: 280rpx; background: #F9FAFB; border-radius: 16rpx; padding: 16rpx; display: inline-block; vertical-align: top; white-space: normal; }
.kanban-col-header { display: flex; align-items: center; gap: 8rpx; margin-bottom: 12rpx; }
.col-dot { width: 12rpx; height: 12rpx; border-radius: 50%; }
.col-title { font-size: 26rpx; font-weight: 600; flex: 1; }
.col-count { font-size: 22rpx; color: #9CA3AF; background: #E5E7EB; border-radius: 10rpx; padding: 2rpx 12rpx; }
.kanban-card { background: #fff; border-radius: 12rpx; padding: 16rpx; margin-bottom: 8rpx; box-shadow: 0 1rpx 4rpx rgba(0,0,0,0.04); font-size: 26rpx; }
`;
}
