-- 方向 B-2：团队空间
create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid references auth.users(id),
  created_at timestamptz default now()
);
alter table workspaces enable row level security;
create policy "成员可查看工作空间" on workspaces for select using (
  auth.uid() = owner_id or auth.uid() in (select user_id from workspace_members where workspace_id = id)
);
create policy "owner 可管理工作空间" on workspaces for all using (auth.uid() = owner_id);

create table if not exists workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member', 'viewer')),
  unique(workspace_id, user_id)
);
alter table workspace_members enable row level security;
create policy "成员可查看" on workspace_members for select using (auth.uid() = user_id);
create policy "admin 可管理" on workspace_members for all using (
  auth.uid() in (select user_id from workspace_members where workspace_id = workspace_id and role = 'admin')
);

-- 将 projects.owner_id 扩展为 workspace_id
alter table projects add column if not exists workspace_id uuid references workspaces(id);
