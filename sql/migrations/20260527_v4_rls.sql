-- v4-4：启用 RLS（策略 A：owner_id null 历史行仅 service_role 可见）
-- 前置：20260526_v4_owner_id.sql 已执行

-- ── projects ──
alter table projects enable row level security;

drop policy if exists "projects_select_own" on projects;
create policy "projects_select_own"
  on projects for select
  to authenticated
  using (owner_id = auth.uid());

drop policy if exists "projects_insert_own" on projects;
create policy "projects_insert_own"
  on projects for insert
  to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "projects_update_own" on projects;
create policy "projects_update_own"
  on projects for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "projects_delete_own" on projects;
create policy "projects_delete_own"
  on projects for delete
  to authenticated
  using (owner_id = auth.uid());

-- ── agent_runs（经 project 归属，authenticated 只读）──
alter table agent_runs enable row level security;

drop policy if exists "agent_runs_select_own" on agent_runs;
create policy "agent_runs_select_own"
  on agent_runs for select
  to authenticated
  using (
    exists (
      select 1 from projects p
      where p.id = agent_runs.project_id
        and p.owner_id = auth.uid()
    )
  );

-- ── usage_logs ──
alter table usage_logs enable row level security;

drop policy if exists "usage_logs_select_own" on usage_logs;
create policy "usage_logs_select_own"
  on usage_logs for select
  to authenticated
  using (
    exists (
      select 1 from projects p
      where p.id = usage_logs.project_id
        and p.owner_id = auth.uid()
    )
  );

-- ── codegen_runs（表须已存在）──
alter table codegen_runs enable row level security;

drop policy if exists "codegen_runs_select_own" on codegen_runs;
create policy "codegen_runs_select_own"
  on codegen_runs for select
  to authenticated
  using (
    exists (
      select 1 from projects p
      where p.id = codegen_runs.project_id
        and p.owner_id = auth.uid()
    )
  );

-- ── memories ──
alter table memories enable row level security;

drop policy if exists "memories_select_own" on memories;
create policy "memories_select_own"
  on memories for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from projects p
      where p.id = memories.project_id
        and p.owner_id = auth.uid()
    )
  );

-- ── evals ──
alter table evals enable row level security;

drop policy if exists "evals_select_own" on evals;
create policy "evals_select_own"
  on evals for select
  to authenticated
  using (
    exists (
      select 1 from projects p
      where p.id = evals.project_id
        and p.owner_id = auth.uid()
    )
  );

-- ── 全局模板表：authenticated 只读 ──
alter table agents enable row level security;
alter table skills enable row level security;
alter table tools enable row level security;

drop policy if exists "agents_select_authenticated" on agents;
create policy "agents_select_authenticated"
  on agents for select
  to authenticated
  using (true);

drop policy if exists "skills_select_authenticated" on skills;
create policy "skills_select_authenticated"
  on skills for select
  to authenticated
  using (true);

drop policy if exists "tools_select_authenticated" on tools;
create policy "tools_select_authenticated"
  on tools for select
  to authenticated
  using (true);

notify pgrst, 'reload schema';
