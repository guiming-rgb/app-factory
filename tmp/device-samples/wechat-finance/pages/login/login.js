const { request, isSupabaseConfigured } = require("../../utils/supabase");

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
