// App 生产工厂 · 微信原生小程序最小模板（v2b）
const i18n = require('./utils/i18n');
const crashReporter = require('./utils/crash-reporter');

App({
  globalData: {
    supabaseUrl: "",
    supabaseAnonKey: "",
    privacyAccepted: false,
    locale: 'zh'
  },

  onLaunch() {
    const accepted = wx.getStorageSync("privacy_accepted");
    this.globalData.privacyAccepted = accepted === true || accepted === "true";

    // Initialize internationalization
    const locale = i18n.initLocale();
    this.globalData.locale = locale;

    // Initialize crash reporter
    crashReporter.init();
  }
});
