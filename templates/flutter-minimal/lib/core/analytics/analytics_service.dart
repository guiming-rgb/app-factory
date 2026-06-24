import 'dart:async';
import 'dart:convert';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// App 分析面板 SDK — 客户端埋点服务
///
/// 功能：
/// - 页面浏览 / 自定义事件 / 错误 / 用户属性 / 会话追踪
/// - 批量上报：每 30 秒或队列满 20 条时自动刷入 Supabase
/// - 离线感知：无网络时暂存队列，恢复后自动推送
/// - 安全：所有 Supabase 调用 try/catch，绝不崩溃 App
class AnalyticsService {
  AnalyticsService._();

  // ============================================================
  // 配置
  // ============================================================

  static String? _appId;
  static String? _userId;
  static String? _sessionId;
  static DateTime? _sessionStart;

  /// ---- 内存储队列 ----
  static final List<Map<String, dynamic>> _queue = [];

  /// ---- 定时器 ----
  static Timer? _flushTimer;

  /// ---- 网络订阅 ----
  static StreamSubscription<List<ConnectivityResult>>? _connectivitySub;
  static bool _isOnline = true;

  /// ---- 注入的自定义 Supabase 客户端（可选） ----
  /// 当提供时优先使用，否则回退到 [Supabase.instance.client]
  static SupabaseClient? _customClient;

  // ============================================================
  // 常量
  // ============================================================

  /// 每 30 秒自动刷入
  static const Duration _flushInterval = Duration(seconds: 30);

  /// 队列满 20 条立即刷入
  static const int _flushBatchSize = 20;

  // ============================================================
  // 公共 API
  // ============================================================

  /// 初始化分析服务
  ///
  /// [appId]        当前 App 的唯一标识（由工厂后台分配）
  /// [supabaseClient] 可选：自定义 Supabase 客户端（默认使用 [Supabase.instance.client]）
  static void init(String appId, {SupabaseClient? supabaseClient}) {
    _appId = appId;
    _sessionId = _generateId();
    _sessionStart = DateTime.now();
    if (supabaseClient != null) {
      _customClient = supabaseClient;
    }

    _startFlushTimer();
    _setupNetworkListener();

    // 上报会话开始
    _enqueue({
      'app_id': _appId,
      'event_type': 'session_start',
      'event_name': null,
      'screen_name': null,
      'properties': {},
      'user_id': _userId,
      'session_id': _sessionId,
      'device_info': _collectDeviceInfo(),
    });
  }

  /// 追踪页面浏览
  ///
  /// [screenName] 页面名称（如 "home", "product_detail"）
  /// [extra]       附加属性
  static void trackScreen(String screenName, {Map<String, dynamic>? extra}) {
    _enqueue({
      'app_id': _appId,
      'event_type': 'screen_view',
      'event_name': null,
      'screen_name': screenName,
      'properties': extra ?? {},
      'user_id': _userId,
      'session_id': _sessionId,
      'device_info': _collectDeviceInfo(),
    });
  }

  /// 追踪自定义事件（按钮点击、购买、收藏等）
  ///
  /// [eventName]  事件名（如 "button_click", "purchase_complete"）
  /// [properties] 附加属性
  static void trackEvent(String eventName, {Map<String, dynamic>? properties}) {
    _enqueue({
      'app_id': _appId,
      'event_type': 'custom_event',
      'event_name': eventName,
      'screen_name': null,
      'properties': properties ?? {},
      'user_id': _userId,
      'session_id': _sessionId,
      'device_info': _collectDeviceInfo(),
    });
  }

  /// 追踪错误
  ///
  /// [error]      错误描述
  /// [stackTrace] 可选的堆栈信息
  static void trackError(String error, {String? stackTrace}) {
    final props = <String, dynamic>{'message': error};
    if (stackTrace != null) {
      props['stack_trace'] = stackTrace;
    }
    _enqueue({
      'app_id': _appId,
      'event_type': 'error',
      'event_name': null,
      'screen_name': null,
      'properties': props,
      'user_id': _userId,
      'session_id': _sessionId,
      'device_info': _collectDeviceInfo(),
    });
  }

