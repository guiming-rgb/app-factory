const { request } = require("../../utils/supabase");
const { financeService } = require("../../services/industry");

Page({
  data: {
    showPrivacy: false,
    summary: { total: 0, "amount": 0 },
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
      const rows = await financeService.list();
      const recent = (rows || []).map(r => ({ ...r, id: String(r.id) }));
      const summary = { total: recent.length , "amount": (rows || []).reduce((s, r) => s + (Number(r["amount"]) || 0), 0) };
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
