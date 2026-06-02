-- 方向 B-1：用量配额与计费
create table if not exists user_quotas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) unique,
  tier text not null default 'free' check (tier in ('free', 'pro', 'enterprise')),
  projects_limit int default 3,
  projects_used int default 0,
  codegen_limit int default 10,
  codegen_used int default 0,
  storage_limit_mb int default 100,
  reset_date date default (current_date + interval '30 days'),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_quotas_user on user_quotas(user_id);
alter table user_quotas enable row level security;
create policy "用户可查看自己的配额" on user_quotas for select using (auth.uid() = user_id);

-- 计费订阅
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  stripe_customer_id text,
  stripe_subscription_id text,
  tier text not null default 'free',
  status text default 'active' check (status in ('active', 'canceled', 'past_due')),
  current_period_end timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_subscriptions_user on subscriptions(user_id);
alter table subscriptions enable row level security;
create policy "用户可查看自己的订阅" on subscriptions for select using (auth.uid() = user_id);
