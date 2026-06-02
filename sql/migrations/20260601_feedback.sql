-- P1: 应用内反馈收集
create table if not exists codegen_feedback (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  run_id uuid,
  rating int check (rating between 1 and 5),
  feedback text,
  category text default 'general',
  created_at timestamptz default now()
);
create index if not exists idx_feedback_project on codegen_feedback(project_id);
alter table codegen_feedback enable row level security;
create policy "公开可提交反馈" on codegen_feedback for insert with check (true);
create policy "公开可查看反馈" on codegen_feedback for select using (true);
