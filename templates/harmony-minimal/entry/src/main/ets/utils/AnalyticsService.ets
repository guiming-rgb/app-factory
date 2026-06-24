/**
 * App 分析面板 SDK — 鸿蒙 ArkTS 埋点服务
 *
 * 功能：
 * - 页面浏览 / 自定义事件 / 错误 / 用户属性 / 会话追踪
 * - 批量上报：每 30 秒或队列满 20 条时自动刷入
 * - 离线感知：无网络时暂存内存队列，恢复后自动推送
 * - 安全：所有网络请求 try/catch，绝不崩溃 App
 *
 * 依赖 @kit.BasicServicesKit (deviceInfo)
 * 依赖 SupabaseConfig.request
 */
import { deviceInfo } from '@kit.BasicServicesKit';
import { connection } from '@kit.NetworkKit';
import { SupabaseConfig } from './SupabaseConfig';

/** 单条事件结构 */
interface AnalyticsEvent {
  app_id: string;
  event_type: string;
  event_name: string;
  screen_name: string;
  properties: Record<string, Object>;
  user_id: string;
  session_id: string;
  device_info: Record<string, Object>;
  timestamp?: string;
}

export class AnalyticsService {
  // ============================================================
  // 配置
  // ============================================================
  private static appId_: string = '';
  private static userId_: string = '';
  private static sessionId_: string = '';
  private static sessionStart_: number = 0;
  private static isOnline_: boolean = true;

  /** 内存储队列 */
  private static queue_: AnalyticsEvent[] = [];

  /** 定时器句柄 */
  private static flushTimerId_: number = -1;

  /** 网络状态回调句柄 */
  private static networkCallback_: (() => void) | null = null;

  // ============================================================
  // 常量
  // ============================================================
  private static readonly FLUSH_INTERVAL_MS: number = 30000;
  private static readonly FLUSH_BATCH_SIZE: number = 20;
  private static readonly ANALYTICS_ENDPOINT: string = '/api/analytics/events';

  // ============================================================
  // 公共 API
  // ============================================================

  /**
   * 初始化分析服务
   *
   * @param appId   当前 App 的唯一标识（由工厂后台分配）
   * @param context UIAbility / 页面上下文（用于网络监听）
   */
  static init(appId: string, context?: Context): void {
    this.appId_ = appId;
    this.sessionId_ = this.generateId_();
    this.sessionStart_ = Date.now();

    this.startFlushTimer_();
    this.setupNetworkListener_(context);

    // 上报会话开始
    this.enqueue_({
      app_id: this.appId_,
      event_type: 'session_start',
      event_name: '',
      screen_name: '',
      properties: {},
      user_id: this.userId_,
      session_id: this.sessionId_,
      device_info: this.collectDeviceInfo_(),
    });
  }

  /**
   * 追踪页面浏览
   *
   * @param name  页面名称（如 "home", "product_detail"）
   * @param extra 附加属性
   */
  static trackScreen(name: string, extra?: Record<string, Object>): void {
    if (!this.appId_) return;
    this.enqueue_({
      app_id: this.appId_,
      event_type: 'screen_view',
      event_name: '',
      screen_name: name,
      properties: extra ?? {},
      user_id: this.userId_,
      session_id: this.sessionId_,
      device_info: this.collectDeviceInfo_(),
    });
  }

  /**
   * 追踪自定义事件（按钮点击、购买、收藏等）
   *
   * @param name       事件名（如 "button_click", "purchase_complete"）
   * @param properties 附加属性
   */
  static trackEvent(name: string, properties?: Record<string, Object>): void {
    if (!this.appId_) return;
    this.enqueue_({
      app_id: this.appId_,
      event_type: 'custom_event',
      event_name: name,
      screen_name: '',
      properties: properties ?? {},
      user_id: this.userId_,
      session_id: this.sessionId_,
      device_info: this.collectDeviceInfo_(),
    });
  }

  /**
   * 追踪错误
   *
   * @param error 错误描述
   * @param stack 可选的堆栈信息
   */
  static trackError(error: string, stack?: string): void {
    if (!this.appId_) return;
    const props: Record<string, Object> = { message: error };
    if (stack) props['stack_trace'] = stack;
    this.enqueue_({
      app_id: this.appId_,
      event_type: 'error',
      event_name: '',
      screen_name: '',
      properties: props,
      user_id: this.userId_,
      session_id: this.sessionId_,
      device_info: this.collectDeviceInfo_(),
    });
  }

