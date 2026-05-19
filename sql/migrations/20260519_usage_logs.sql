-- MVP v1.3：单次生成 LLM 调用耗时与 token 统计
-- 在 Supabase SQL Editor 执行本文件（或合并进你的迁移流程）

create table if not exists usage_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  agent_run_id uuid references agent_runs(id) on delete set null,
  agent_code text,
  event_type text not null default 'llm_call',
  duration_ms int,
  prompt_tokens int,
  completion_tokens int,
  total_tokens int,
  model_name text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_usage_logs_project_id on usage_logs(project_id);
create index if not exists idx_usage_logs_agent_run_id on usage_logs(agent_run_id);
