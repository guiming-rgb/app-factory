/**
 * App 分析面板 SDK — 微信小程序埋点服务
 *
 * 功能：
 * - 页面浏览 / 自定义事件 / 错误 / 用户属性 / 会话追踪
 * - 批量上报：每 30 秒或队列满 20 条时自动刷入
 * - 离线感知：wx.setStorageSync 暂存，网络恢复后自动推送
 * - 安全：所有网络请求 try/catch，绝不阻塞业务
 *
 * 依赖 ./supabase.js（提供 request()）
 * 依赖 wx API
 */

const { request } = require("./supabase");

// ============================================================
// 配置
// ============================================================

const STORAGE_QUEUE_KEY = "analytics_queue";
const STORAGE_SESSION_KEY = "analytics_session_id";

/** 自动刷入间隔（毫秒） */
const FLUSH_INTERVAL_MS = 30000;

/** 队列满 20 条立即刷入 */
const FLUSH_BATCH_SIZE = 20;

// ============================================================
// 内部状态
// ============================================================

let _appId = "";
let _userId = "";
let _sessionId = "";
let _sessionStart = 0;
let _flushTimer = null;
let _isOnline = true;

// ============================================================
// 公共 API
// ============================================================

/**
 * 初始化分析服务
 *
 * @param {string} appId  当前 App 的唯一标识（由工厂后台分配）
 */
function init(appId) {
  _appId = appId || "";
  _sessionId = _loadOrCreateSessionId();
  _sessionStart = Date.now();

  // 加载存储中的待发送队列
  _initQueueFromStorage();

  // 启动定时刷入
  _startFlushTimer();

  // 监听网络状态
  _setupNetworkListener();

  // 上报会话开始
  _enqueue({
    app_id: _appId,
    event_type: "session_start",
    event_name: "",
    screen_name: "",
    properties: {},
    user_id: _userId,
    session_id: _sessionId,
    device_info: _getDeviceInfo()
  });
}

/**
 * 追踪页面浏览
 *
 * @param {string} name   页面名称（如 "home", "product_detail"）
 * @param {object} [extra] 附加属性
 */
function trackScreen(name, extra) {
  if (!_appId) return;
  _enqueue({
    app_id: _appId,
    event_type: "screen_view",
    event_name: "",
    screen_name: name || "unknown",
    properties: extra || {},
    user_id: _userId,
    session_id: _sessionId,
    device_info: _getDeviceInfo()
  });
}

/**
 * 追踪自定义事件（按钮点击、购买、收藏等）
 *
 * @param {string} name        事件名（如 "button_click", "purchase_complete"）
 * @param {object} [properties] 附加属性
 */
function trackEvent(name, properties) {
  if (!_appId) return;
  _enqueue({
    app_id: _appId,
    event_type: "custom_event",
    event_name: name || "unknown",
    screen_name: "",
    properties: properties || {},
    user_id: _userId,
    session_id: _sessionId,
    device_info: _getDeviceInfo()
  });
}

/**
 * 追踪错误
 *
 * @param {string} error        错误描述
 * @param {string} [stack]      可选的堆栈信息
 */
function trackError(error, stack) {
  if (!_appId) return;
  const props = { message: error || "unknown" };
  if (stack) props.stack_trace = stack;
  _enqueue({
    app_id: _appId,
    event_type: "error",
    event_name: "",
    screen_name: "",
    properties: props,
    user_id: _userId,
    session_id: _sessionId,
    device_info: _getDeviceInfo()
  });
}

/**
 * 设置用户标识
 *
 * @param {string} uid  用户唯一标识（由业务系统分配）
 */
function setUserId(uid) {
  _userId = uid || "";
}

/**
 * 获取当前会话时长（秒）
 *
 * @returns {number}
 */
function getSessionDuration() {
  if (!_sessionStart) return 0;
  return Math.floor((Date.now() - _sessionStart) / 1000);
}

/**
 * 强制立即刷入队列
 *
 * @returns {Promise<number>} 成功刷入的事件数，失败返回 0
 */
function flush() {
  return _doFlush();
}

// ============================================================
// 内部
// ============================================================

