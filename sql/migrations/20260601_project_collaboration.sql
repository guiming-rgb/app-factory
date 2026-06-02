-- P2: 项目协作（团队共享）
create table if not exists project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'editor' check (role in ('editor', 'viewer')),
  invited_by uuid references auth.users(id),
  created_at timestamptz default now(),
  unique(project_id, user_id)
);
create index if not exists idx_project_members_project on project_members(project_id);
create index if not exists idx_project_members_user on project_members(user_id);
alter table project_members enable row level security;
create policy "成员可查看协作列表" on project_members for select using (auth.uid() = user_id or auth.uid() in (select user_id from project_members where project_id = project_id));
create policy "项目 owner 可管理成员" on project_members for all using (auth.uid() in (select owner_id from projects where id = project_id));
