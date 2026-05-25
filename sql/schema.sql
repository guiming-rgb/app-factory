create extension if not exists "pgcrypto";

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  idea text not null,
  status text not null default 'pending',
  final_report text,
  error_message text,
  owner_id uuid references auth.users (id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists agents (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  role text not null,
  description text,
  order_index int not null,
  executor_type text default 'simple_prompt',
  model_provider text default 'openai',
  model_name text,
  memory_enabled boolean default false,
  tool_enabled boolean default false,
  skill_ids jsonb default '[]'::jsonb,
  config jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists agent_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  agent_code text not null,
  agent_name text not null,
  input text,
  output text,
  status text not null default 'pending',
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  project_id uuid references projects(id) on delete cascade,
  memory_type text not null,
  content text not null,
  metadata jsonb default '{}'::jsonb,
  importance int default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists skills (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  description text,
  category text,
  input_schema jsonb default '{}'::jsonb,
  workflow_schema jsonb default '{}'::jsonb,
  tools_required jsonb default '[]'::jsonb,
  quality_checks jsonb default '[]'::jsonb,
  version text default '1.0.0',
  status text default 'draft',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists tools (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  provider text default 'native',
  tool_type text,
  description text,
  config_schema jsonb default '{}'::jsonb,
  enabled boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists evals (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  agent_run_id uuid references agent_runs(id) on delete cascade,
  eval_type text not null,
  score numeric(5,2),
  result jsonb default '{}'::jsonb,
  comment text,
  created_at timestamptz default now()
);

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

create index if not exists idx_projects_status on projects(status);
create index if not exists idx_projects_owner_id on projects(owner_id);
create index if not exists idx_agent_runs_project_id on agent_runs(project_id);
create index if not exists idx_agent_runs_status on agent_runs(status);
create index if not exists idx_memories_project_id on memories(project_id);
create index if not exists idx_usage_logs_project_id on usage_logs(project_id);
create index if not exists idx_usage_logs_agent_run_id on usage_logs(agent_run_id);

-- v4 RLS 策略（Auth 启用前须在 Supabase 执行）：
--   sql/migrations/20260526_v4_owner_id.sql
--   sql/migrations/20260527_v4_rls.sql
-- 或 npm run db:apply:v4-rls
