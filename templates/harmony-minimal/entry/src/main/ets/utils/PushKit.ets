/**
 * 华为推送 Kit — 需在 AppGallery Connect 配置
 *
 * 前置条件：
 *   1. AppGallery Connect → 项目设置 → 应用信息 → 开通推送服务。
 *   2. 下载 agconnect-services.json → 放入 entry/src/main/ 目录。
 *   3. build-profile.json5 中配置 signingConfigs（发布证书指纹 SHA-256）。
 *   4. 推送通知权限需 runtime 弹窗申请。
 *
 * 依赖（build-profile.json5 / oh-package.json5）：
 *   - @kit.NotificationKit （系统内置）
 *   - @kit.PushKit         （系统内置）
 *
 * 使用方式：
 *   import { PushManager } from '../utils/PushKit';
 *   PushManager.init()
 *     .then(() => console.info('[PushKit] init ok'))
 *     .catch((e) => console.error('[PushKit] init fail', JSON.stringify(e)));
 */

import { notificationManager, NotificationRequest, NotificationBasicContent } from '@kit.NotificationKit';
import { pushService, PushMessage, PushMessageData } from '@kit.PushKit';

const TAG = '[PushManager]';

/**
 * PushManager — 华为推送全生命周期管理。
 */
export class PushManager {
  private static currentToken: string = '';

  // -----------------------------------------------------------------------
  // 初始化
  // -----------------------------------------------------------------------

  /**
   * 请求通知权限、获取推送 token、注册消息监听。
   *
   * @returns 推送 token，失败返回空字符串
   */
  static async init(): Promise<string> {
    try {
      await PushManager.requestPermission();

      const token = await PushManager.getToken();
      if (token && token.length > 0) {
        PushManager.onTokenReceived(token);
      }

      pushService.on('receive', PushManager.onPushMessageReceived);

      return token;
    } catch (e) {
      console.error(TAG, 'init 失败:', JSON.stringify(e));
      return '';
    }
  }

  // -----------------------------------------------------------------------
  // Token
  // -----------------------------------------------------------------------

  /**
   * 获取华为推送 token。
   *
   * @returns token 字符串，失败返回空字符串
   */
  static async getToken(): Promise<string> {
    try {
      const token: string = await pushService.getToken();
      return token;
    } catch (e) {
      console.error(TAG, 'getToken 失败:', JSON.stringify(e));
      return '';
    }
  }

  /**
   * 收到 token 时的回调（初始化、刷新均触发）。
   *
   * @param token - FCM / 华为推送 token
   */
  static onTokenReceived(token: string): void {
    PushManager.currentToken = token;
    console.info(TAG, 'token received:', token);
    // 开发者可在此调用服务端接口持久化 token
  }

  // -----------------------------------------------------------------------
  // 消息到达
  // -----------------------------------------------------------------------

  /**
   * 处理推送消息。
   *
   * @param msg - 推送数据（key-value 结构）
   */
  static onPushMessageReceived(msg: PushMessage): void {
    try {
      const data: Record<string, Object> = msg.data as Record<string, Object>;
      console.info(TAG, 'push message received:', JSON.stringify(data));

      const title: string = (data['title'] as string) || '新消息';
      const body: string = (data['body'] as string) || '';

      PushManager.showLocalNotification(title, body).catch((e) => {
        console.error(TAG, 'showLocalNotification 失败:', JSON.stringify(e));
      });
    } catch (e) {
      console.error(TAG, 'onPushMessageReceived 失败:', JSON.stringify(e));
    }
  }

  // -----------------------------------------------------------------------
  // 主题订阅
  // -----------------------------------------------------------------------

  /**
   * 订阅推送主题。
   *
   * @param topic - 主题名称
   * @returns 成功返回 true，失败返回 false
   */
  static async subscribeTopic(topic: string): Promise<boolean> {
    try {
      await pushService.subscribeTopic(topic);
      console.info(TAG, `subscribeTopic(${topic}) 成功`);
      return true;
    } catch (e) {
      console.error(TAG, `subscribeTopic(${topic}) 失败:`, JSON.stringify(e));
      return false;
    }
  }

  /**
   * 取消订阅推送主题。
   *
   * @param topic - 主题名称
   * @returns 成功返回 true，失败返回 false
   */
  static async unsubscribeTopic(topic: string): Promise<boolean> {
    try {
      await pushService.unsubscribeTopic(topic);
      console.info(TAG, `unsubscribeTopic(${topic}) 成功`);
      return true;
    } catch (e) {
      console.error(TAG, `unsubscribeTopic(${topic}) 失败:`, JSON.stringify(e));
      return false;
    }
  }

  // -----------------------------------------------------------------------
  // 本地通知
  // -----------------------------------------------------------------------

  /**
   * 展示本地通知。
   *
   * @param title - 通知标题
   * @param body  - 通知内容
   */
  static async showLocalNotification(title: string, body: string): Promise<void> {
    try {
      const basicContent: NotificationBasicContent = {
        title: title,
        text: body,
      };

      const request: NotificationRequest = {
        content: {
          contentType: notificationManager.ContentType.NOTIFICATION_CONTENT_BASIC_TEXT,
          normal: basicContent,
        },
        notificationId: Date.now() % 100000,
      };

      await notificationManager.publish(request);
    } catch (e) {
      console.error(TAG, 'showLocalNotification 失败:', JSON.stringify(e));
    }
  }

  // -----------------------------------------------------------------------
  // 权限
  // -----------------------------------------------------------------------

  /**
   * 请求通知权限（弹窗）。
   */
  static async requestPermission(): Promise<void> {
    try {
      await notificationManager.requestEnableNotification();
      console.info(TAG, 'notification permission granted');
    } catch (e) {
      console.error(TAG, 'requestEnableNotification 失败:', JSON.stringify(e));
    }
  }
}
