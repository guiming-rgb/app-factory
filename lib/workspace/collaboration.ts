/**
 * 实时协作服务
 *
 * 基于 Supabase Realtime / Broadcast 实现：
 *   - 项目实时广播（更新通知）
 *   - 用户在线状态（Presence）
 *   - 文档段落乐观锁定
 *   - 版本冲突检测
 *
 * @usage
 * ```ts
 * // 订阅项目更新
 * const unsubscribe = await subscribeToProject("proj-123", "user-456", (update) => {
 *   console.log("received:", update);
 * });
 *
 * // 广播光标位置
 * await broadcastPresence("proj-123", "user-456", { line: 12, col: 4 });
 * ```
 */
import { getSupabaseAdmin } from "@/lib/supabase";

// ═══════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════

export type CursorPosition = {
  line: number;
  col: number;
};

export type PresenceState = {
  userId: string;
  userName?: string;
  cursor?: CursorPosition;
  onlineAt: string;
};

export type ProjectUpdateEvent = {
  type: "spec_changed" | "codegen_progress" | "member_joined" | "section_locked" | "section_unlocked";
  project_id: string;
  user_id: string;
  payload: Record<string, unknown>;
  timestamp: string;
};

export type VersionVector = Record<string, number>;

export type ConflictResult = {
  conflict: boolean;
  sections: string[];
};

/** 段落锁 */
type SectionLock = {
  sectionKey: string;
  userId: string;
  lockedAt: number;
};

// ═══════════════════════════════════════════
// 内部状态
// ═══════════════════════════════════════════

/** 活跃的段落锁（内存中，节点级 — 生产环境应迁移到 Redis） */
const sectionLocks = new Map<string, SectionLock>();

const LOCK_TTL_MS = 5 * 60 * 1000; // 5 分钟自动解锁

// ═══════════════════════════════════════════
// 公开 API
// ═══════════════════════════════════════════

/**
 * 订阅项目的实时更新。
 *
 * 返回取消订阅函数，组件卸载时应调用。
 *
 * @example
 * ```tsx
 * useEffect(() => {
 *   const unsub = await subscribeToProject(projectId, userId, (event) => {
 *     // handle event
 *   });
 *   return () => unsub();
 * }, [projectId]);
 * ```
 */
