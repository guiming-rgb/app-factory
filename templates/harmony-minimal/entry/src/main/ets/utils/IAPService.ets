/**
 * 华为 IAP — 需在 AppGallery Connect 配置商品并启用 IAP Kit
 *
 * 前置条件：
 *   1. AppGallery Connect → 项目设置 → 应用信息 → 开通应用内支付服务。
 *   2. 在 AppGallery Connect → 经营 → 商品管理 中配置商品（消耗型 / 非消耗型 / 订阅型）。
 *   3. 下载 agconnect-services.json → 放入 entry/src/main/ 目录。
 *   4. build-profile.json5 中配置 signingConfigs（发布证书指纹 SHA-256）。
 *
 * 依赖（oh-package.json5）：
 *   - @kit.IAPKit （系统内置）
 *
 * 使用方式：
 *   import { IAPService } from '../utils/IAPService';
 *   const products = await IAPService.getProducts(['product_001', 'product_002']);
 *   const result = await IAPService.purchase('product_001', 'order_uuid');
 */

import { iap, Product as IAPProduct, PurchaseResultInfo, PurchaseInfo } from '@kit.IAPKit';

const TAG = '[IAPService]';

// -----------------------------------------------------------------------
// 类型定义
// -----------------------------------------------------------------------

/**
 * 商品信息
 */
export interface Product {
  /** 商品 ID（AppGallery Connect 中配置的 ID） */
  id: string;
  /** 商品展示名称 */
  name: string;
  /** 价格（数值，如 6.00） */
  price: number;
  /** 货币代码（如 CNY, USD） */
  currency: string;
  /** 本地化价格字符串（如 "¥6.00"） */
  localizedPrice: string;
}

/**
 * 购买结果
 */
export interface PurchaseResult {
  /** 是否成功 */
  success: boolean;
  /** 商户订单号 */
  orderId: string;
  /** 购买令牌（用于消耗/校验） */
  purchaseToken: string;
  /** 结果描述 */
  message: string;
}

/**
 * 已购商品记录
 */
export interface Purchase {
  /** 商品 ID */
  productId: string;
  /** 购买令牌 */
  purchaseToken: string;
  /** 订单 ID */
  orderId: string;
  /** 购买时间戳（毫秒） */
  purchaseTimeMs: number;
  /** 是否已消耗（消耗型商品） */
  consumed: boolean;
  /** 商品类型：0-消耗型, 1-非消耗型, 2-订阅型 */
  productType: number;
}

// -----------------------------------------------------------------------
// 类型守卫
// -----------------------------------------------------------------------

/**
 * 判断 iap 对象是否来自 @kit.IAPKit 且具备实际方法。
 * ArkTS 编译期 import 的类型在运行时可能退化为 undefined（当 Kit 未预置时），
 * 此处做安全检测，确保调用前 IAP Kit 可用。
 */
function isIAPAvailable(): boolean {
  return typeof iap === 'object' && iap !== null;
}

// -----------------------------------------------------------------------
// IAPService
// -----------------------------------------------------------------------

/**
 * IAPService — 华为应用内支付服务封装。
 *
 * 提供商品查询、购买、消耗、恢复购买等接口。
 * 所有方法均已 try/catch 包裹，失败时返回 null 或空数组，绝不崩溃 App。
 */
export class IAPService {

  // ============================================================
  // 初始化
  // ============================================================

  /**
   * 初始化 IAP 服务并查询已配置商品列表。
   *
   * 自动获取 AppGallery Connect 中所有已上架商品的信息并缓存。
   * 在 App 启动时（EntryAbility.onCreate 中）调用一次即可。
   *
   * @returns 商品列表，IAP Kit 不可用时返回空数组
   */
  static async init(): Promise<Product[]> {
    try {
      if (!isIAPAvailable()) {
        console.warn(TAG, 'IAP Kit 不可用 — 设备可能未安装 HMS Core');
        return [];
      }

      // 查询 AppGallery Connect 中所有已上架商品
      const productResult: IAPProduct[] = await iap.getProducts();
      const products: Product[] = [];

      for (const item of productResult) {
        products.push({
          id: item.productId ?? '',
          name: item.productName ?? '',
          price: item.price ?? 0,
          currency: item.currency ?? 'CNY',
          localizedPrice: item.localizedPrice ?? '',
        });
      }

      console.info(TAG, `init 完成，获取到 ${products.length} 个商品`);
      return products;
    } catch (e) {
      console.error(TAG, 'init 失败:', JSON.stringify(e));
      return [];
    }
  }

  // ============================================================
  // 商品查询
  // ============================================================

  /**
   * 根据商品 ID 列表查询商品详情。
   *
   * @param productIds - 商品 ID 数组（需在 AppGallery Connect 中预配置）
   * @returns 商品信息列表，失败返回空数组
   */
  static async getProducts(productIds: string[]): Promise<Product[]> {
    try {
      if (!isIAPAvailable() || !productIds || productIds.length === 0) {
        return [];
      }

      const productResult: IAPProduct[] = await iap.getProducts(productIds);
      const products: Product[] = [];

      for (const item of productResult) {
        products.push({
          id: item.productId ?? '',
          name: item.productName ?? '',
          price: item.price ?? 0,
          currency: item.currency ?? 'CNY',
          localizedPrice: item.localizedPrice ?? '',
        });
      }

      return products;
    } catch (e) {
      console.error(TAG, 'getProducts 失败:', JSON.stringify(e));
      return [];
    }
  }

