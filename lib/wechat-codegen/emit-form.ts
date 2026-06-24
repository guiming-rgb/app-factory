import type { AppSpec, AppSpecScreen } from "@/lib/app-spec/types";
import { resolveEntityForScreen, entityTableName } from "@/lib/app-spec/entity-scaffold";
import { detectIndustry } from "@/lib/flutter-codegen/emit-industry";
import type { IndustryCategory } from "@/lib/flutter-codegen/emit-industry";

/**
 * 微信小程序 Form 页面生成 — P2-2: 接入 industry service
 */

function esc(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, " ");
}

/** 将 IndustryCategory 映射到微信 industry.js 中的 service 名 */
function industryServiceName(industry: IndustryCategory): string {
  if (industry === "generic") return "null";
  const map: Record<string, string> = {
    finance: "financeService", crm: "crmService", fitness: "fitnessService",
    ecommerce: "ecommerceService", education: "educationService",
    social: "socialService", food: "foodService", hotel: "hotelService",
    recruitment: "recruitmentService", property: "propertyService",
    video: "videoService", weather: "weatherService", sports: "sportsService",
    photo: "photoService", dating: "datingService", medical: "medicalService",
    blog: "blogService", game: "gameService", payment: "paymentService",
  };
  return map[industry] ?? "null";
}

export function emitWechatFormPage(
  screen: AppSpecScreen,
  spec: AppSpec
): { wxml: string; js: string; wxss: string } {
  const entity = resolveEntityForScreen(spec, screen);
  const industry = detectIndustry(spec as unknown as Record<string, unknown>);
  const serviceName = industryServiceName(industry);
  const hasService = serviceName !== "null";

  const fields = entity?.fields?.filter((f) => !f.primary || f.name !== "id") ?? [
    { name: "title", type: "string" },
    { name: "note", type: "string" }
  ];

  const title = esc(screen.title);
  const table = entity ? esc(entityTableName(entity)) : "items";

  // WXML: 动态表单（不变）
  const inputs = fields.map((f) => {
    const t = f.type.toLowerCase();
    const name = esc(f.name);
    if (t === "bool" || t === "boolean") {
      return `    <view class="form-row">
      <text class="form-label">${name}</text>
      <switch checked="{{form.${name}}}" bindchange="onSwitch" data-field="${name}" />
    </view>`;
    }
    if (t === "int" || t === "integer" || t === "float" || t === "number") {
      return `    <view class="form-row">
      <text class="form-label">${name}</text>
      <input class="form-input" placeholder="请输入${name}" value="{{form.${name}}}" bindinput="onFieldInput" data-field="${name}" type="digit" />
    </view>`;
    }
    return `    <view class="form-row">
      <text class="form-label">${name}</text>
      <input class="form-input" placeholder="请输入${name}" value="{{form.${name}}}" bindinput="onFieldInput" data-field="${name}" />
    </view>`;
  }).join("\n");

  const wxml = `<view class="page">
  <privacy-popup show="{{showPrivacy}}" bind:accept="onPrivacyAccept" />

  <view class="card">
    <view class="todo-title">${title}</view>
    <view class="muted">填写以下信息并提交</view>
  </view>

  <view class="card">
${inputs}
  </view>

  <view class="card">
    <button type="primary" bindtap="onSubmit" loading="{{submitting}}" disabled="{{submitting}}">
      {{submitting ? '提交中…' : '提交'}}
    </button>
  </view>

  <view class="card" wx:if="{{error}}">
    <text class="error-text">{{error}}</text>
  </view>
</view>`;

  // JS
  const fieldDefaults = fields.map((f) => {
    const t = f.type.toLowerCase();
    if (t === "bool" || t === "boolean") return `      ${esc(f.name)}: false`;
    return `      ${esc(f.name)}: ""`;
  }).join(",\n");

  const buildData = fields.map((f) => {
    const name = esc(f.name);
    const t = f.type.toLowerCase();
    if (t === "int" || t === "integer") return `      "${name}": parseInt(d.${name}) || 0`;
    if (t === "float" || t === "number") return `      "${name}": parseFloat(d.${name}) || 0`;
    return `      "${name}": d.${name}`;
  }).join(",\n");

  // P2-2: 有行业 service 时通过 service 提交；否则 fallback 到原始 request
  const serviceRequire = hasService
    ? `const { ${serviceName} } = require("../../services/industry");`
    : "";
  const submitLogic = hasService
    ? `      ${serviceName}.create(body)
        .then(() => {
          wx.showToast({ title: "提交成功", icon: "success" });
          wx.navigateBack();
        })
        .catch((err) => {
          this.setData({ error: err?.message || "提交失败", submitting: false });
        });`
    : `      request(this.data.table, { method: "POST", body })
        .then(() => {
          wx.showToast({ title: "提交成功", icon: "success" });
          wx.navigateBack();
        })
        .catch((err) => {
          this.setData({ error: err?.message || "提交失败", submitting: false });
        });`;

  const js = `const { request, isSupabaseConfigured } = require("../../utils/supabase");
${serviceRequire}
Page({
  data: {
    showPrivacy: false,
    submitting: false,
    error: "",
    table: "${table}",
    form: {
${fieldDefaults}
    }
  },

  onShow() {
    const app = getApp();
    this.setData({ showPrivacy: !app.globalData.privacyAccepted });
  },

  onPrivacyAccept() {
    getApp().globalData.privacyAccepted = true;
    wx.setStorageSync("privacy_accepted", true);
    this.setData({ showPrivacy: false });
  },

  onSwitch(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ ["form." + field]: e.detail.value });
  },

  onFieldInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ ["form." + field]: e.detail.value });
  },

  onSubmit() {
    const d = this.data.form;
    const body = {
${buildData}
    };
    this.setData({ submitting: true, error: "" });
    if (!isSupabaseConfigured()) {
      wx.showToast({ title: "已保存（本地演示）", icon: "success" });
      wx.navigateBack();
      return;
    }
${submitLogic}
  }
});
`;

  const wxss = `.form-row {
  margin-bottom: 24rpx;
}
.form-label {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8rpx;
}
.form-input {
  border: 1rpx solid #d1d5db;
  border-radius: 8rpx;
  padding: 16rpx;
  background: #fff;
  font-size: 28rpx;
}
.error-text {
  color: #dc2626;
  font-size: 24rpx;
}`;

  return { wxml, js, wxss };
}