export async function subscribeToProject(
  projectId: string,
  userId: string,
  onUpdate: (event: ProjectUpdateEvent) => void
): Promise<() => void> {
  const channelName = `project:${projectId}`;

  const supabase = getSupabaseAdmin();
  const channel = supabase.channel(channelName);

  // 广播订阅 — 接收其他用户发送的事件
  channel.on(
    "broadcast",
    { event: "project_update" },
    ({ payload }: { payload: ProjectUpdateEvent }) => {
      if (payload.user_id !== userId) {
        onUpdate(payload);
      }
    }
  );

  // Presence 订阅 — 跟踪在线用户
  channel.on("presence", { event: "sync" }, () => {
    const state = channel.presenceState();
    const presences: PresenceState[] = [];
    for (const [, list] of Object.entries(state)) {
      for (const p of list) {
        if (p && typeof p === "object" && "userId" in p) {
          presences.push(p as unknown as PresenceState);
        }
      }
    }
    onUpdate({
      type: "spec_changed", // 复用于在线用户状态推送
      project_id: projectId,
      user_id: "__system__",
      payload: { presence: presences },
      timestamp: new Date().toISOString(),
    });
  });

  channel.on("presence", { event: "join" }, ({ key, newPresences }) => {
    for (const p of newPresences) {
      const presence = p as unknown as PresenceState;
      onUpdate({
        type: "member_joined",
        project_id: projectId,
        user_id: presence.userId,
        payload: { presence: p },
        timestamp: new Date().toISOString(),
      });
    }
  });

  // 订阅频道
  channel.subscribe(async (status) => {
    if (status === "SUBSCRIBED") {
      // 追踪在线状态
      await channel.track({
        userId,
        onlineAt: new Date().toISOString(),
      });
    }
  });

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * 广播用户光标/选择位置到项目频道。
 */
export async function broadcastPresence(
  projectId: string,
  userId: string,
  cursor: CursorPosition
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const channel = supabase.channel(`project:${projectId}`);

  channel.subscribe((status) => {
    if (status === "SUBSCRIBED") {
      channel.track({
        userId,
        cursor,
        onlineAt: new Date().toISOString(),
      });
    }
  });

  // 5 秒后自动清理频道
  setTimeout(() => {
    supabase.removeChannel(channel);
  }, 5000);
}

/**
 * 广播项目更新事件到频道。
 */
export async function broadcastProjectUpdate(
  projectId: string,
  userId: string,
  type: ProjectUpdateEvent["type"],
  payload: Record<string, unknown>
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const channel = supabase.channel(`project:${projectId}`);

  channel.subscribe((status) => {
    if (status === "SUBSCRIBED") {
      channel.send({
        type: "broadcast",
        event: "project_update",
        payload: {
          type,
          project_id: projectId,
          user_id: userId,
          payload,
          timestamp: new Date().toISOString(),
        } as ProjectUpdateEvent,
      });
    }
  });

  // 3 秒后自动清理频道
  setTimeout(() => {
    supabase.removeChannel(channel);
  }, 3000);
}

/**
 * 乐观锁定 Spec 段落。
 *
 * 防止多个用户同时编辑同一段落。返回 true 表示锁定成功。
 * 锁定有 5 分钟 TTL，过期自动释放。
 */
export async function lockSection(
  projectId: string,
  sectionKey: string,
  userId: string
): Promise<boolean> {
  const lockKey = `${projectId}:${sectionKey}`;
  const now = Date.now();

  const existing = sectionLocks.get(lockKey);

  // 如果已被他人锁定且未过期
  if (existing && existing.userId !== userId) {
    if (now - existing.lockedAt < LOCK_TTL_MS) {
      return false;
    }
    // 锁定过期，自动释放
    sectionLocks.delete(lockKey);
  }

  sectionLocks.set(lockKey, {
    sectionKey,
    userId,
    lockedAt: now,
  });

  // 广播锁定事件
  broadcastProjectUpdate(projectId, userId, "section_locked", {
    sectionKey,
    userId,
  }).catch(() => {});

  return true;
}

/**
 * 释放段落锁定。
 */
export async function unlockSection(
  projectId: string,
  sectionKey: string,
  userId: string
): Promise<void> {
  const lockKey = `${projectId}:${sectionKey}`;
  const existing = sectionLocks.get(lockKey);

  if (existing && existing.userId === userId) {
    sectionLocks.delete(lockKey);

    // 广播解锁事件
    broadcastProjectUpdate(projectId, userId, "section_unlocked", {
      sectionKey,
    }).catch(() => {});
  }
}

/**
 * 强制释放某用户的所有锁定（用户离开时调用）。
 */
export async function releaseUserLocks(
  projectId: string,
  userId: string
): Promise<void> {
  for (const [key, lock] of sectionLocks.entries()) {
    if (lock.userId === userId && key.startsWith(`${projectId}:`)) {
      sectionLocks.delete(key);
    }
  }
}

/**
 * 检查段落是否被锁定。
 */
export function isSectionLocked(
  projectId: string,
  sectionKey: string
): { locked: boolean; userId?: string } {
  const lockKey = `${projectId}:${sectionKey}`;
  const lock = sectionLocks.get(lockKey);

  if (!lock) {
    return { locked: false };
  }

  if (Date.now() - lock.lockedAt >= LOCK_TTL_MS) {
    sectionLocks.delete(lockKey);
    return { locked: false };
  }

  return { locked: true, userId: lock.userId };
}

/**
 * 检测文档版本的冲突。
 *
 * 对比两个版本向量（VersionVector），返回有冲突的段落列表。
 * 版本向量格式: { "sectionKey": versionNumber }
 *
 * 冲突规则：如果某段落在两个向量中都有记录且版本不同，则冲突。
 */
export function detectConflict(
  localVersion: VersionVector,
  serverVersion: VersionVector
): ConflictResult {
  const conflictSections: string[] = [];
  const allKeys = new Set([
    ...Object.keys(localVersion),
    ...Object.keys(serverVersion),
  ]);

  for (const key of allKeys) {
    const local = localVersion[key] ?? 0;
    const server = serverVersion[key] ?? 0;

    if (local !== server) {
      conflictSections.push(key);
    }
  }

  return {
    conflict: conflictSections.length > 0,
    sections: conflictSections,
  };
}

/**
 * 获取项目的在线用户列表（查询 Supabase Realtime 的 Presence State）。
 * 需要先建立频道订阅。
 */
export async function getOnlineUsers(
  projectId: string
): Promise<PresenceState[]> {
  try {
    const supabase = getSupabaseAdmin();
    const channel = supabase.channel(`project:${projectId}`);

    return new Promise((resolve) => {
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          const state = channel.presenceState();
          const users: PresenceState[] = [];
          for (const [, list] of Object.entries(state)) {
            for (const p of list) {
              if (p && typeof p === "object" && "userId" in p) {
                users.push(p as unknown as PresenceState);
              }
            }
          }
          supabase.removeChannel(channel);
          resolve(users);
        }
      });

      // 超时保护
      setTimeout(() => {
        supabase.removeChannel(channel);
        resolve([]);
      }, 3000);
    });
  } catch {
    return [];
  }
}
