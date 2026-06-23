const { getConfig, isSupabaseConfigured } = require("./config");

/**
 * Supabase REST 只读封装（小程序无官方 SDK，走 HTTPS + anon key + RLS）
 * 合法域名须在微信公众平台配置 request 白名单。
 */
function request(path, options = {}) {
  if (!isSupabaseConfigured()) {
    return Promise.reject(new Error("Supabase 未配置：请在 app.js globalData 填入 URL 与 anon key"));
  }
  const { url, anonKey } = getConfig();
  const cleanPath = String(path || "").replace(/^\//, "");

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${url}/rest/v1/${cleanPath}`,
      method: options.method || "GET",
      header: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        "Content-Type": "application/json",
        Prefer: options.prefer || "return=representation",
        ...(options.header || {})
      },
      data: options.data,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          reject(
            new Error(
              `Supabase HTTP ${res.statusCode}: ${JSON.stringify(res.data)}`
            )
          );
        }
      },
      fail: reject
    });
  });
}

module.exports = {
  request,
  isSupabaseConfigured
};
