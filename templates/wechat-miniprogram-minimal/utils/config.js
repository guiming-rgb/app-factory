/** Supabase 等运行配置（与工厂 .env.local 对齐，由 Generator 或 project.private.config 覆写） */
const DEFAULT = {
  supabaseUrl: "",
  supabaseAnonKey: ""
};

function getConfig() {
  const app = getApp();
  const g = (app && app.globalData) || {};
  return {
    url: (g.supabaseUrl || DEFAULT.supabaseUrl).replace(/\/$/, ""),
    anonKey: g.supabaseAnonKey || DEFAULT.supabaseAnonKey
  };
}

function isSupabaseConfigured() {
  const { url, anonKey } = getConfig();
  return Boolean(url && anonKey);
}

module.exports = {
  DEFAULT,
  getConfig,
  isSupabaseConfigured
};