  /// 设置用户属性（如会员等级、注册渠道等）
  ///
  /// [key]   属性名（如 "vip_level"）
  /// [value] 属性值（如 "gold"）
  static void trackUserProperty(String key, String value) {
    _enqueue({
      'app_id': _appId,
      'event_type': 'user_property',
      'event_name': null,
      'screen_name': null,
      'properties': {key: value},
      'user_id': _userId,
      'session_id': _sessionId,
      'device_info': _collectDeviceInfo(),
    });
  }

  /// 设置用户标识
  ///
  /// [userId] 用户唯一标识（由业务系统分配）
  static void setUserId(String userId) {
    _userId = userId;
  }

  /// 获取当前会话时长（秒）
  static int getSessionDuration() {
    if (_sessionStart == null) return 0;
    return DateTime.now().difference(_sessionStart!).inSeconds;
  }

  /// 强制立即刷入队列
  ///
  /// 返回成功刷入的事件数，失败返回 -1。
  static Future<int> flush() async {
    if (_queue.isEmpty) return 0;
    return _doFlush();
  }

  /// 释放资源（页面销毁或退出登录时调用）
  static void dispose() {
    _flushTimer?.cancel();
    _flushTimer = null;
    _connectivitySub?.cancel();
    _connectivitySub = null;
    // 最后尝试刷入
    if (_queue.isNotEmpty && _isOnline) {
      unawaited(_doFlush());
    }
  }

  // ============================================================
  // 内部
  // ============================================================

  /// 入队一条事件，满 [flushBatchSize] 条则立即刷入
  static void _enqueue(Map<String, dynamic> event) {
    _queue.add(event);
    if (_queue.length >= _flushBatchSize) {
      unawaited(_doFlush());
    }
  }

  /// 实际向 Supabase 刷入
  static Future<int> _doFlush() async {
    if (_queue.isEmpty) return 0;
    if (!_isOnline) return 0;

    final batch = List<Map<String, dynamic>>.from(_queue);
    _queue.clear();

    try {
      final client = _customClient ?? Supabase.instance.client;
      // 使用 REST API 批量插入
      final response = await client.from('analytics_events').insert(batch).select();

      if (response.error != null) {
        // 失败时事件重新入队（避免丢失）
        _queue.insertAll(0, batch);
        return -1;
      }
      return batch.length;
    } catch (e) {
      // 静默吞掉所有异常 — 分析绝不能崩溃 App
      // 事件重新入队
      _queue.insertAll(0, batch);
      return -1;
    }
  }

  /// 启动定时刷入
  static void _startFlushTimer() {
    _flushTimer?.cancel();
    _flushTimer = Timer.periodic(_flushInterval, (_) {
      if (_queue.isNotEmpty && _isOnline) {
        unawaited(_doFlush());
      }
    });
  }

  /// 监听网络状态变化，恢复时自动刷入
  static void _setupNetworkListener() {
    _connectivitySub?.cancel();
    _connectivitySub = Connectivity().onConnectivityChanged.listen((results) {
      final online = results.any((r) => r != ConnectivityResult.none);
      final wasOffline = !_isOnline;
      _isOnline = online;
      if (online && wasOffline && _queue.isNotEmpty) {
        unawaited(_doFlush());
      }
    });
  }

  /// 收集设备信息
  static Map<String, dynamic> _collectDeviceInfo() {
    try {
      // 使用 dart:io 和 dart:html 等效信息
      // SupabaseFlutter 本身提供部分平台信息
      final info = <String, dynamic>{
        'platform': 'unknown',
        'os_version': 'unknown',
      };
      return info;
    } catch (_) {
      return {};
    }
  }

  /// 生成简易 UUID（运行时唯一即可，无需加密安全）
  static String _generateId() {
    final now = DateTime.now().microsecondsSinceEpoch;
    final random = (now % 100000).toString().padLeft(5, '0');
    return '${now}_$random';
  }
}
