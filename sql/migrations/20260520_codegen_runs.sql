-- v2 Inngest codegen：异步生成产物记录（须在 Supabase SQL Editor 执行）
-- 不修改 sql/schema.sql；立项后可选合并进 schema

create table if not exists codegen_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  target text not null check (target in ('flutter', 'wechat')),
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'failed')),
  artifact_path text,
  log text,
  spec_source text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_codegen_runs_project_id on codegen_runs(project_id);
create index if not exists idx_codegen_runs_status on codegen_runs(status);
create index if not exists idx_codegen_runs_created_at on codegen_runs(created_at desc);
-- P1性能优化：最常见的查询模式（project_id + target + status + created_at）
create index if not exists idx_codegen_runs_lookup on codegen_runs(project_id, target, status, created_at desc);
