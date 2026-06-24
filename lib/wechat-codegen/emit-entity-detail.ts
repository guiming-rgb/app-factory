import type { AppSpecEntity } from "@/lib/app-spec/entity-scaffold";
import {
  entityTableName,
  listTitleField,
  primaryKeyField,
  supabaseSelectColumns
} from "@/lib/app-spec/entity-scaffold";
import type { IndustryCategory } from "@/lib/flutter-codegen/emit-industry";
import {
  wechatIndustryRequireLine,
  wechatIndustryServiceName
} from "./industry-bindings";

function escJs(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, " ");
}

export const ENTITY_DETAIL_PAGE_PATH = "pages/entity-detail/entity-detail";

export function emitEntityDetailWxml(): string {
  return `<view class="page">
  <view class="card">
    <view class="todo-title">详情</view>
    <view class="muted">{{entityName}} · {{recordId}}</view>
  </view>
  <view class="card" wx:if="{{loading}}">
    <view class="muted">加载中…</view>
  </view>
  <view class="card" wx:elif="{{error}}">
    <view class="empty">{{error}}</view>
  </view>
  <view class="card" wx:elif="{{record}}">
    <view class="list-item-title">{{displayTitle}}</view>
    <block wx:for="{{fieldRows}}" wx:key="key">
      <view class="muted" style="margin-top:8px">{{item.key}}: {{item.value}}</view>
    </block>
  </view>
  <view class="card" wx:else>
    <view class="empty">未找到记录</view>
  </view>
</view>
`;
}

function applyRecordToPage(record: string): string {
  return `
        const titleField = this.data.titleField;
        const displayTitle =
          record && record[titleField] != null
            ? String(record[titleField])
            : record && record.title != null
              ? String(record.title)
              : "—";
        const fieldRows = record
          ? this.data.fieldDefs.map((f) => ({
              key: f.key,
              value: record[f.prop] != null ? String(record[f.prop]) : "—"
            }))
          : [];
        this.setData({ record, displayTitle, fieldRows, loading: false });`;
}

export function emitEntityDetailJs(
  entity: AppSpecEntity,
  industry: IndustryCategory = "generic"
): string {
  const table = escJs(entityTableName(entity));
  const entityName = escJs(entity.name);
  const pk = escJs(primaryKeyField(entity));
  const titleField = escJs(listTitleField(entity));
  const select = escJs(supabaseSelectColumns(entity));
  const fields = entity.fields
    .map((f) => `{ key: "${escJs(f.name)}", prop: "${escJs(f.name)}" }`)
    .join(",\n      ");

  const industryRequire = wechatIndustryRequireLine(industry);
  const serviceName = wechatIndustryServiceName(industry);
  const useIndustryService = !!serviceName;

  const loadBody = useIndustryService
    ? `    ${serviceName}.get(recordId)
      .then((record) => {${applyRecordToPage("record")}
      })
      .catch((err) => {
        this.setData({
          error: err && err.message ? err.message : "加载失败",
          loading: false
        });
      });`
    : `    const filter = encodeURIComponent(this.data.pk + "=eq." + recordId);
    request(
      this.data.table + "?select=${select}&" + filter,
      { method: "GET" }
    )
      .then((rows) => {
        const list = Array.isArray(rows) ? rows : [];
        const record = list[0] || null;${applyRecordToPage("record")}
      })
      .catch((err) => {
        this.setData({
          error: err && err.message ? err.message : "加载失败",
          loading: false
        });
      });`;

  return `const { request, isSupabaseConfigured } = require("../../utils/supabase");
${industryRequire}
Page({
  data: {
    entityName: "${entityName}",
    table: "${table}",
    pk: "${pk}",
    titleField: "${titleField}",
    recordId: "",
    displayTitle: "",
    loading: false,
    error: "",
    record: null,
    fieldDefs: [
      ${fields}
    ],
    fieldRows: []
  },

  onLoad(query) {
    const recordId = query.id ? String(query.id) : "";
    const entity = query.entity ? String(query.entity) : "${entityName}";
    this.setData({ recordId, entityName: entity });
    if (recordId) this.loadRecord(recordId);
  },

  loadRecord(recordId) {
    if (!isSupabaseConfigured()) {
      this.setData({
        error: "Supabase 未配置：请在 app.js globalData 填入 URL 与 anon key",
        loading: false
      });
      return;
    }
    this.setData({ loading: true, error: "" });
${loadBody}
  }
});
`;
}

export function emitEntityDetailJson(): string {
  return JSON.stringify({ navigationBarTitleText: "详情" }, null, 2) + "\n";
}
