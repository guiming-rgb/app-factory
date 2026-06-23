const { loginPlaceholder } = require("../../utils/auth");

Page({
  onLoginTap() {
    loginPlaceholder()
      .then((result) => {
        wx.showModal({
          title: "wx.login 占位",
          content: `已获取 code（前 8 位）：${String(result.code).slice(0, 8)}…\n${result.hint}`,
          showCancel: false
        });
      })
      .catch((err) => {
        wx.showToast({
          title: err.message || "登录失败",
          icon: "none"
        });
      });
  }
});
