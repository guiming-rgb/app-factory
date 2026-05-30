import type { AppSpec, AppSpecScreen } from "@/lib/app-spec/types";
import {
  buildEntityListRows,
  resolveEntityForScreen
} from "@/lib/app-spec/entity-scaffold";

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
    <view class="muted">${entityLine} · 列表示例（非占位）</view>
  </view>

  <view class="card" wx:if="{{items.length === 0}}">
    <view class="empty">暂无数据</view>
  </view>

  <block wx:for="{{items}}" wx:key="id">
    <view class="card list-item">
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

  return `const { isSupabaseConfigured } = require("../../utils/supabase");

Page({
  data: {
    showPrivacy: false,
    supabaseReady: false,
    items: [
${items}
    ]
  },

  onShow() {
    const app = getApp();
    const accepted = !!app.globalData.privacyAccepted;
    this.setData({
      showPrivacy: !accepted,
      supabaseReady: isSupabaseConfigured()
    });
  },

  onPrivacyAccept() {
    const app = getApp();
    app.globalData.privacyAccepted = true;
    wx.setStorageSync("privacy_accepted", true);
    this.setData({ showPrivacy: false });
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
