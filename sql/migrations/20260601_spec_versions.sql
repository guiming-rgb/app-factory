-- P2: Spec 历史版本管理
create table if not exists spec_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  version int not null,
  spec jsonb not null,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);
create index if not exists idx_spec_versions_project_id on spec_versions(project_id);
create index if not exists idx_spec_versions_project_version on spec_versions(project_id, version desc);
