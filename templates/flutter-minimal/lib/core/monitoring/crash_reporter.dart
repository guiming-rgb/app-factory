import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

/// Lightweight crash and error reporter.
///
/// Usage:
/// ```dart
/// void main() {
///   CrashReporter.init(dsn: 'https://key@host/project');
///   runApp(MyApp());
/// }
/// ```
///
/// When a [dsn] is provided, errors are sent to the endpoint as HTTP POST
/// JSON payloads.  Without a DSN, errors are logged to the console only.
class CrashReporter {
  CrashReporter._();

  static bool _initialized = false;
  static String? _dsn;
  static String? _userId;
  static String? _userEmail;
  static final List<Map<String, dynamic>> _breadcrumbs = [];

  /// Maximum number of breadcrumbs retained in memory.
  static const int _maxBreadcrumbs = 50;

  // ---------- Initialization ----------

  /// Initializes the crash reporter.
  ///
  /// If [dsn] is provided, errors will be sent to the remote endpoint.
  /// Only the first call has any effect; subsequent calls are safely ignored.
  static void init({String? dsn}) {
    if (_initialized) return;

    if (dsn != null && dsn.trim().isNotEmpty) {
      _dsn = dsn.trim();
    }

    debugPrint('[CrashReporter] initialized${_dsn != null ? ' with DSN' : ''}');

    // Hook into Flutter's error handler.
    FlutterError.onError = (FlutterErrorDetails details) {
      FlutterError.presentError(details);
      reportError(
        details.exception,
        details.stack,
        context: details.library,
      );
    };

    // Hook into the platform dispatcher for uncaught async errors.
    PlatformDispatcher.instance.onError = (Object error, StackTrace stack) {
      reportError(error, stack, context: 'PlatformDispatcher.onError');
      return true; // Signal that the error was handled.
    };

    _initialized = true;
  }

  // ---------- Public API ----------

  /// Sets the current user for error attribution.
  static void setUser(String userId, {String? email}) {
    _userId = userId;
    if (email != null) _userEmail = email;
  }

  /// Adds a breadcrumb trail entry that is sent with the next error report.
  static void addBreadcrumb(String message, {String? category}) {
    final crumb = <String, dynamic>{
      'timestamp': DateTime.now().toIso8601String(),
      'message': message,
      if (category != null) 'category': category,
    };
    _breadcrumbs.add(crumb);
    // Keep the list from growing unbounded.
    if (_breadcrumbs.length > _maxBreadcrumbs) {
      _breadcrumbs.removeAt(0);
    }
  }

  /// Reports an error to the configured endpoint (or console).
  ///
  /// This method is deliberately async (fire-and-forget) so it never blocks
  /// the calling thread.  Every operation is wrapped in try/catch so the
  /// reporter itself cannot crash the app.
  static void reportError(
    dynamic error,
    StackTrace? stackTrace, {
    String? context,
  }) {
    // Wrap in a microtask so the caller is never blocked.
    scheduleMicrotask(() {
      try {
        final payload = _buildPayload(error, stackTrace, context);

        if (_dsn != null) {
          _sendToServer(payload);
        }
        // Always log to console in debug builds.
        debugPrint('[CrashReporter] ${jsonEncode(payload)}');
      } catch (e) {
        // Absolute last resort – never let the reporter itself crash.
        debugPrint('[CrashReporter] Internal error: $e');
      }
    });
  }

  // ---------- Internals ----------

  static Map<String, dynamic> _buildPayload(
    dynamic error,
    StackTrace? stackTrace,
    String? context,
  ) {
    final timestamp = DateTime.now().toIso8601String();

    return <String, dynamic>{
      'timestamp': timestamp,
      'level': 'error',
      'logger': 'CrashReporter',
      'context': context,
      'error': _formatError(error),
      if (stackTrace != null) 'stacktrace': stackTrace.toString(),
      'user': _buildUserInfo(),
      'breadcrumbs': List<Map<String, dynamic>>.from(_breadcrumbs),
      'device': _buildDeviceInfo(),
    };
  }

  static String _formatError(dynamic error) {
    if (error == null) return 'null';
    try {
      return error.toString();
    } catch (_) {
      return 'Unrepresentable error';
    }
  }

  static Map<String, dynamic>? _buildUserInfo() {
    if (_userId == null && _userEmail == null) return null;
    return <String, dynamic>{
      if (_userId != null) 'id': _userId,
      if (_userEmail != null) 'email': _userEmail,
    };
  }

  static Map<String, dynamic> _buildDeviceInfo() {
    return <String, dynamic>{
      'platform': defaultTargetPlatform.name,
      'isWeb': kIsWeb,
      'locale': PlatformDispatcher.instance.locale.toString(),
    };
  }

  /// Sends the [payload] as an HTTP POST JSON request to [_dsn].
  ///
  /// Deliberately fire-and-forget: the caller does not await this Future.
  static Future<void> _sendToServer(Map<String, dynamic> payload) async {
    if (_dsn == null) return;

    try {
      final uri = Uri.parse(_dsn!);
      final response = await http
          .post(
            uri,
            headers: <String, String>{
              'Content-Type': 'application/json',
            },
            body: jsonEncode(payload),
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode >= 400) {
        debugPrint(
          '[CrashReporter] Server returned ${response.statusCode}: ${response.body}',
        );
      }
    } on SocketException catch (e) {
      debugPrint('[CrashReporter] Network error: $e');
    } on TimeoutException catch (e) {
      debugPrint('[CrashReporter] Request timed out: $e');
    } on http.ClientException catch (e) {
      debugPrint('[CrashReporter] HTTP client error: $e');
    } on FormatException catch (e) {
      debugPrint('[CrashReporter] Invalid DSN URI: $e');
    } catch (e) {
      debugPrint('[CrashReporter] Unexpected send error: $e');
    }
  }
}