  /**
   * 设置用户标识
   *
   * @param uid 用户唯一标识（由业务系统分配）
   */
  static setUserId(uid: string): void {
    this.userId_ = uid;
  }

  /**
   * 获取当前会话时长（秒）
   */
  static getSessionDuration(): number {
    if (this.sessionStart_ === 0) return 0;
    return Math.floor((Date.now() - this.sessionStart_) / 1000);
  }

  /**
   * 强制立即刷入队列
   *
   * @returns 成功刷入的事件数
   */
  static async flush(): Promise<number> {
    return await this.doFlush_();
  }

  /**
   * 释放资源（页面销毁或退出登录时调用）
   */
  static dispose(): void {
    if (this.flushTimerId_ >= 0) {
      clearInterval(this.flushTimerId_);
      this.flushTimerId_ = -1;
    }
    if (this.networkCallback_) {
      // 取消网络监听（通过 connection.off 系列）
      this.networkCallback_ = null;
    }
    // 最后尝试刷入
    if (this.queue_.length > 0 && this.isOnline_) {
      this.doFlush_();
    }
  }

  // ============================================================
  // 内部
  // ============================================================

  /**
   * 入队一条事件，满 FLUSH_BATCH_SIZE 条则立即刷入
   */
  private static enqueue_(event: AnalyticsEvent): void {
    event.timestamp = new Date().toISOString();
    this.queue_.push(event);
    if (this.queue_.length >= this.FLUSH_BATCH_SIZE) {
      this.doFlush_();
    }
  }

  /**
   * 实际向服务端刷入
   */
  private static async doFlush_(): Promise<number> {
    if (this.queue_.length === 0) return 0;
    if (!this.isOnline_) return 0;

    const batch = this.queue_.splice(0);
    if (batch.length === 0) return 0;

    try {
      // 直接调用后端分析 API（service role 写入 Supabase）
      const result = await SupabaseConfig.request(
        'rpc/batch_insert_analytics_events',
        {
          method: 'POST',
          body: { events: batch, app_id: this.appId_ },
          headers: {
            'Content-Type': 'application/json',
            'x-analytics-key': this.appId_
          }
        }
      );
      if (result !== null) {
        return batch.length;
      }
      // 失败时重新入队
      this.queue_ = batch.concat(this.queue_);
      return 0;
    } catch (e) {
      // 静默吞掉所有异常 — 分析绝不能崩溃 App
      console.error('[AnalyticsService] flush failed', JSON.stringify(e));
      this.queue_ = batch.concat(this.queue_);
      return 0;
    }
  }

  /**
   * 启动定时刷入
   */
  private static startFlushTimer_(): void {
    if (this.flushTimerId_ >= 0) {
      clearInterval(this.flushTimerId_);
    }
    this.flushTimerId_ = setInterval(() => {
      if (this.queue_.length > 0 && this.isOnline_) {
        this.doFlush_();
      }
    }, this.FLUSH_INTERVAL_MS);
  }

  /**
   * 监听网络状态变化
   */
  private static setupNetworkListener_(context?: Context): void {
    // 初始检测
    try {
      const netInfo = connection.getDefaultNetSync();
      this.isOnline_ = netInfo !== undefined;
    } catch (_) {
      this.isOnline_ = true;
    }

    // 监听网络变化
    try {
      connection.on('netStatusChange', (data: connection.NetStatusChangeInfo) => {
        const wasOffline = !this.isOnline_;
        this.isOnline_ = data.has;
        if (this.isOnline_ && wasOffline && this.queue_.length > 0) {
          this.doFlush_();
        }
      });
    } catch (_) {
      // 网络事件 API 不可用时降级
    }
  }

  /**
   * 收集设备信息
   */
  private static collectDeviceInfo_(): Record<string, Object> {
    try {
      const info = deviceInfo;
      return {
        deviceType: info.deviceType ?? '',
        osFullName: info.osFullName ?? '',
        osVersion: info.displayVersion ?? '',
        manufacturer: info.manufacture ?? '',
        brand: info.brand ?? '',
        model: info.model ?? '',
        sdkApiVersion: info.sdkApiVersion ?? 0,
        productName: info.productModel ?? '',
      };
    } catch (_) {
      return {};
    }
  }

  /**
   * 生成简易 ID
   */
  private static generateId_(): string {
    return Date.now() + '_' + Math.random().toString(36).slice(2, 9);
  }
}
