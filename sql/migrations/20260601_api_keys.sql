-- API Key 管理（外部访问 Token）
create table if not exists api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  name text not null,
  key_hash text not null unique,
  prefix text not null,
  scopes text[] default '{read}',
  last_used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_api_keys_user on api_keys(user_id);
create index if not exists idx_api_keys_hash on api_keys(key_hash);
alter table api_keys enable row level security;
create policy "用户可管理自己的 API Key" on api_keys for all using (auth.uid() = user_id);
