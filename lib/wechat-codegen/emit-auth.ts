import { emitWechatFormPage } from "./emit-form";

/**
 * 微信小程序 Auth 页面生成（登录/注册）
 */
export function emitWechatLoginPage(displayName: string): {
  wxml: string; js: string; wxss: string;
} {
  const title = displayName.replace(/</g, "");

  const wxml = `<view class="page">
  <privacy-popup show="{{showPrivacy}}" bind:accept="onPrivacyAccept" />

  <view class="card" style="text-align:center; padding: 48rpx 0;">
    <text class="app-icon">📱</text>
    <view class="todo-title">${title}</view>
    <view class="muted">登录以使用完整功能</view>
  </view>

  <view class="card" wx:if="{{error}}">
    <text class="error-text">{{error}}</text>
  </view>

  <view class="card">
    <view class="form-row">
      <text class="form-label">邮箱</text>
      <input class="form-input" placeholder="请输入邮箱" value="{{email}}" bindinput="onEmail" type="text" />
    </view>
    <view class="form-row">
      <text class="form-label">密码</text>
      <input class="form-input" placeholder="请输入密码" value="{{password}}" bindinput="onPassword" type="password" />
    </view>
  </view>

  <view class="card">
    <button type="primary" bindtap="onLogin" loading="{{loading}}" disabled="{{loading}}">登录</button>
    <view class="form-link">
      <text bindtap="onGoRegister" class="link-text">没有账号？立即注册</text>
    </view>
  </view>
</view>`;

  const js = `const { request, isSupabaseConfigured } = require("../../utils/supabase");

Page({
  data: {
    showPrivacy: false,
    email: "",
    password: "",
    loading: false,
    error: ""
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

  onEmail(e) { this.setData({ email: e.detail.value }); },
  onPassword(e) { this.setData({ password: e.detail.value }); },

  onLogin() {
    const { email, password } = this.data;
    if (!email || !password) { this.setData({ error: "请填写邮箱和密码" }); return; }
    if (!isSupabaseConfigured()) {
      wx.showToast({ title: "Supabase 未配置", icon: "none" });
      return;
    }
    this.setData({ loading: true, error: "" });
    request("auth/v1/token?grant_type=password", {
      method: "POST",
      body: { email: email.trim(), password, gotrue_meta_security: {} }
    })
      .then((res) => {
        if (res.access_token) {
          wx.setStorageSync("supabase_token", res.access_token);
          wx.switchTab({ url: "/pages/index/index" });
        } else {
          this.setData({ error: "登录失败", loading: false });
        }
      })
      .catch((err) => {
        this.setData({ error: err?.message || "登录失败", loading: false });
      });
  },

  onGoRegister() {
    wx.navigateTo({ url: "/pages/register/register" });
  }
});
`;

  const wxss = `.app-icon { font-size: 64rpx; display: block; margin-bottom: 16rpx; }
.form-link { margin-top: 16rpx; text-align: center; }
.link-text { color: #7c3aed; font-size: 26rpx; }
.form-row { margin-bottom: 24rpx; }
.form-label { display: block; font-size: 28rpx; font-weight: 500; color: #374151; margin-bottom: 8rpx; }
.form-input { border: 1rpx solid #d1d5db; border-radius: 8rpx; padding: 16rpx; background: #fff; font-size: 28rpx; }
.error-text { color: #dc2626; font-size: 24rpx; }`;

  return { wxml, js, wxss };
}

export function emitWechatRegisterPage(displayName: string): {
  wxml: string; js: string; wxss: string;
} {
  const title = displayName.replace(/</g, "");
  const wxml = `<view class="page">
  <privacy-popup show="{{showPrivacy}}" bind:accept="onPrivacyAccept" />

  <view class="card" style="text-align:center; padding: 48rpx 0;">
    <view class="todo-title">加入 ${title}</view>
  </view>

  <view class="card" wx:if="{{error}}">
    <text class="error-text">{{error}}</text>
  </view>

  <view class="card">
    <view class="form-row">
      <text class="form-label">邮箱</text>
      <input class="form-input" placeholder="请输入邮箱" value="{{email}}" bindinput="onEmail" type="text" />
    </view>
    <view class="form-row">
      <text class="form-label">密码</text>
      <input class="form-input" placeholder="密码（至少6位）" value="{{password}}" bindinput="onPassword" type="password" />
    </view>
    <view class="form-row">
      <text class="form-label">确认密码</text>
      <input class="form-input" placeholder="再次输入密码" value="{{confirm}}" bindinput="onConfirm" type="password" />
    </view>
  </view>

  <view class="card">
    <button type="primary" bindtap="onRegister" loading="{{loading}}" disabled="{{loading}}">注册</button>
  </view>
</view>`;

  const js = `const { request, isSupabaseConfigured } = require("../../utils/supabase");

Page({
  data: { showPrivacy: false, email: "", password: "", confirm: "", loading: false, error: "" },

  onShow() {
    const app = getApp();
    this.setData({ showPrivacy: !app.globalData.privacyAccepted });
  },

  onPrivacyAccept() {
    getApp().globalData.privacyAccepted = true;
    wx.setStorageSync("privacy_accepted", true);
    this.setData({ showPrivacy: false });
  },

  onEmail(e) { this.setData({ email: e.detail.value }); },
  onPassword(e) { this.setData({ password: e.detail.value }); },
  onConfirm(e) { this.setData({ confirm: e.detail.value }); },

  onRegister() {
    const { email, password, confirm } = this.data;
    if (!email || !password) { this.setData({ error: "请填写邮箱和密码" }); return; }
    if (password !== confirm) { this.setData({ error: "两次密码不一致" }); return; }
    if (password.length < 6) { this.setData({ error: "密码至少6位" }); return; }
    if (!isSupabaseConfigured()) {
      wx.showToast({ title: "Supabase 未配置", icon: "none" });
      return;
    }
    this.setData({ loading: true, error: "" });
    request("auth/v1/signup", {
      method: "POST",
      body: { email: email.trim(), password }
    })
      .then(() => {
        wx.showToast({ title: "注册成功！", icon: "success" });
        wx.navigateBack();
      })
      .catch((err) => {
        this.setData({ error: err?.message || "注册失败", loading: false });
      });
  }
});
`;

  const wxss = `.form-link { margin-top: 16rpx; text-align: center; }
.link-text { color: #7c3aed; font-size: 26rpx; }
.form-row { margin-bottom: 24rpx; }
.form-label { display: block; font-size: 28rpx; font-weight: 500; color: #374151; margin-bottom: 8rpx; }
.form-input { border: 1rpx solid #d1d5db; border-radius: 8rpx; padding: 16rpx; background: #fff; font-size: 28rpx; }
.error-text { color: #dc2626; font-size: 24rpx; }`;

  return { wxml, js, wxss };
}