  // ============================================================
  // 购买
  // ============================================================

  /**
   * 发起购买。
   *
   * 调用华为 IAP 支付流程，拉起 AppGallery 支付页面。
   *
   * @param productId - 待购买商品 ID
   * @param orderId   - 商户订单号（需调用方保证唯一）
   * @returns 购买结果，失败时 success=false
   */
  static async purchase(productId: string, orderId: string): Promise<PurchaseResult> {
    try {
      if (!isIAPAvailable()) {
        return {
          success: false,
          orderId: orderId ?? '',
          purchaseToken: '',
          message: 'IAP Kit 不可用',
        };
      }

      if (!productId) {
        return {
          success: false,
          orderId: orderId ?? '',
          purchaseToken: '',
          message: 'productId 为空',
        };
      }

      const purchaseInfo: PurchaseInfo = {
        productId: productId,
        orderId: orderId ?? '',
        // 可选：developerPayload 可传入自定义数据（服务端回调时透传）
      };

      const result: PurchaseResultInfo = await iap.purchase(purchaseInfo);

      if (result && result.returnCode === 0) {
        return {
          success: true,
          orderId: result.orderId ?? '',
          purchaseToken: result.purchaseToken ?? '',
          message: '购买成功',
        };
      }

      return {
        success: false,
        orderId: result?.orderId ?? orderId ?? '',
        purchaseToken: result?.purchaseToken ?? '',
        message: `购买失败: returnCode=${result?.returnCode ?? -1}`,
      };
    } catch (e) {
      // 用户取消支付或网络异常
      const errStr: string = JSON.stringify(e);
      console.error(TAG, 'purchase 失败:', errStr);
      return {
        success: false,
        orderId: orderId ?? '',
        purchaseToken: '',
        message: errStr,
      };
    }
  }

  // ============================================================
  // 消耗商品
  // ============================================================

  /**
   * 消耗已购买的商品（消耗型商品购买后必须消耗才能再次购买）。
   *
   * @param purchaseToken - 购买令牌（由 purchase 方法返回）
   * @returns 无返回值，失败时打印日志
   */
  static async consumePurchase(purchaseToken: string): Promise<void> {
    try {
      if (!isIAPAvailable()) {
        console.warn(TAG, 'consumePurchase: IAP Kit 不可用');
        return;
      }

      if (!purchaseToken) {
        console.warn(TAG, 'consumePurchase: purchaseToken 为空');
        return;
      }

      await iap.consumePurchase(purchaseToken);
      console.info(TAG, 'consumePurchase 成功');
    } catch (e) {
      console.error(TAG, 'consumePurchase 失败:', JSON.stringify(e));
    }
  }

  // ============================================================
  // 恢复购买
  // ============================================================

  /**
   * 恢复用户历史购买记录（非消耗型商品 / 订阅）。
   *
   * 通常在用户登录后或点击"恢复购买"按钮时调用。
   *
   * @returns 已购商品列表，失败返回空数组
   */
  static async restorePurchases(): Promise<Purchase[]> {
    try {
      if (!isIAPAvailable()) {
        return [];
      }

      const ownedPurchases: PurchaseResultInfo[] = await iap.restorePurchases();
      return IAPService.toPurchaseList_(ownedPurchases);
    } catch (e) {
      console.error(TAG, 'restorePurchases 失败:', JSON.stringify(e));
      return [];
    }
  }

  // ============================================================
  // 购买历史
  // ============================================================

  /**
   * 获取当前用户的购买历史记录。
   *
   * @returns 历史购买记录列表，失败返回空数组
   */
  static async getPurchaseHistory(): Promise<Purchase[]> {
    try {
      if (!isIAPAvailable()) {
        return [];
      }

      const history: PurchaseResultInfo[] = await iap.getPurchaseHistory();
      return IAPService.toPurchaseList_(history);
    } catch (e) {
      console.error(TAG, 'getPurchaseHistory 失败:', JSON.stringify(e));
      return [];
    }
  }

  // ============================================================
  // 内部辅助
  // ============================================================

  /**
   * 将 IAP Kit 返回的 PurchaseResultInfo 数组转为统一的 Purchase 数组。
   *
   * @param items - IAP Kit 原始购买记录
   * @returns 标准化的 Purchase 数组
   */
  private static toPurchaseList_(items: PurchaseResultInfo[]): Purchase[] {
    if (!items || items.length === 0) {
      return [];
    }

    const result: Purchase[] = [];
    for (const item of items) {
      result.push({
        productId: item.productId ?? '',
        purchaseToken: item.purchaseToken ?? '',
        orderId: item.orderId ?? '',
        purchaseTimeMs: item.purchaseTime ?? 0,
        consumed: (item.consumed ?? false) as boolean,
        productType: item.productType ?? 0,
      });
    }
    return result;
  }
}
