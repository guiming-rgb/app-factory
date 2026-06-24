/**
 * 离线优先同步 — 网络不可用时本地存储，恢复后自动推送
 *
 * 依赖 @kit.ArkData (relationalStore) 和 @kit.NetworkKit (connection)。
 * Supabase 请求复用 SupabaseConfig.request。
 */

import { relationalStore } from '@kit.ArkData';
import { connection } from '@kit.NetworkKit';
import { SupabaseConfig } from './SupabaseConfig';

const DB_NAME: string = 'offline_sync.db';
const DB_CREATE_SUFFIX: string =
  ', sync_status TEXT NOT NULL DEFAULT \'pending\', updated_at TEXT, created_at TEXT';

interface SyncRecord {
  id: number;
  tableName: string;
  recordId: string;
  operation: string;
  data: string;
  createdAt: string;
}

export class OfflineSync {
  private static rdbStore_: relationalStore.RdbStore | null = null;
  private static networkCallbacks_: Array<() => void> = [];

  // ============================================================
  // 生命周期
  // ============================================================

  /**
   * 初始化本地 RDB 存储
   *
   * @param context  UIAbility / 页面上下文
   * @param tables   表定义映射：{ tableName: "列定义" }
   *
   * 每张表追加 sync_status / updated_at / created_at 列。
   * 自动创建 _sync_log 表记录同步历史。
   */
  static async init(
    context: Context,
    tables: Record<string, string>
  ): Promise<void> {
    try {
      const config: relationalStore.StoreConfig = {
        name: DB_NAME,
        securityLevel: relationalStore.SecurityLevel.S1
      };
      this.rdbStore_ = await relationalStore.getRdbStore(context, config);

      for (const [name, columns] of Object.entries(tables)) {
        const sql: string =
          'CREATE TABLE IF NOT EXISTS ' + name + ' (' +
          columns +
          DB_CREATE_SUFFIX +
          ')';
        await this.rdbStore_.executeSql(sql);
      }

      await this.rdbStore_.executeSql(
        'CREATE TABLE IF NOT EXISTS _sync_log (' +
        'id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
        'table_name TEXT NOT NULL, ' +
        'record_id TEXT, ' +
        'operation TEXT NOT NULL, ' +
        'data TEXT, ' +
        'created_at TEXT NOT NULL' +
        ')'
      );
    } catch (e) {
      console.error('[OfflineSync] init failed', JSON.stringify(e));
    }
  }

  /**
   * 释放资源
   */
  static async destroy(): Promise<void> {
    try {
      if (this.rdbStore_ !== null) {
        await this.rdbStore_.close();
        this.rdbStore_ = null;
      }
    } catch (e) {
      console.error('[OfflineSync] destroy', JSON.stringify(e));
    }
  }

  // ============================================================
  // 本地读写
  // ============================================================

  /**
   * 保存数据到本地 RDB
   *
   * @param table 表名
   * @param data  数据（必须包含 id 字段）
   * @returns true 写入成功，false 失败
   */
  static async saveLocal(
    table: string,
    data: Record<string, Object>
  ): Promise<boolean> {
    const store = this.rdbStore_;
    if (store === null) return false;

    try {
      const id: Object | undefined = data['id'];
      if (id === undefined) return false;

      const now: string = new Date().toISOString();
      const copy: Record<string, Object> = {
        ...data,
        sync_status: 'pending',
        updated_at: now
      };

      const columns: string[] = Object.keys(copy);
      const placeholders: string = columns.map(() => '?').join(', ');
      const values: relationalStore.ValueType[] = columns.map(
        (col) => copy[col] as relationalStore.ValueType
      );

      // UPSERT by id
      const sql: string =
        'INSERT OR REPLACE INTO ' + table + ' (' + columns.join(', ') + ')' +
        ' VALUES (' + placeholders + ')';

      await store.executeSql(sql, values);
      return true;
    } catch (e) {
      console.error('[OfflineSync] saveLocal', JSON.stringify(e));
      return false;
    }
  }

  /**
   * 从本地 RDB 查询数据
   *
   * @param table  表名
   * @param where  WHERE 条件片段（如 "sync_status = 'synced'"），不含 WHERE 关键字
   * @param orderBy 排序字段（如 "updated_at DESC"）
   * @param limit  最大返回条数
   * @returns 记录列表，失败返回空数组
   */
  static async getLocal(
    table: string,
    where?: string,
    orderBy?: string,
    limit?: number
  ): Promise<Array<Record<string, Object>>> {
    const store = this.rdbStore_;
    if (store === null) return [];

    try {
      let sql: string = 'SELECT * FROM ' + table;
      if (where !== undefined && where.length > 0) {
        sql += ' WHERE ' + where;
      }
      if (orderBy !== undefined && orderBy.length > 0) {
        sql += ' ORDER BY ' + orderBy;
      }
      if (limit !== undefined && limit > 0) {
        sql += ' LIMIT ' + limit.toString();
      }

      const result: relationalStore.ResultSet = await store.querySql(sql);
      const rows: Array<Record<string, Object>> = [];
      while (result.goToNextRow()) {
        const row: Record<string, Object> = {};
        for (let i = 0; i < result.columnCount; i++) {
          const colName: string = result.getColumnName(i);
          row[colName] = result.getValue(i);
        }
        rows.push(row);
      }
      result.close();
      return rows;
    } catch (e) {
      console.error('[OfflineSync] getLocal', JSON.stringify(e));
      return [];
    }
  }

