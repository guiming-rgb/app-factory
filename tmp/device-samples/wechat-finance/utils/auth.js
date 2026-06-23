/**
 * wx.login 占位：正式环境需自建后端 code2session，勿在小程序内保存 secret。
 */
function loginPlaceholder() {
  return new Promise((resolve, reject) => {
    wx.login({
      success(res) {
        if (res.code) {
          resolve({
            code: res.code,
            session: null,
            hint: "请将 code 发往服务端换取 openid/session（未实现）"
          });
        } else {
          reject(new Error("wx.login 未返回 code"));
        }
      },
      fail: reject
    });
  });
}

module.exports = {
  loginPlaceholder
};
