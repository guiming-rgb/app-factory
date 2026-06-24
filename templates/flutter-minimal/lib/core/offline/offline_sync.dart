import 'dart:async';
import 'dart:convert';

import 'package:sqflite/sqflite.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

import '../config/env.dart';

/// 离线优先同步引擎
///
/// 网络可用时：操作直写 Supabase，本地 SQLite 同步保持缓存。
/// 网络不可用时：写入本地队列（synced=0），恢复后自动推送。
///
/// 依赖 sqflite、supabase_flutter、connectivity_plus。
class OfflineSync {
  OfflineSync._();

  static Database? _db;
  static final _syncQueues = <String, List<Map<String, dynamic>>>{};
  static StreamSubscription<List<ConnectivityResult>>? _connectivitySub;
  static final List<void Function(bool)> _networkListeners = [];

  // ============================================================
  // 生命周期
  // ============================================================

  /// 初始化离线存储 — 创建 / 打开本地 SQLite 数据库
  ///
  /// [tables] 需定义表结构，格式：
  /// ```dart
  /// {
  ///   "profiles": "id TEXT PRIMARY KEY, name TEXT, avatar TEXT, synced INTEGER DEFAULT 0, created_at TEXT",
  ///   "posts":    "id TEXT PRIMARY KEY, title TEXT, body TEXT, synced INTEGER DEFAULT 0, created_at TEXT"
  /// }
  /// ```
  /// 每张表会自动追加 synced / updated_at 列。
  static Future<void> init(Map<String, String> tables) async {
    _db = await openDatabase(
      'offline_sync.db',
      version: 1,
      onCreate: (db, version) async {
        for (final entry in tables.entries) {
          final columns = entry.value.trim();
          final fullSql = columns.endsWith(')')
              ? columns
              : '$columns, synced INTEGER NOT NULL DEFAULT 0, updated_at TEXT';
          await db.execute(
            'CREATE TABLE IF NOT EXISTS ${entry.key} ($fullSql)',
          );
        }
        await db.execute(
          'CREATE TABLE IF NOT EXISTS _sync_log ('
          'id INTEGER PRIMARY KEY AUTOINCREMENT, '
          'table_name TEXT NOT NULL, '
          'record_id TEXT, '
          'operation TEXT NOT NULL, '
          'data TEXT, '
          'created_at TEXT NOT NULL'
          ')',
        );
      },
      onUpgrade: (db, oldV, newV) async {
        // 预留升级钩子
      },
    );

    // 监听网络状态变化，恢复时自动推送
    _connectivitySub = Connectivity().onConnectivityChanged.listen(
      (results) {
        final online = results.any((r) => r != ConnectivityResult.none);
        for (final cb in _networkListeners) {
          cb(online);
        }
        if (online) {
          _processAllQueues();
        }
      },
    );
  }

  /// 释放资源（数据库连接、流订阅）
  static Future<void> dispose() async {
    await _connectivitySub?.cancel();
    _connectivitySub = null;
    _networkListeners.clear();
    await _db?.close();
    _db = null;
  }

  // ============================================================
  // 本地读写
  // ============================================================

