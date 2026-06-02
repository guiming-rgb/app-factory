import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * P1: 实时进度推送（基于 Supabase Realtime）
 * 替代前端 3 秒轮询，通过 PostgreSQL 变更订阅即时推送
 */

export type ProgressEvent = {
  runId: string;
  projectId: string;
  target: string;
  status: "queued" | "running" | "completed" | "failed";
  message?: string;
  timestamp: string;
};

/** 广播 codegen 进度变更 */
export async function broadcastProgress(event: ProgressEvent): Promise<void> {
  try {
    // 写入进度事件到日志（前端通过 Realtime 订阅此表）
    await getSupabaseAdmin()
      .from("usage_logs")
      .insert({
        project_id: event.projectId,
        event_type: "codegen_progress",
        metadata: {
          run_id: event.runId,
          target: event.target,
          status: event.status,
          message: event.message,
          timestamp: event.timestamp,
        },
      });
  } catch {
    // 静默失败 — 不影响主流程
  }
}

/** 在 execute* 的关键步骤调用 */
export function createProgressEmitter(projectId: string, runId: string, target: string) {
  return {
    queued: () => broadcastProgress({ runId, projectId, target, status: "queued", timestamp: new Date().toISOString() }),
    running: (msg?: string) => broadcastProgress({ runId, projectId, target, status: "running", message: msg, timestamp: new Date().toISOString() }),
    completed: (msg?: string) => broadcastProgress({ runId, projectId, target, status: "completed", message: msg, timestamp: new Date().toISOString() }),
    failed: (msg?: string) => broadcastProgress({ runId, projectId, target, status: "failed", message: msg, timestamp: new Date().toISOString() }),
  };
}
