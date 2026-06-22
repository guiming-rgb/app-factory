-- 5 个垂直行业「真模板」Supabase 建表
-- 每套对标一线产品：随手记/Salesforce/Keep/淘宝/超级课程表

-- ═══ 记账 Finance ═══════════════════════════════════════

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  amount numeric(12,2) not null check (amount > 0),
  category text not null default '其他',
  type text not null check (type in ('income','expense')),
  note text,
  account_id uuid references accounts(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_transactions_user_date on transactions(user_id, created_at desc);
alter table transactions enable row level security;
create policy transactions_own on transactions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  category text not null,
  limit_amount numeric(12,2) not null default 0,
  period text not null default 'monthly' check (period in ('monthly','yearly')),
  created_at timestamptz default now()
);
alter table budgets enable row level security;
create policy budgets_own on budgets for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  balance numeric(12,2) default 0,
  type text default 'cash',
  created_at timestamptz default now()
);
alter table accounts enable row level security;
create policy accounts_own on accounts for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ═══ CRM ═══════════════════════════════════════════════════

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  company text,
  title text,
  phone text,
  email text,
  source text,
  stage text default '线索',
  deal_value numeric(12,2),
  expected_close timestamptz,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_contacts_user_stage on contacts(user_id, stage);
alter table contacts enable row level security;
create policy contacts_own on contacts for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references contacts(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null default 'note' check (type in ('call','meeting','email','note')),
  title text not null,
  description text,
  created_at timestamptz default now()
);
alter table activities enable row level security;
create policy activities_own on activities for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ═══ 健身 Fitness ═══════════════════════════════════════

create table if not exists workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null, duration_min int not null, calories int, level text, type text, notes text,
  created_at timestamptz default now()
);
alter table workouts enable row level security;
create policy workouts_own on workouts for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists body_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  weight numeric(5,1), body_fat numeric(4,1), muscle numeric(4,1),
  waist numeric(5,1), chest numeric(5,1),
  recorded_at timestamptz default now()
);
alter table body_stats enable row level security;
create policy body_stats_own on body_stats for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ═══ 电商 E-commerce ═══════════════════════════════════

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null, price numeric(12,2) not null, original_price numeric(12,2),
  images jsonb default '[]', description text,
  category_id uuid, sales int default 0, rating numeric(2,1) default 5.0, stock int default 0,
  created_at timestamptz default now()
);
alter table products enable row level security;
create policy products_select on products for select to authenticated using (true);
create policy products_insert on products for insert to authenticated with check (user_id = auth.uid());

create table if not exists cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  product_id uuid references products(id) on delete cascade not null,
  qty int default 1,
  selected boolean default true,
  created_at timestamptz default now()
);
alter table cart_items enable row level security;
create policy cart_items_own on cart_items for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  total numeric(12,2) not null,
  status text default 'pending' check (status in ('pending','paid','shipped','delivered','cancelled')),
  address text,
  tracking text,
  items jsonb default '[]',
  created_at timestamptz default now()
);
alter table orders enable row level security;
create policy orders_own on orders for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ═══ 教育 Education ═══════════════════════════════════

create table if not exists courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  teacher text, room text, day_of_week int, start_time time, end_time time,
  color text, created_at timestamptz default now()
);
alter table courses enable row level security;
create policy courses_own on courses for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  course_id uuid references courses(id) on delete cascade not null,
  title text not null,
  description text, deadline timestamptz, submitted_count int default 0, total_count int default 30,
  created_at timestamptz default now()
);
alter table assignments enable row level security;
create policy assignments_own on assignments for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists grades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  course_id uuid references courses(id) on delete cascade not null,
  exam_name text, score numeric(5,1), total_score numeric(5,1) default 100,
  rank int, created_at timestamptz default now()
);
alter table grades enable row level security;
create policy grades_own on grades for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

notify pgrst, 'reload schema';
