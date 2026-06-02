-- 配额增减 RPC 函数
create or replace function increment_projects_used(uid uuid)
returns void language plpgsql as $$
begin
  update user_quotas set projects_used = projects_used + 1, updated_at = now()
  where user_id = uid;
end; $$;

create or replace function increment_codegen_used(uid uuid)
returns void language plpgsql as $$
begin
  update user_quotas set codegen_used = codegen_used + 1, updated_at = now()
  where user_id = uid;
end; $$;

-- 月初重置
create or replace function reset_monthly_quotas()
returns void language plpgsql as $$
begin
  update user_quotas set projects_used = 0, codegen_used = 0, reset_date = current_date + interval '30 days', updated_at = now()
  where reset_date <= current_date;
end; $$;

-- Stripe Webhook 事件日志
create table if not exists stripe_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text unique,
  event_type text not null,
  payload jsonb,
  processed boolean default false,
  created_at timestamptz default now()
);
