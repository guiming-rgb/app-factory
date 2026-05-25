-- v4-2：projects.owner_id（策略 A：历史行可为 null）
alter table projects
  add column if not exists owner_id uuid references auth.users (id) on delete set null;

create index if not exists idx_projects_owner_id on projects (owner_id);

comment on column projects.owner_id is 'Supabase Auth 用户 id；null 为 v4 前历史数据';

-- 刷新 PostgREST schema 缓存（Dashboard Reload 亦可）
notify pgrst, 'reload schema';
