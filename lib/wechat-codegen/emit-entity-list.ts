import type { AppSpec, AppSpecScreen } from "@/lib/app-spec/types";
import {
  buildEntityListRows,
  entityTableName,
  listTitleField,
  primaryKeyField,
  resolveEntityForScreen,
  supabaseSelectColumns
} from "@/lib/app-spec/entity-scaffold";
import { ENTITY_DETAIL_PAGE_PATH } from "./emit-entity-detail";

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
    <view class="muted" wx:if="{{supabaseReady}}">已配置 Supabase · 点击行进详情</view>
    <view class="muted" wx:else>示例数据 · 在 app.js 配置 Supabase 后可拉取</view>
  </view>

  <view class="card" wx:if="{{loading}}">
    <view class="muted">加载中…</view>
  </view>

  <view class="card" wx:if="{{loadError}}">
    <view class="empty">{{loadError}}</view>
  </view>

  <view class="card" wx:if="{{!loading && items.length === 0}}">
    <view class="empty">暂无数据</view>
  </view>

  <block wx:for="{{items}}" wx:key="id">
    <view class="card list-item" data-id="{{item.id}}" bindtap="onTapItem">
      <view class="list-item-title">{{item.title}}</view>
      <view class="muted list-item-sub">{{item.subtitle}}</view>
    </view>
  </block>
</view>
`;
}

export function emitEntityListIndexJs(
  spec: AppSpec,
  screen: AppSpecScreen
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

  return `const { request, isSupabaseConfigured } = require("../../utils/supabase");

const FALLBACK_ITEMS = [
${items}
];

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
    items: FALLBACK_ITEMS
  },

  onShow() {
    const app = getApp();
    const accepted = !!app.globalData.privacyAccepted;
    const supabaseReady = isSupabaseConfigured();
    this.setData({
      showPrivacy: !accepted,
      supabaseReady
    });
    if (accepted) this.loadItems();
  },

  onPrivacyAccept() {
    const app = getApp();
    app.globalData.privacyAccepted = true;
    wx.setStorageSync("privacy_accepted", true);
    this.setData({ showPrivacy: false });
    this.loadItems();
  },

  loadItems() {
    if (!isSupabaseConfigured()) {
      this.setData({ items: FALLBACK_ITEMS, loadError: "", loading: false });
      return;
    }
    this.setData({ loading: true, loadError: "" });
    request(this.data.table + "?select=${select}&limit=20", { method: "GET" })
      .then((rows) => {
        const list = Array.isArray(rows) ? rows : [];
        const tf = this.data.titleField;
        const pk = this.data.pk;
        const items = list.length
          ? list.map((row, i) => {
              const id =
                row[pk] != null ? String(row[pk]) : String(i + 1);
              const title =
                row[tf] != null
                  ? String(row[tf])
                  : row.title != null
                    ? String(row.title)
                    : "—";
              return {
                id,
                title,
                subtitle: this.data.entityName + " · " + id
              };
            })
          : FALLBACK_ITEMS;
        this.setData({ items, loading: false });
      })
      .catch((err) => {
        this.setData({
          items: FALLBACK_ITEMS,
          loadError: err && err.message ? err.message : "拉取失败，已显示示例",
          loading: false
        });
      });
  },

  onTapItem(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({
      url: "${detailPath}?id=" + encodeURIComponent(String(id)) + "&entity=" + encodeURIComponent(this.data.entityName)
    });
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
