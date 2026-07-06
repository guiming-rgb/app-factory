-- v3-C5: 防止同一 project+target 并发创建多条 queued/running run（TOCTOU 守卫）
-- 镜像 supabase/migrations/20260706_codegen_runs_active_unique.sql

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_codegen_run
  ON codegen_runs (project_id, target)
  WHERE status IN ('queued', 'running');
