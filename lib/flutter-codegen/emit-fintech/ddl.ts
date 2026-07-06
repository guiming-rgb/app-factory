// ─── 保险理赔 DDL ───
export function emitFintechDDL(): string {
  return `-- ======================================
-- 金融保险后端 DDL
-- ======================================

-- 保单表
create table if not exists insurance_policies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  type text not null,
  name text not null,
  coverage_amount numeric(12,2),
  premium_amount numeric(12,2),
  status text default 'active',
  start_date date,
  end_date date,
  created_at timestamptz default now()
);

-- 理赔表
create table if not exists insurance_claims (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid references insurance_policies(id),
  user_id uuid references auth.users(id),
  amount numeric(12,2),
  description text,
  status text default 'pending',
  filed_at timestamptz default now(),
  resolved_at timestamptz
);

-- 支付交易表
create table if not exists payment_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  amount numeric(12,2),
  currency text default 'USD',
  method text,
  status text default 'pending',
  payment_intent_id text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- KYC 验证记录
create table if not exists kyc_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) unique,
  full_name text,
  id_number text,
  document_verified boolean default false,
  face_verified boolean default false,
  level text default 'none',
  verified_at timestamptz,
  created_at timestamptz default now()
);

-- RLS
alter table insurance_policies enable row level security;
alter table insurance_claims enable row level security;
alter table payment_transactions enable row level security;
alter table kyc_verifications enable row level security;

create policy "用户可查看自己的保单" on insurance_policies for select using (auth.uid() = user_id);
create policy "用户可查看自己的理赔" on insurance_claims for select using (auth.uid() = user_id);
create policy "用户可提交理赔" on insurance_claims for insert with check (auth.uid() = user_id);
create policy "用户可查看自己的交易" on payment_transactions for select using (auth.uid() = user_id);
create policy "用户可查看自己的KYC" on kyc_verifications for select using (auth.uid() = user_id);
create policy "用户可提交KYC" on kyc_verifications for insert with check (auth.uid() = user_id);
`;
}
