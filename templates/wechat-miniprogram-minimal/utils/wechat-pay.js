/**
 * 微信小程序支付 JSAPI 工具
 * Q2-M2: 对接真实微信支付流程
 *
 * 使用方式:
 *   const { requestPayment, createOrder } = require('../../utils/wechat-pay');
 *   await createOrder({ amount: 100, description: '测试商品' });
 *
 * 前置条件:
 *   1. 微信商户号已开通 JSAPI 支付
 *   2. 后端有 /api/payment/wechat/prepay 接口
 *   3. app.json 已配置 payment 能力
 */

const { request } = require('./supabase');

/**
 * 统一下单 → 获取 prepay 参数 → 拉起支付
 */
async function requestPayment(options = {}) {
  const {
    amount = 0,        // 单位：分
    description = '',
    orderId = '',
    currency = 'CNY',
  } = options;

  if (!amount || amount <= 0) {
    throw new Error('金额必须大于 0');
  }

  try {
    // Step 1: 调用后端预下单接口
    const prepayResult = await request('rpc/wechat_prepay', {
      method: 'POST',
      data: {
        amount,
        description,
        order_id: orderId,
        currency,
      },
    });

    if (!prepayResult || prepayResult.error) {
      throw new Error(prepayResult?.error || '预下单失败');
    }

    // Step 2: 拉起微信支付
    const payParams = {
      timeStamp: String(prepayResult.timeStamp || ''),
      nonceStr: String(prepayResult.nonceStr || ''),
      package: String(prepayResult.package || ''),
      signType: String(prepayResult.signType || 'RSA'),
      paySign: String(prepayResult.paySign || ''),
    };

    return new Promise((resolve, reject) => {
      wx.requestPayment({
        ...payParams,
        success(res) {
          resolve({ success: true, transactionId: res?.transactionId, ...res });
        },
        fail(err) {
          // 用户取消不算错误
          if (err?.errMsg?.includes('cancel')) {
            resolve({ success: false, cancelled: true });
          } else {
            reject(new Error(err?.errMsg || '支付失败'));
          }
        },
      });
    });
  } catch (err) {
    console.error('[wechat-pay] 支付失败:', err);
    throw err;
  }
}

/**
 * 创建订单 + 支付（一步完成）
 */
async function pay(options = {}) {
  const {
    amount,
    description,
    currency = 'CNY',
    extra = {},
  } = options;

  // 创建订单记录
  const order = await request('orders', {
    method: 'POST',
    data: {
      amount,
      currency,
      description,
      status: 'pending',
      method: 'wechat',
      created_at: new Date().toISOString(),
      ...extra,
    },
  });

  if (!order || !order.length) {
    throw new Error('创建订单失败');
  }

  const orderId = order[0]?.id || order.id;

  // 拉起支付
  try {
    const result = await requestPayment({
      amount,
      description,
      orderId,
      currency,
    });

    if (result.success) {
      // 更新订单状态
      await request(`orders?id=eq.${orderId}`, {
        method: 'PATCH',
        data: {
          status: 'paid',
          paid_at: new Date().toISOString(),
          transaction_id: result.transactionId,
        },
      });
      return { success: true, orderId };
    }

    if (result.cancelled) {
      await request(`orders?id=eq.${orderId}`, {
        method: 'PATCH',
        data: { status: 'cancelled' },
      });
      return { success: false, cancelled: true };
    }

    return { success: false };
  } catch (err) {
    // 支付失败，更新订单状态
    await request(`orders?id=eq.${orderId}`, {
      method: 'PATCH',
      data: { status: 'failed' },
    }).catch(() => {});
    throw err;
  }
}

/**
 * 查询订单支付状态
 */
async function queryOrder(orderId) {
  const result = await request(`orders?id=eq.${orderId}&select=status,amount,paid_at&limit=1`);
  const order = (Array.isArray(result) ? result[0] : result) || null;
  return order;
}

/**
 * 申请退款
 */
async function refund(orderId, reason = '') {
  return request('rpc/wechat_refund', {
    method: 'POST',
    data: { order_id: orderId, reason },
  });
}

module.exports = {
  requestPayment,
  pay,
  queryOrder,
  refund,
};
