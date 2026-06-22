-- RLS 全面覆盖 — 补上 v4 RLS 之后新增的所有用户数据表
-- 前置：20260527_v4_rls.sql 已执行

-- ═══ 用户个人表 ═══

alter table user_github_connections enable row level security;
drop policy if exists "user_github_select_own" on user_github_connections;
create policy "user_github_select_own"
  on user_github_connections for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "user_github_insert_own" on user_github_connections;
create policy "user_github_insert_own"
  on user_github_connections for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "user_github_delete_own" on user_github_connections;
create policy "user_github_delete_own"
  on user_github_connections for delete
  to authenticated
  using (user_id = auth.uid());

alter table user_quotas enable row level security;
drop policy if exists "user_quotas_select_own" on user_quotas;
create policy "user_quotas_select_own"
  on user_quotas for select
  to authenticated
  using (user_id = auth.uid());

alter table public.user_profiles enable row level security;
drop policy if exists "user_profiles_select_own" on public.user_profiles;
create policy "user_profiles_select_own"
  on public.user_profiles for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "user_profiles_update_own" on public.user_profiles;
create policy "user_profiles_update_own"
  on public.user_profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ═══ 项目归属表（通过 project_id 关联） ═══

alter table spec_versions enable row level security;
drop policy if exists "spec_versions_select_own" on spec_versions;
create policy "spec_versions_select_own"
  on spec_versions for select
  to authenticated
  using (
    exists (select 1 from projects p where p.id = spec_versions.project_id and p.owner_id = auth.uid())
  );

alter table codegen_feedback enable row level security;
drop policy if exists "codegen_feedback_select_own" on codegen_feedback;
create policy "codegen_feedback_select_own"
  on codegen_feedback for select
  to authenticated
  using (
    exists (select 1 from projects p where p.id = codegen_feedback.project_id and p.owner_id = auth.uid())
  );

drop policy if exists "codegen_feedback_insert_own" on codegen_feedback;
create policy "codegen_feedback_insert_own"
  on codegen_feedback for insert
  to authenticated
  with check (
    exists (select 1 from projects p where p.id = codegen_feedback.project_id and p.owner_id = auth.uid())
  );

-- ═══ 协作表 ═══

alter table project_members enable row level security;
drop policy if exists "project_members_select_own" on project_members;
create policy "project_members_select_own"
  on project_members for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from projects p where p.id = project_members.project_id and p.owner_id = auth.uid())
  );

alter table share_links enable row level security;
drop policy if exists "share_links_select_owner" on share_links;
create policy "share_links_select_owner"
  on share_links for select
  to authenticated
  using (
    created_by = auth.uid()
    or exists (select 1 from projects p where p.id = share_links.project_id and p.owner_id = auth.uid())
  );

alter table workspaces enable row level security;
drop policy if exists "workspaces_select_own" on workspaces;
create policy "workspaces_select_own"
  on workspaces for select
  to authenticated
  using (owner_id = auth.uid());

alter table workspace_members enable row level security;
drop policy if exists "workspace_members_select_own" on workspace_members;
create policy "workspace_members_select_own"
  on workspace_members for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from workspaces w where w.id = workspace_members.workspace_id and w.owner_id = auth.uid())
  );

-- ═══ 全局/模板表 — authenticated 只读 ═══

alter table custom_templates enable row level security;
drop policy if exists "custom_templates_select_auth" on custom_templates;
create policy "custom_templates_select_auth"
  on custom_templates for select
  to authenticated
  using (true);

-- ═══ 内部表（仅 service_role，不给 authenticated 任何权限） ═══
-- api_rate_limit_events, stripe_events, subscriptions, api_keys 已仅 service_role

notify pgrst, 'reload schema';