  /**
   * 删除已同步超过 7 天的记录
   */
  static async clearSynced(): Promise<boolean> {
    const store = this.rdbStore_;
    if (store === null) return false;

    try {
      const cutoff: string = new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000
      ).toISOString();

      // 获取所有用户表（排除 _sync_log 和 sqlite_ 系统表）
      const tablesResult: relationalStore.ResultSet = await store.querySql(
        "SELECT name FROM sqlite_master WHERE type='table' " +
        "AND name NOT LIKE '_sync_log' AND name NOT LIKE 'sqlite_%'"
      );
      const tableNames: string[] = [];
      while (tablesResult.goToNextRow()) {
        const name: string = tablesResult.getString(
          tablesResult.getColumnIndex('name')
        );
        tableNames.push(name);
      }
      tablesResult.close();

      for (const t of tableNames) {
        await store.executeSql(
          "DELETE FROM " + t +
          " WHERE sync_status = 'synced' AND updated_at < ?",
          [cutoff]
        );
      }
      return true;
    } catch (e) {
      console.error('[OfflineSync] clearSynced', JSON.stringify(e));
      return false;
    }
  }

  // ============================================================
  // 同步
  // ============================================================

  /**
   * 推送所有本地待同步记录到 Supabase
   *
   * 遍历各表 sync_status='pending' 的记录，通过 SupabaseConfig.request
   * 逐条 POST / PATCH。成功后将状态更新为 'synced'。
   *
   * @returns { synced: number, failed: number }
   */
  static async syncPending(): Promise<{ synced: number; failed: number }> {
    const store = this.rdbStore_;
    if (store === null) return { synced: 0, failed: 0 };

    if (!(await this.getNetworkStatus())) {
      return { synced: 0, failed: 0 };
    }

    let synced = 0;
    let failed = 0;

    try {
      // 获取所有用户表
      const tablesResult: relationalStore.ResultSet = await store.querySql(
        "SELECT name FROM sqlite_master WHERE type='table' " +
        "AND name NOT LIKE '_sync_log' AND name NOT LIKE 'sqlite_%'"
      );
      const tableNames: string[] = [];
      while (tablesResult.goToNextRow()) {
        tableNames.push(
          tablesResult.getString(tablesResult.getColumnIndex('name'))
        );
      }
      tablesResult.close();

      for (const table of tableNames) {
        const rows: Array<Record<string, Object>> = await this.getLocal(
          table,
          "sync_status = 'pending'"
        );

        for (const row of rows) {
          try {
            const id: Object | undefined = row['id'];
            if (id === undefined) continue;

            // 构造请求 payload（不含内部列）
            const payload: Record<string, Object> = {};
            for (const [k, v] of Object.entries(row)) {
              if (k !== 'sync_status' && k !== 'updated_at') {
                payload[k] = v;
              }
            }

            let path: string = table;
            if (id !== undefined) {
              path += '?id=eq.' + encodeURIComponent(String(id));
            }

            const resp: Object | null = await SupabaseConfig.request(path, {
              method: 'POST',
              body: payload
            });

            if (resp !== null) {
              await store.executeSql(
                "UPDATE " + table + " SET sync_status = 'synced' WHERE id = ?",
                [id as relationalStore.ValueType]
              );
              synced++;
            } else {
              failed++;
            }
          } catch (_e) {
            failed++;
          }
        }
      }
    } catch (e) {
      console.error('[OfflineSync] syncPending', JSON.stringify(e));
    }

    return { synced, failed };
  }

  // ============================================================
  // 网络状态
  // ============================================================

  /**
   * 获取当前网络连接状态
   *
   * @returns true=在线（WiFi / 蜂窝 / 以太网），false=离线
   */
  static async getNetworkStatus(): Promise<boolean> {
    try {
      const netHandle = connection.getDefaultNet();
      const netCap = await connection.getNetCapabilities(netHandle);
      if (netCap === undefined) return false;
      return netCap.bearerTypes.length > 0;
    } catch (e) {
      console.error('[OfflineSync] getNetworkStatus', JSON.stringify(e));
      return false;
    }
  }

  /**
   * 监听网络恢复
   *
   * @param callback 网络可用时触发
   * @returns 取消监听函数
   */
  static onNetworkAvailable(callback: () => void): () => void {
    const handler = (data: connection.NetState): void => {
      if (data.netAvailable) {
        callback();
        // 联网后自动推送待同步队列
        this.syncPending().catch((_e) => {});
      }
    };

    try {
      connection.on('netAvailable', handler);
    } catch (e) {
      console.error('[OfflineSync] onNetworkAvailable', JSON.stringify(e));
    }

    const cancel = (): void => {
      try {
        connection.off('netAvailable', handler);
      } catch (_e) {}
    };
    this.networkCallbacks_.push(cancel);
    return cancel;
  }
}
