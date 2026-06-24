const { request, isSupabaseConfigured } = require("./supabase");

const STORAGE_QUEUE_KEY = "offline_queue";
const STORAGE_CACHE_PREFIX = "offline_cache_";

/**
 * 离线优先队列系统（微信小程序）
 *
 * 网络正常时：直接请求 Supabase，同时更新本地缓存。
 * 网络中断时：操作入队本地 storage，联网后自动重放。
 *
 * 依赖 wx.getNetworkType / wx.onNetworkStatusChange 检测网络。
 */

// ============================================================
// 队列管理
// ============================================================

/**
 * 将操作加入离线队列
 *
 * @param {{ table: string, method: string, data?: object }} operation
 *   table  — Supabase 表名
 *   method — "POST" | "PATCH" | "DELETE" | "GET"
 *   data   — 请求载荷（GET 时忽略）
 * @returns {number} 当前队列长度
 */
function enqueue(operation) {
  const queue = _readQueue();
  queue.push({
    table: operation.table,
    method: (operation.method || "POST").toUpperCase(),
    data: operation.data || null,
    timestamp: Date.now()
  });
  wx.setStorageSync(STORAGE_QUEUE_KEY, JSON.stringify(queue));
  return queue.length;
}

/**
 * 重放整个队列：逐条尝试请求 Supabase，成功后移除。
 *
 * 遇网络错误会停止并保留剩余队列，下次联网时继续。
 * 每条操作注入 `Prefer: resolution=merge-duplicates` 防重复。
 *
 * @returns {Promise<{ processed: number, failed: number, errors: string[] }>}
 */
async function processQueue() {
  if (!isSupabaseConfigured()) {
    return { processed: 0, failed: 0, errors: ["Supabase 未配置"] };
  }
  if (!(await _isOnline())) {
    return { processed: 0, failed: 0, errors: [] };
  }

  const queue = _readQueue();
  if (queue.length === 0) {
    return { processed: 0, failed: 0, errors: [] };
  }

  const errors = [];
  let processed = 0;
  let failed = 0;
  const remaining = [];

  for (const op of queue) {
    try {
      const path = _buildPath(op.table, op.method, op.data);
      await request(path, {
        method: op.method,
        data: op.method !== "GET" && op.method !== "DELETE" ? op.data : undefined,
        prefer: "resolution=merge-duplicates"
      });

      // 成功后尝试更新本地缓存
      if (op.data && op.method !== "DELETE") {
        _saveSingleToCache(op.table, op.data);
      }
      processed++;
    } catch (e) {
      // 网络类异常 — 保留剩余队列，下次继续
      const msg = e instanceof Error ? e.message : String(e);
      if (_isNetworkError(msg)) {
        remaining.push(op);
        // 当前及后续操作都保留
        remaining.push(...queue.slice(queue.indexOf(op) + 1));
        failed = queue.length - processed;
        errors.push(msg);
        break;
      }
      // 业务类错误 — 跳过该条
      failed++;
      errors.push(`[${op.method}] ${op.table}: ${msg}`);
    }
  }

  wx.setStorageSync(STORAGE_QUEUE_KEY, JSON.stringify(remaining));
  return { processed, failed, errors };
}

/**
 * @returns {number} 当前队列中待处理的操作数
 */
function getQueueLength() {
  return _readQueue().length;
}

/**
 * 清空所有待处理队列
 */
function clearQueue() {
  wx.setStorageSync(STORAGE_QUEUE_KEY, JSON.stringify([]));
}

// ============================================================
// 本地缓存
// ============================================================

/**
 * 将数据写入本地 storage（JSON 序列化）
 *
 * @param {string} key   存储键
 * @param {*}      data  任意 JSON 可序列化数据
 */
function saveToLocal(key, data) {
  try {
    wx.setStorageSync(key, JSON.stringify(data));
  } catch (e) {
    console.warn("[offline-queue] saveToLocal 失败", e);
  }
}

