-- C4：GitHub OAuth 连接（token 仅服务端 service_role 读写）
create table if not exists user_github_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  github_user_id bigint not null,
  github_login text not null,
  access_token text not null,
  scope text,
  token_type text not null default 'bearer',
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_github_connections_login
  on user_github_connections(github_login);

alter table user_github_connections enable row level security;

-- 无 authenticated 策略：token 仅 service_role 经服务端 API 访问
