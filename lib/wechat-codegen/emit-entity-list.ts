import type { AppSpec, AppSpecScreen } from "@/lib/app-spec/types";
import type { IndustryCategory } from "@/lib/flutter-codegen/emit-industry";
import {
  buildEntityListRows,
  entityTableName,
  listTitleField,
  primaryKeyField,
  resolveEntityForScreen,
  supabaseSelectColumns
} from "@/lib/app-spec/entity-scaffold";
import { ENTITY_DETAIL_PAGE_PATH } from "./emit-entity-detail";
import {
  wechatIndustryListCall,
  wechatIndustryRequireLine,
  wechatIndustryServiceName,
} from "./industry-bindings";

function escJs(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, " ");
}

function escWxml(s: string): string {
  return s.replace(/</g, "").replace(/"/g, "&quot;");
}

export function emitEntityListIndexWxml(
  spec: AppSpec,
  screen: AppSpecScreen
): string {
  const entity = resolveEntityForScreen(spec, screen);
  if (!entity) return "";
  const title = escWxml(screen.title);
  const entityLine = escWxml(`${entity.name} · ${spec.displayName}`);
  return `<view class="page">
  <privacy-popup show="{{showPrivacy}}" bind:accept="onPrivacyAccept" />

  <view class="card">
    <view class="todo-title">${title}</view>
    <view class="muted">${entityLine}</view>
  </view>

  <!-- 搜索框 -->
  <view class="card">
    <input class="search-input" placeholder="搜索…" value="{{searchText}}" bindinput="onSearchInput" confirm-type="search" />
    <view class="search-hint muted" wx:if="{{supabaseReady}}">搜索 · 下拉刷新 · 上拉加载更多</view>
  </view>

  <view class="card" wx:if="{{loading}}">
    <view class="muted">加载中…</view>
  </view>

  <view class="card" wx:if="{{loadError}}">
    <view class="empty">{{loadError}}</view>
  </view>

  <view class="card" wx:if="{{!loading && items.length === 0}}">
    <view class="empty">{{searchText ? '未找到匹配项' : '暂无数据'}}</view>
  </view>

  <block wx:for="{{items}}" wx:key="id">
    <view class="card list-item" data-id="{{item.id}}" bindtap="onTapItem">
      <view class="list-item-title">{{item.title}}</view>
      <view class="muted list-item-sub">{{item.subtitle}}</view>
    </view>
  </block>

  <view class="card" wx:if="{{hasMore && !loading}}">
    <view class="muted" style="text-align:center" bindtap="loadMore">加载更多…</view>
  </view>
</view>
`;
}

export function emitEntityListIndexJs(
  spec: AppSpec,
  screen: AppSpecScreen,
  industry: IndustryCategory = "generic"
): string {
  const entity = resolveEntityForScreen(spec, screen);
  if (!entity) return "";
  const rows = buildEntityListRows(entity, screen, spec);
  const items = rows
    .map(
      (r) =>
        `      { id: "${escJs(r.id)}", title: "${escJs(r.title)}", subtitle: "${escJs(r.subtitle)}" }`
    )
    .join(",\n");
  const table = escJs(entityTableName(entity));
  const entityName = escJs(entity.name);
  const pk = escJs(primaryKeyField(entity));
  const titleField = escJs(listTitleField(entity));
  const select = escJs(supabaseSelectColumns(entity));
  const detailPath = escJs(`/${ENTITY_DETAIL_PAGE_PATH}`);
  const industryRequire = wechatIndustryRequireLine(industry);
  const industrySvc = wechatIndustryServiceName(industry);
  const listFetch = wechatIndustryListCall(industry, table);

  const loadItemsBody = industrySvc
    ? `    this.setData({ loading: true, loadError: "" });
    return ${listFetch}
      .then((rows) => {
        const list = Array.isArray(rows) ? rows : [];
        const tf = this.data.titleField;
        const pk = this.data.pk;
        const newItems = list.map((row, i) => {
          const id = row[pk] != null ? String(row[pk]) : String(i + 1);
          const title = row[tf] != null ? String(row[tf]) : (row.title != null ? String(row.title) : "—");
          return { id, title, subtitle: this.data.entityName + " · " + id };
        });
        this.setData({ items: newItems, loading: false, page: 0, hasMore: false });
      })
      .catch((err) => {
        if (reset) this.setData({ items: FALLBACK_ITEMS });
        this.setData({
          loadError: err && err.message ? err.message : "拉取失败",
          loading: false
        });
      });`
    : `    let url = this.data.table + "?select=${select}";
    if (this.data.searchText) url += "&" + encodeURIComponent(this.data.titleField) + "=ilike.*" + encodeURIComponent(this.data.searchText) + "*";
    url += "&limit=" + PAGE_SIZE + "&offset=" + from + "&order=created_at.desc";

    this.setData({ loading: true, loadError: "" });
    return request(url, { method: "GET" })
      .then((rows) => {
        const list = Array.isArray(rows) ? rows : [];
        const tf = this.data.titleField;
        const pk = this.data.pk;
        const newItems = list.map((row, i) => {
          const id = row[pk] != null ? String(row[pk]) : String(from + i + 1);
          const title = row[tf] != null ? String(row[tf]) : (row.title != null ? String(row.title) : "—");
          return { id, title, subtitle: this.data.entityName + " · " + id };
        });
        const items = reset ? newItems : this.data.items.concat(newItems);
        this.setData({ items, loading: false, page, hasMore: list.length >= PAGE_SIZE });
      })
      .catch((err) => {
        if (reset) this.setData({ items: FALLBACK_ITEMS });
        this.setData({
          loadError: err && err.message ? err.message : "拉取失败",
          loading: false
        });
      });`;

  return `const { request, isSupabaseConfigured } = require("../../utils/supabase");
${industryRequire}
const FALLBACK_ITEMS = [
${items}
];

const PAGE_SIZE = 15;

Page({
  data: {
    showPrivacy: false,
    supabaseReady: false,
    loading: false,
    loadError: "",
    entityName: "${entityName}",
    table: "${table}",
    pk: "${pk}",
    titleField: "${titleField}",
    searchText: "",
    items: FALLBACK_ITEMS,
    page: 0,
    hasMore: true
  },

  onShow() {
    const app = getApp();
    const accepted = !!app.globalData.privacyAccepted;
    const supabaseReady = isSupabaseConfigured();
    this.setData({ showPrivacy: !accepted, supabaseReady, page: 0, hasMore: true });
    if (accepted) this.loadItems(true);
  },

  onPrivacyAccept() {
    const app = getApp();
    app.globalData.privacyAccepted = true;
    wx.setStorageSync("privacy_accepted", true);
    this.setData({ showPrivacy: false });
    this.loadItems(true);
  },

  onSearchInput(e) {
    this.setData({ searchText: e.detail.value });
    clearTimeout(this._searchTimer);
    this._searchTimer = setTimeout(() => this.loadItems(true), 300);
  },

  onPullDownRefresh() { this.loadItems(true).then(() => wx.stopPullDownRefresh()); },
  onReachBottom() { if (this.data.hasMore) this.loadItems(false); },

  loadItems(reset) {
    if (!isSupabaseConfigured()) {
      this.setData({ items: FALLBACK_ITEMS, loadError: "", loading: false });
      return;
    }
    const page = reset ? 0 : this.data.page + 1;
    const from = page * PAGE_SIZE;
${loadItemsBody}
  },

  loadMore() { this.loadItems(false); },

  onTapItem(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({
      url: "${detailPath}?id=" + encodeURIComponent(String(id)) + "&entity=" + encodeURIComponent(this.data.entityName)
    });
  },

  onTapAdd() {
    wx.navigateTo({ url: "/pages/form/form?id=form" });
  }
});
`;
}

export function emitEntityListIndexWxss(): string {
  return `
.list-item-title {
  font-size: 16px;
  font-weight: 600;
  color: #111;
}
.list-item-sub {
  margin-top: 4px;
  font-size: 12px;
}
`;
}

export async function writeEntityDetailPage(
  appDir: string,
  entity: import("@/lib/app-spec/entity-scaffold").AppSpecEntity,
  fs: typeof import("fs/promises"),
  pathMod: typeof import("path")
): Promise<void> {
  const {
    emitEntityDetailJson,
    emitEntityDetailJs,
    emitEntityDetailWxml
  } = await import("./emit-entity-detail");
  const base = pathMod.join(appDir, "pages", "entity-detail", "entity-detail");
  await fs.mkdir(pathMod.dirname(base), { recursive: true });
  await fs.writeFile(`${base}.wxml`, emitEntityDetailWxml(), "utf8");
  await fs.writeFile(`${base}.js`, emitEntityDetailJs(entity), "utf8");
  await fs.writeFile(`${base}.json`, emitEntityDetailJson(), "utf8");
  await fs.writeFile(`${base}.wxss`, "", "utf8");
}

export function ensureEntityDetailInAppJson(
  appJson: Record<string, unknown>
): Record<string, unknown> {
  const pages = Array.isArray(appJson.pages)
    ? [...(appJson.pages as string[])]
    : [];
  if (!pages.includes(ENTITY_DETAIL_PAGE_PATH)) {
    pages.push(ENTITY_DETAIL_PAGE_PATH);
  }
  return { ...appJson, pages };
}
