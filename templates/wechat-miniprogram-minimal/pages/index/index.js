const { isSupabaseConfigured } = require("../../utils/supabase");

Page({
  data: {
    showPrivacy: false,
    supabaseReady: false
  },

  onShow() {
    const app = getApp();
    const accepted = app.globalData.privacyAccepted;
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
