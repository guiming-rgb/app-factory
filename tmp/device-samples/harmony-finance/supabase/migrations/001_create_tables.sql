-- ======================================
-- App 生产工厂 — 后端 DDL
-- 生成时间: 2026-06-23T14:33:23.919Z
-- 应用名称: 记账本·真机样本
-- ======================================

-- transactions
create table if not exists transactions (
  id uuid default gen_random_uuid() primary key,
  title text,
  amount double precision,
  created_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ======================================
-- RLS 策略
-- ======================================

alter table transactions enable row level security;
-- 无 user_id 字段：仅允许认证用户读写
create policy "认证用户可读transactions" on transactions for select using (auth.role() = 'authenticated');
create policy "认证用户可插入transactions" on transactions for insert with check (auth.role() = 'authenticated');
create policy "认证用户可更新transactions" on transactions for update using (auth.role() = 'authenticated');
create policy "认证用户可删除transactions" on transactions for delete using (auth.role() = 'authenticated');

-- ======================================
-- 索引
-- ======================================
create index if not exists idx_transactions_created_at on transactions(created_at desc);
