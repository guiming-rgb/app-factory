const { request, isSupabaseConfigured } = require("../../utils/supabase");

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
