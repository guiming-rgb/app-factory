import "dart:convert";

import "package:flutter/material.dart";
import "package:firebase_core/firebase_core.dart";
import "package:firebase_messaging/firebase_messaging.dart";
import "package:flutter_local_notifications/flutter_local_notifications.dart";
import "package:go_router/go_router.dart";
import "package:supabase_flutter/supabase_flutter.dart";

import "../config/env.dart";

// ---------------------------------------------------------------------------
// 推送服务 — FCM + 本地通知 + 主题订阅
//
// iOS 前置条件：
//   1. Apple Developer → Certificates, Identifiers & Profiles → Key 创建
//      APNs 推送密钥（.p8），保存 Key ID。
//   2. Firebase Console → Project Settings → Cloud Messaging → Apple App →
//      上传 APNs 密钥（填入 Key ID、Team ID、Bundle ID）。
//   3. Xcode Runner → Signing & Capabilities → + Push Notifications。
//   4. Runner.entitlements 添加 aps-environment（production / development）。
//
// Android 前置条件：
//   1. 从 Firebase Console 下载 google-services.json → 放入
//      android/app/google-services.json。
//   2. android/build.gradle 添加 google-services 插件 classpath。
//   3. android/app/build.gradle 添加 apply plugin: 'com.google.gms.google-services'。
//
// 依赖（pubspec.yaml）：
//   firebase_core: ^3.x
//   firebase_messaging: ^15.x
//   flutter_local_notifications: ^18.x
//   go_router: ^14.x
//   supabase_flutter: ^2.9.0
// ---------------------------------------------------------------------------

/// 全局本地通知插件（避免重复初始化）。
final FlutterLocalNotificationsPlugin _localNotifications =
    FlutterLocalNotificationsPlugin();

/// FCM 实例（延迟获取，仅在 initialize() 后使用）。
final FirebaseMessaging _fcm = FirebaseMessaging.instance;

/// NotificationService — 推送全生命周期的静态工具。
///
/// 使用方式：
///   void main() async {
///     WidgetsFlutterBinding.ensureInitialized();
///     await Firebase.initializeApp();
///     await NotificationService.initialize();
///     runApp(
///       MaterialApp.router(
///         routerConfig: GoRouter(
///           navigatorKey: NotificationService.navigatorKey,
///           routes: [...],
///         ),
///       ),
///     );
///   }
class NotificationService {
  NotificationService._();

  /// 通知点击导航用的 GlobalKey，应传给 GoRouter( navigatorKey: ... )。
  static final GlobalKey<NavigatorState> navigatorKey =
      GlobalKey<NavigatorState>();

  // -----------------------------------------------------------------------
  // 初始化
  // -----------------------------------------------------------------------

  /// 请求通知权限、配置本地通知、获取并持久化 FCM token。
  ///
  /// 应在 Firebase.initializeApp() 之后、runApp 之前调用。
  /// 返回当前 FCM token，失败返回 null。
  static Future<String?> initialize() async {
    try {
      _configureLocalNotifications();

      await _requestPermission();

      final token = await _fcm.getToken();
      if (token != null) {
        await _persistToken(token);
      }

      // 注册前台消息流 → 展示本地通知
      FirebaseMessaging.onMessage.listen(onMessageReceived);

      // 注册点击通知流 → 导航
      FirebaseMessaging.onMessageOpenedApp.listen(onMessageOpenedApp);

      // 注册冷启动通知
      final initialMessage = await _fcm.getInitialMessage();
      if (initialMessage != null) {
        onMessageOpenedApp(initialMessage);
      }

      // 注册 token 刷新回调
      _fcm.onTokenRefresh.listen(onTokenRefresh);

      return token;
    } catch (e) {
      // eslint-disable-next-line no-console
      print("[NotificationService] initialize 失败：$e");
      return null;
    }
  }

  // -----------------------------------------------------------------------
  // Token 刷新
  // -----------------------------------------------------------------------

  /// 监听 FCM token 刷新，保存到 Supabase `user_tokens` 表。
  ///
  /// 系统自动触发，开发者无需手动调用。
  static void onTokenRefresh(String token) {
    _persistToken(token);
  }

  // -----------------------------------------------------------------------
  // 消息到达（前台）
  // -----------------------------------------------------------------------

