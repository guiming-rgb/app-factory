-- v3-C5: 防止同一 project+target 并发创建多条 queued/running run（TOCTOU 守卫）
-- 须在 Supabase SQL Editor 执行；与 lib/codegen/runs.ts createCodegenRun 幂等检查配合

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_codegen_run
  ON codegen_runs (project_id, target)
  WHERE status IN ('queued', 'running');