/**
 * 从本地 storage 读取数据（JSON 反序列化）
 *
 * @param {string} key
 * @returns {*|null} 不存在或解析失败返回 null
 */
function getFromLocal(key) {
  try {
    const raw = wx.getStorageSync(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn("[offline-queue] getFromLocal 失败", e);
    return null;
  }
}

/**
 * 优先请求 Supabase，网络不可用时回退到本地缓存
 *
 * @param {string} table  表名
 * @param {string} [query] 查询参数如 "id=eq.xxx&select=*"
 * @returns {Promise<*|null>}
 */
async function offlineFetch(table, query) {
  const cacheKey = STORAGE_CACHE_PREFIX + table + (query ? "?" + query : "");

  if (!(await _isOnline()) || !isSupabaseConfigured()) {
    return getFromLocal(cacheKey);
  }

  try {
    const path = _buildPath(table, "GET", null, query);
    const data = await request(path, { method: "GET" });
    // 写入缓存供离线使用
    saveToLocal(cacheKey, data);
    return data;
  } catch (e) {
    console.warn("[offline-queue] 请求失败，回退本地缓存", e);
    return getFromLocal(cacheKey);
  }
}

// ============================================================
// 网络状态
// ============================================================

/**
 * @returns {Promise<boolean>} 当前是否在线
 */
function isOnline() {
  return _isOnline();
}

/**
 * 当前是否在线（同步 Promise 版）
 * @returns {Promise<boolean>}
 */
function _isOnline() {
  return new Promise((resolve) => {
    wx.getNetworkType({
      success: (res) => {
        resolve(res.networkType !== "none");
      },
      fail: () => resolve(true) // 无法检测时默认在线
    });
  });
}

/**
 * 监听网络状态变化，恢复时自动重放队列
 *
 * @param {function(boolean): void} callback  每次网络变化时调用
 * @returns {function(): void} 取消监听的函数
 */
function onNetworkChange(callback) {
  const handler = (res) => {
    const online = res.networkType !== "none";
    callback(online);
    if (online) {
      // 队列重放不阻塞回调
      processQueue().catch(() => {});
    }
  };
  wx.onNetworkStatusChange(handler);

  // 返回取消函数
  return () => {
    wx.offNetworkStatusChange(handler);
  };
}

// ============================================================
// 内部工具
// ============================================================

/** 读取 storage 中的队列 */
function _readQueue() {
  try {
    const raw = wx.getStorageSync(STORAGE_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

/**
 * 构建 Supabase REST 路径
 *
 * @param {string} table
 * @param {string} method
 * @param {object} [data]
 * @param {string} [query]
 * @returns {string}
 */
function _buildPath(table, method, data, query) {
  let path = table;
  if ((method === "PATCH" || method === "DELETE") && data && data.id) {
    path += "?id=eq." + encodeURIComponent(String(data.id));
  }
  if (query) {
    path += (path.includes("?") ? "&" : "?") + query;
  }
  return path;
}

/**
 * 写入单条至本地缓存（按 id 合并）
 */
function _saveSingleToCache(table, data) {
  if (!data || !data.id) return;
  const key = STORAGE_CACHE_PREFIX + table;
  const existing = getFromLocal(key);
  if (Array.isArray(existing)) {
    const idx = existing.findIndex((item) => item && item.id === data.id);
    if (idx >= 0) {
      existing[idx] = data;
    } else {
      existing.push(data);
    }
    saveToLocal(key, existing);
  } else {
    saveToLocal(key, [data]);
  }
}

/**
 * 粗略判断错误是否为网络不可达
 * @param {string} msg
 * @returns {boolean}
 */
function _isNetworkError(msg) {
  const keywords = ["request:fail", "timeout", "ETIMEDOUT", "ENOTFOUND", "网络", "network"];
  return keywords.some((k) => msg.toLowerCase().includes(k.toLowerCase()));
}

module.exports = {
  enqueue,
  processQueue,
  getQueueLength,
  clearQueue,
  saveToLocal,
  getFromLocal,
  isOnline,
  onNetworkChange,
  offlineFetch
};