  /// 处理前台到达的 RemoteMessage：展示本地通知。
  ///
  /// [message] Firebase RemoteMessage，可从中提取 data / notification。
  static void onMessageReceived(RemoteMessage message) {
    try {
      final notification = message.notification;
      if (notification == null) return;

      _showLocalNotification(
        id: message.messageId?.hashCode ?? DateTime.now().millisecondsSinceEpoch,
        title: notification.title ?? "",
        body: notification.body ?? "",
        payload: jsonEncode(message.data),
      );
    } catch (e) {
      // eslint-disable-next-line no-console
      print("[NotificationService] onMessageReceived 失败：$e");
    }
  }

  // -----------------------------------------------------------------------
  // 通知点击导航
  // -----------------------------------------------------------------------

  /// 处理通知点击：解析 data → 导航到对应页面。
  ///
  /// [message] 触发 app 打开或从后台切入前台的 RemoteMessage。
  /// 约定 data 中 `route` 字段作为 go_router 路径；无 route 时不做跳转。
  static void onMessageOpenedApp(RemoteMessage message) {
    try {
      final data = Map<String, dynamic>.from(message.data);
      final route = data["route"] as String?;

      if (route != null && route.isNotEmpty) {
        final BuildContext? context = navigatorKey.currentContext;
        if (context != null && context.mounted) {
          GoRouter.of(context).go(route, extra: data);
        }
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      print("[NotificationService] onMessageOpenedApp 失败：$e");
    }
  }

  // -----------------------------------------------------------------------
  // 主题订阅
  // -----------------------------------------------------------------------

  /// 订阅主题推送。
  ///
  /// [topic] 主题名称（不含 `/topics/` 前缀）。
  /// 成功返回 true，失败返回 false。
  static Future<bool> subscribeToTopic(String topic) async {
    try {
      await _fcm.subscribeToTopic(topic);
      return true;
    } catch (e) {
      // eslint-disable-next-line no-console
      print("[NotificationService] subscribeToTopic($topic) 失败：$e");
      return false;
    }
  }

  /// 取消订阅主题推送。
  ///
  /// [topic] 主题名称。
  /// 成功返回 true，失败返回 false。
  static Future<bool> unsubscribeFromTopic(String topic) async {
    try {
      await _fcm.unsubscribeFromTopic(topic);
      return true;
    } catch (e) {
      // eslint-disable-next-line no-console
      print("[NotificationService] unsubscribeFromTopic($topic) 失败：$e");
      return false;
    }
  }

  // =======================================================================
  // 内部方法
  // =======================================================================

  /// 配置 flutter_local_notifications 初始化。
  static void _configureLocalNotifications() {
    const androidSettings = AndroidInitializationSettings("@mipmap/ic_launcher");
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: false,
      requestBadgePermission: false,
      requestSoundPermission: false,
    );
    const initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );
    _localNotifications.initialize(initSettings);
  }

  /// 请求 iOS / Android 通知权限。
  static Future<void> _requestPermission() async {
    final settings = await _fcm.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      announcement: false,
      carPlay: false,
      criticalAlert: false,
      provisional: false,
    );
    if (settings.authorizationStatus == AuthorizationStatus.denied) {
      // eslint-disable-next-line no-console
      print("[NotificationService] 通知权限被拒绝");
    }
  }

  /// 展示本地通知（前台收到 RemoteMessage 时触发）。
  static Future<void> _showLocalNotification({
    required int id,
    required String title,
    required String body,
    String? payload,
  }) async {
    const androidDetails = AndroidNotificationDetails(
      "default_channel",
      "默认通知",
      channelDescription: "App 默认通知通道",
      importance: Importance.high,
      priority: Priority.high,
    );
    const iosDetails = DarwinNotificationDetails();
    const details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _localNotifications.show(id, title, body, details,
        payload: payload);
  }

  /// 将 FCM token 持久化到 Supabase `user_tokens` 表。
  ///
  /// 表中列：user_id, fcm_token, platform, updated_at。通过 RLS 按 user_id 过滤。
  /// 若 Supabase 未配置则静默跳过。
  static Future<void> _persistToken(String token) async {
    if (!Env.hasSupabase) return;

    try {
      final supabase = Supabase.instance.client;
      final user = supabase.auth.currentUser;
      if (user == null) return;

      await supabase.from("user_tokens").upsert({
        "user_id": user.id,
        "fcm_token": token,
        "platform": "flutter",
        "updated_at": DateTime.now().toIso8601String(),
      }, onConflict: "user_id");
    } catch (e) {
      // eslint-disable-next-line no-console
      print("[NotificationService] _persistToken 失败：$e");
    }
  }
}