/**
 * 入队一条事件，满 FLUSH_BATCH_SIZE 条则立即刷入
 */
function _enqueue(event) {
  if (!_appId) return;
  const queue = _readQueue();
  queue.push(event);
  _saveQueue(queue);

  if (queue.length >= FLUSH_BATCH_SIZE) {
    _doFlush().catch(function () {});
  }
}

/**
 * 实际向服务端刷入（通过自定义 API 端点写入 Supabase）
 *
 * 直接将事件数组 POST 到 /api/analytics/events。
 * 网络不可用时保留队列。
 */
function _doFlush() {
  const queue = _readQueue();
  if (queue.length === 0) return Promise.resolve(0);
  if (!_isOnline) return Promise.resolve(0);

  return new Promise(function (resolve) {
    // 清空本地队列（避免重复发送）
    _saveQueue([]);

    wx.request({
      url: getApp().globalData.analyticsEndpoint || "https://__SUPABASE_URL__/functions/v1/analytics-events",
      method: "POST",
      header: {
        "Content-Type": "application/json",
        "x-analytics-key": _appId
      },
      data: { events: queue },
      success: function () {
        resolve(queue.length);
      },
      fail: function () {
        // 失败时重新入队
        const existing = _readQueue();
        _saveQueue(existing.concat(queue));
        resolve(0);
      }
    });
  });
}

/**
 * 从 wx.setStorageSync 读取队列
 */
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
 * 保存队列到 wx.setStorageSync
 */
function _saveQueue(queue) {
  try {
    wx.setStorageSync(STORAGE_QUEUE_KEY, JSON.stringify(queue));
  } catch (_) {
    // 存储空间不足时静默丢弃
  }
}

/**
 * 初始化时合并存储中的旧队列到内存
 */
function _initQueueFromStorage() {
  // 仅确保队列存储是有效 JSON
  const queue = _readQueue();
  if (!Array.isArray(queue)) {
    _saveQueue([]);
  }
}

/**
 * 加载或创建会话 ID（持久化，App 生命周期内唯一）
 */
function _loadOrCreateSessionId() {
  try {
    const existing = wx.getStorageSync(STORAGE_SESSION_KEY);
    if (existing) return existing;
    const newId = _generateId();
    wx.setStorageSync(STORAGE_SESSION_KEY, newId);
    return newId;
  } catch (_) {
    return _generateId();
  }
}

/**
 * 启动定时刷入
 */
function _startFlushTimer() {
  if (_flushTimer) {
    clearInterval(_flushTimer);
  }
  _flushTimer = setInterval(function () {
    const queue = _readQueue();
    if (queue.length > 0 && _isOnline) {
      _doFlush().catch(function () {});
    }
  }, FLUSH_INTERVAL_MS);
}

/**
 * 监听网络状态变化
 */
function _setupNetworkListener() {
  wx.onNetworkStatusChange(function (res) {
    const wasOffline = !_isOnline;
    _isOnline = res.networkType !== "none";
    if (_isOnline && wasOffline) {
      const queue = _readQueue();
      if (queue.length > 0) {
        _doFlush().catch(function () {});
      }
    }
  });

  // 初始检测
  wx.getNetworkType({
    success: function (res) {
      _isOnline = res.networkType !== "none";
    },
    fail: function () {
      _isOnline = true;
    }
  });
}

/**
 * 收集设备信息（使用 wx.getSystemInfoSync）
 */
function _getDeviceInfo() {
  try {
    const info = wx.getSystemInfoSync();
    return {
      model: info.model || "",
      system: info.system || "",
      platform: info.platform || "",
      SDKVersion: info.SDKVersion || "",
      brand: info.brand || "",
      language: info.language || "",
      pixelRatio: info.pixelRatio || 1
    };
  } catch (_) {
    return {};
  }
}

/**
 * 生成简易 ID
 */
function _generateId() {
  return Date.now() + "_" + Math.random().toString(36).slice(2, 9);
}

module.exports = {
  init,
  trackScreen,
  trackEvent,
  trackError,
  setUserId,
  getSessionDuration,
  flush
};
