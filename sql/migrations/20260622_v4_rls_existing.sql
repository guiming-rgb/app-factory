-- RLS 补丁：已存在的表 + 新增迁移覆盖
-- 执行时机：所有建表 migration 跑完之后

alter table user_github_connections enable row level security;
drop policy if exists user_github_select_own on user_github_connections;
create policy user_github_select_own on user_github_connections for select to authenticated using (user_id = auth.uid());
drop policy if exists user_github_insert_own on user_github_connections;
create policy user_github_insert_own on user_github_connections for insert to authenticated with check (user_id = auth.uid());
drop policy if exists user_github_delete_own on user_github_connections;
create policy user_github_delete_own on user_github_connections for delete to authenticated using (user_id = auth.uid());

alter table user_profiles enable row level security;
drop policy if exists user_profiles_select_own on user_profiles;
create policy user_profiles_select_own on user_profiles for select to authenticated using (id = auth.uid());
drop policy if exists user_profiles_update_own on user_profiles;
create policy user_profiles_update_own on user_profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

notify pgrst, 'reload schema';
