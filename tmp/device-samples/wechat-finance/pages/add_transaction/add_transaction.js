const { request, isSupabaseConfigured } = require("../../utils/supabase");

Page({
  data: {
    showPrivacy: false,
    submitting: false,
    error: "",
    table: "transactions",
    form: {
      title: "",
      amount: "",
      created_at: ""
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
      "title": d.title,
      "amount": parseFloat(d.amount) || 0,
      "created_at": d.created_at
    };
    this.setData({ submitting: true, error: "" });
    if (!isSupabaseConfigured()) {
      wx.showToast({ title: "已保存（本地演示）", icon: "success" });
      wx.navigateBack();
      return;
    }
    request(this.data.table, { method: "POST", body })
      .then(() => {
        wx.showToast({ title: "提交成功", icon: "success" });
        wx.navigateBack();
      })
      .catch((err) => {
        this.setData({ error: err?.message || "提交失败", submitting: false });
      });
  }
});
