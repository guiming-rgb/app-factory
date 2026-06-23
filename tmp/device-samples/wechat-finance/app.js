// App 生产工厂 · 微信原生小程序最小模板（v2b）
App({
  globalData: {
    supabaseUrl: "",
    supabaseAnonKey: "",
    privacyAccepted: false
  },

  onLaunch() {
    const accepted = wx.getStorageSync("privacy_accepted");
    this.globalData.privacyAccepted = accepted === true || accepted === "true";
  }
});
