/**
 * 微信小程序订阅消息工具
 * Q2-M4: 模板消息订阅管理
 *
 * 使用方式:
 *   const push = require('../../utils/push');
 *   await push.sendSubscribeRequest(['tpl_id_1', 'tpl_id_2']);
 *
 * 前置条件:
 *   1. 登录微信公众平台 → 功能 → 订阅消息 → 选用模板
 *   2. 在 app.json 中配置所需 subscribeMessage 能力
 *   3. 模板消息需在服务端对接微信 API 发送（不可在小程序端直接发送）
 *
 * 注意:
 *   - 一次性订阅：用户点击"总是保持以上选择，不再询问"后，后续 requestSubscribeMessage
 *     不再弹窗，但开发者需自行记录 tmplIds 的 accept 状态。
 *   - 长期订阅（政务/民生类）需灰度白名单，不可滥用。
 */

const SUBSCRIBE_STORAGE_KEY = "subscribe_status";

/**
 * 调用 wx.requestSubscribeMessage 请求用户订阅。
 *
 * @param {string[]} tmplIds - 微信模板 ID 数组
 * @returns {Promise<Object|null>} 订阅结果 { tmplId: "accept" | "reject" | "ban" }，失败返回 null
 */
function subscribeMessage(tmplIds) {
  if (!Array.isArray(tmplIds) || tmplIds.length === 0) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    wx.requestSubscribeMessage({
      tmplIds,
      success(res) {
        // res 格式：{ errMsg: "requestSubscribeMessage:ok", TMPL_ID: "accept" }
        resolve(res);
      },
      fail(err) {
        console.error("[push] subscribeMessage 失败:", err);
        resolve(null);
      },
    });
  });
}

/**
 * 处理订阅结果，提取每个模板的状态，记录到本地存储。
 *
 * 状态含义：
 *   - "accept": 用户同意订阅
 *   - "reject": 用户拒绝
 *   - "ban": 用户选择"不再询问"
 *
 * @param {Object} result - subscribeMessage 的 success 回调数据
 * @returns {Object} 每个模板的状态映射
 */
function onSubscribe(result) {
  if (!result || typeof result !== "object") {
    return {};
  }

  const status = {};
  const existing = getStoredSubscriptions();

  for (const key of Object.keys(result)) {
    if (key === "errMsg") continue;
    status[key] = result[key];
    existing[key] = {
      status: result[key],
      updatedAt: Date.now(),
    };
  }

  wx.setStorageSync(SUBSCRIBE_STORAGE_KEY, existing);
  return status;
}

/**
 * 提示用户订阅模板消息（subscribe + onSubscribe 一步完成）。
 *
 * 自动判断哪些模板需要请求（跳过 status 为 "ban" 的模板）。
 *
 * @param {string[]} tmplIds - 微信模板 ID 数组
 * @returns {Promise<Object|null>} 映射结果 { tmplId: "accept" | "reject" | "ban" }
 */
async function sendSubscribeRequest(tmplIds) {
  if (!Array.isArray(tmplIds) || tmplIds.length === 0) {
    return null;
  }

  try {
    const result = await subscribeMessage(tmplIds);
    if (!result) {
      return null;
    }

    return onSubscribe(result);
  } catch (err) {
    console.error("[push] sendSubscribeRequest 失败:", err);
    return null;
  }
}

/**
 * 检查当前用户已订阅的模板状态。
 *
 * 通过本地存储查询，辅以 wx.getSetting 确认订阅消息能力。
 *
 * @returns {Promise<Object>} 每个模板的存储状态 { tmplId: { status, updatedAt } }
 */
async function checkSubscribeStatus() {
  try {
    // 检查微信是否支持订阅消息
    const setting = await new Promise((resolve) => {
      wx.getSetting({
        withSubscriptions: true,
        success: resolve,
        fail: () => resolve({ subscriptionsSetting: {} }),
      });
    });

    const stored = getStoredSubscriptions();

    // 如果有远程状态（微信返回的），合并到本地
    const remoteSubs = setting.subscriptionsSetting || {};
    const itemSettings = remoteSubs.itemSettings || {};
    for (const [tmplId, settingStatus] of Object.entries(itemSettings)) {
      stored[tmplId] = {
        status: settingStatus === "accept" ? "accept" : "reject",
        updatedAt: Date.now(),
      };
    }

    wx.setStorageSync(SUBSCRIBE_STORAGE_KEY, stored);
    return stored;
  } catch (err) {
    console.error("[push] checkSubscribeStatus 失败:", err);
    return getStoredSubscriptions();
  }
}

/**
 * 判断是否需要再次提醒用户订阅。
 *
 * 如果用户上次拒绝（reject）或选择不再询问（ban），且距离上次已超过 7 天，
 * 则返回 true，可以再次弹出引导。
 *
 * @returns {boolean} true 表示可以再次引导订阅
 */
function shouldRemindSubscribe() {
  try {
    const stored = getStoredSubscriptions();
    const now = Date.now();
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

    // 如果从未请求过订阅，应该提示
    if (Object.keys(stored).length === 0) {
      return true;
    }

    // 检查是否有"不再询问"的模板
    for (const entry of Object.values(stored)) {
      const { status, updatedAt } = /** @type {{ status: string, updatedAt: number }} */ (entry);
      if (status === "ban") {
        if (now - updatedAt >= SEVEN_DAYS) {
          return true;
        }
        return false;
      }
      if (status === "reject") {
        if (now - updatedAt >= SEVEN_DAYS) {
          return true;
        }
      }
    }

    // 所有已订阅的模板都是 accepted，不需要提醒
    return false;
  } catch (err) {
    console.error("[push] shouldRemindSubscribe 失败:", err);
    return false;
  }
}

// =========================================================================
// 内部辅助
// =========================================================================

/**
 * 从本地存储读取订阅状态。
 *
 * @returns {Object<string, { status: string, updatedAt: number }>}
 */
function getStoredSubscriptions() {
  try {
    const raw = wx.getStorageSync(SUBSCRIBE_STORAGE_KEY);
    return (raw && typeof raw === "object") ? raw : {};
  } catch {
    return {};
  }
}

module.exports = {
  subscribeMessage,
  onSubscribe,
  sendSubscribeRequest,
  checkSubscribeStatus,
  shouldRemindSubscribe,
};
