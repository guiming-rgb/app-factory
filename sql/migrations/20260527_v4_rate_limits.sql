-- v4-6：API 限流事件表（仅 service_role 读写，无 anon 策略）
create table if not exists api_rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  bucket_key text not null,
  action text not null check (action in ('generate', 'codegen')),
  created_at timestamptz not null default now()
);

create index if not exists idx_rate_limit_bucket_action_time
  on api_rate_limit_events (bucket_key, action, created_at desc);

alter table api_rate_limit_events enable row level security;

comment on table api_rate_limit_events is 'v4-6 每小时滑动窗口限流计数；仅服务端 Service Role 访问';

notify pgrst, 'reload schema';
