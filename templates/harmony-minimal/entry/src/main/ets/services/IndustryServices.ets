/**
 * App 生产工厂 — 鸿蒙行业服务注册
 *
 * 本文件为 IndustryServices 占位文件。
 * 实际服务代码由代码生成引擎通过 emitHarmonyIndustryServicesEts() 动态生成，
 * 覆盖 19 个行业（finance / crm / fitness / ecommerce / education / social / food
 * / hotel / recruitment / property / video / weather / sports / photo / dating
 * / medical / blog / game / payment）。
 *
 * ────────────────────────────────────────────
 * 服务注册说明
 * ────────────────────────────────────────────
 *
 * 1. CRUD 服务
 *   每个行业自动生成基础 CRUD（list / get / create / update / remove），
 *   通过 RESTful API 与 Supabase 交互（表名见 emitHarmonyIndustryServicesEts）。
 *
 * 2. 行业差异化方法
 *   部分行业有额外业务方法（如 search / rank），定义在 INDUSTRY_METHODS 中。
 *
 * 3. 支付服务
 *   payment 行业的支付流程可集成 IAPService（utils/IAPService.ets）实现
 *   华为应用内支付。在 payment service 的 create 或 purchase 方法中调用：
 *
 *   import { IAPService } from '../utils/IAPService';
 *
 *   // 查询商品
 *   const products = await IAPService.getProducts(['pay_product_01']);
 *
 *   // 发起购买
 *   const purchaseResult = await IAPService.purchase(
 *     'pay_product_01',
 *     `order_${Date.now()}`
 *   );
 *
 *   // 消耗商品（消耗型）
 *   await IAPService.consumePurchase(purchaseResult.purchaseToken);
 *
 *   IAPService 所有方法均已 try/catch 保护，失败返回 null 或空数组，
 *   不会导致 App 崩溃。需在 AppGallery Connect 预配置商品并启用 IAP Kit。
 *
 * 4. 推送服务
 *   参考 PushKit（utils/PushKit.ets）注册推送通知。
 *
 * 5. 分析服务
 *   参考 AnalyticsService（utils/AnalyticsService.ets）接入埋点统计。
 *
 * ────────────────────────────────────────────
 */