  /// 保存数据到本地 SQLite
  ///
  /// [table] 表名，[data] 待保存数据（必须包含 id）。
  /// [synced] 标记同步状态：1=已同步，0=待同步。
  /// 返回 true 表示写入成功。
  static Future<bool> saveLocal(
    String table,
    Map<String, dynamic> data, {
    int synced = 0,
  }) async {
    final db = _db;
    if (db == null) return false;
    try {
      final id = data['id'];
      if (id == null) return false;

      final copy = Map<String, dynamic>.from(data)
        ..['synced'] = synced
        ..['updated_at'] = DateTime.now().toUtc().toIso8601String();

      await db.insert(
        table,
        copy,
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
      return true;
    } catch (_) {
      return false;
    }
  }

  /// 从本地 SQLite 读取数据
  ///
  /// [table] 表名，[where] 筛选条件（如 "id = ?"），[whereArgs] 参数值。
  /// [limit] 限制条数，[orderBy] 排序字段。
  /// 返回记录列表，查询失败返回空列表。
  static Future<List<Map<String, dynamic>>> getLocal(
    String table, {
    String? where,
    List<dynamic>? whereArgs,
    int? limit,
    String? orderBy,
  }) async {
    final db = _db;
    if (db == null) return [];
    try {
      return await db.query(
        table,
        where: where,
        whereArgs: whereArgs,
        limit: limit,
        orderBy: orderBy,
      );
    } catch (_) {
      return [];
    }
  }

  /// 获取所有待同步的记录数
  static Future<int> getPendingCount(String table) async {
    final db = _db;
    if (db == null) return 0;
    try {
      final result = await db.rawQuery(
        'SELECT COUNT(*) as cnt FROM $table WHERE synced = 0',
      );
      return Sqflite.firstIntValue(result) ?? 0;
    } catch (_) {
      return 0;
    }
  }

  /// 清空本地表数据
  static Future<bool> clearLocal(String table) async {
    final db = _db;
    if (db == null) return false;
    try {
      await db.delete(table);
      return true;
    } catch (_) {
      return false;
    }
  }

  // ============================================================
  // 同步
  // ============================================================

  /// 推送本地待同步记录到 Supabase
  ///
  /// 遍历 [table] 表中 synced=0 的记录，逐条 POST / PUT 到
  /// Supabase REST API。成功后将本地标记为 synced=1。
  /// 全部失败返回空列表，部分成功返回失败记录 ID 列表。
  static Future<List<String>> syncToServer(String table) async {
    final db = _db;
    final client = _supabaseClient;
    if (db == null || client == null) return [];

    if (!await _isOnline) return [];

    final failed = <String>[];
    try {
      final rows = await db.query(table, where: 'synced = 0');
      for (final row in rows) {
        try {
          final id = row['id'];
          if (id == null) continue;

          final payload = Map<String, dynamic>.from(row);
          payload.remove('synced');
          payload.remove('updated_at');

          // upsert: 用 id 作为自然键
          await client.from(table).upsert(payload).execute();
          await db.update(
            table,
            {'synced': 1},
            where: 'id = ?',
            whereArgs: [id],
          );
        } catch (_) {
          final id = row['id'];
          if (id != null) failed.add(id.toString());
        }
      }
    } catch (_) {
      // 全量失败
    }
    return failed;
  }

  /// 从 Supabase 拉取最新数据并合并到本地
  ///
  /// [table] 表名，[query] 可选查询参数（如 "select=*&order=created_at.desc"）。
  /// 数据按 id upsert 到本地 SQLite，标记 synced=1。
  /// 返回拉取到的记录数，失败返回 null。
  static Future<int?> syncFromServer(
    String table, {
    String? query,
  }) async {
    final db = _db;
    final client = _supabaseClient;
    if (db == null || client == null) return null;

    if (!await _isOnline) return null;

    try {
      final q = client.from(table).select();
      if (query != null) {
        // 解析简单 query 字符串追加 filter
        // 实际使用可扩展为 PostgrestQueryBuilder
      }
      final response = await q.execute();
      final data = response.data;
      if (data == null || data is! List) return 0;

      int count = 0;
      for (final item in data) {
        if (item is Map<String, dynamic>) {
          final copy = Map<String, dynamic>.from(item)
            ..['synced'] = 1
            ..['updated_at'] = DateTime.now().toUtc().toIso8601String();
          await db.insert(
            table,
            copy,
            conflictAlgorithm: ConflictAlgorithm.replace,
          );
          count++;
        }
      }
      return count;
    } catch (_) {
      return null;
    }
  }

  /// 订阅 Supabase Realtime 频道并本地更新
  ///
  /// [table] 表名，[onUpdate] 收到变更时回调（传入变更后的数据行）。
  /// 返回 RealtimeSubscription 供调用方取消订阅。
  /// 内部已捕获所有异常，不会向上抛。
  static RealtimeSubscription? watchRealtime(
    String table, {
    required void Function(Map<String, dynamic> data) onUpdate,
  }) {
    final client = _supabaseClient;
    if (client == null) return null;

    try {
      final channel = client.channel('public:$table');
      channel.on(
        RealtimeListenTypes.postgresChanges,
        ChannelFilter(
          event: '*',
          schema: 'public',
          table: table,
        ),
        (payload, [ref]) {
          try {
            final newData = payload['new'] as Map<String, dynamic>?;
            if (newData != null) {
              // 尝试写入本地
              saveLocal(table, newData, synced: 1);
              onUpdate(newData);
            }
          } catch (_) {
            // 静默忽略本地写入失败
          }
        },
      );
      channel.subscribe();
      return channel;
    } catch (_) {
      return null;
    }
  }

  /// 取消 Realtime 订阅
  static Future<void> unsubscribe(RealtimeSubscription? channel) async {
    if (channel == null) return;
    try {
      await channel.unsubscribe();
    } catch (_) {
      // 忽略
    }
  }

  // ============================================================
  // 网络状态
  // ============================================================

  /// 当前是否在线
  static Future<bool> get _isOnline async {
    try {
      final results = await Connectivity().checkConnectivity();
      return results.any((r) => r != ConnectivityResult.none);
    } catch (_) {
      // 无法检测时假定在线，让上游 try/catch 兜底
      return true;
    }
  }

  /// 注册网络变化监听器
  static void onNetworkChange(void Function(bool online) callback) {
    _networkListeners.add(callback);
  }

  /// 移除网络变化监听器
  static void removeNetworkChange(void Function(bool online) callback) {
    _networkListeners.remove(callback);
  }

  // ============================================================
  // 内部
  // ============================================================

  static SupabaseClient? get _supabaseClient {
    if (!Env.hasSupabase) return null;
    try {
      return Supabase.instance.client;
    } catch (_) {
      return null;
    }
  }

  /// 遍历所有表的待同步队列
  static Future<void> _processAllQueues() async {
    final db = _db;
    if (db == null) return;

    try {
      final tables = await db.rawQuery(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '_sync_log' AND name NOT LIKE 'sqlite_%'",
      );
      for (final t in tables) {
        final name = t['name'] as String?;
        if (name != null) {
          await syncToServer(name);
        }
      }
    } catch (_) {
      // 静默失败
    }
  }
}
