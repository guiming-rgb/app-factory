/**
 * Shared types for codegen runs — extracted from runs.ts to break
 * the runs.ts <=> stale-runs.ts dependency cycle.
 *
 * Both runs.ts and stale-runs.ts (and any other consumer) import
 * these types from here instead of from each other.
 */

export type CodegenTarget = "flutter" | "wechat" | "harmony";
export type CodegenRunStatus = "queued" | "running" | "completed" | "failed";

export type CodegenRunRow = {
  id: string;
  project_id: string;
  target: CodegenTarget;
  status: CodegenRunStatus;
  artifact_path: string | null;
  log: string | null;
  spec_source: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};
