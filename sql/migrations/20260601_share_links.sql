-- A-4: 分享链接（匿名访问）
create table if not exists share_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  token text unique not null default (encode(gen_random_bytes(16), 'hex')),
  expires_at timestamptz,
  view_count int default 0,
  created_at timestamptz default now()
);
create index if not exists idx_share_links_token on share_links(token);
alter table share_links enable row level security;
create policy "所有人可查看分享链接" on share_links for select using (true);
create policy "项目 owner 可管理分享" on share_links for all using (
  auth.uid() in (select owner_id from projects where id = project_id)
);
