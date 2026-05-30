-- C6：codegen_runs 支持 harmony 目标
alter table public.codegen_runs drop constraint if exists codegen_runs_target_check;
alter table public.codegen_runs add constraint codegen_runs_target_check
  check (target in ('flutter', 'wechat', 'harmony'));

notify pgrst, 'reload schema';
