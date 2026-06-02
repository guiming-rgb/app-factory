-- P2: 模板市场（用户上传自定义页面模板）
create table if not exists custom_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  name text not null,
  description text,
  platform text not null check (platform in ('flutter', 'wechat', 'harmony')),
  screen_type text not null,
  code_content text not null,
  tags jsonb default '[]'::jsonb,
  downloads int default 0,
  status text default 'published' check (status in ('draft', 'published')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_templates_platform on custom_templates(platform, screen_type);
create index if not exists idx_templates_status on custom_templates(status);
alter table custom_templates enable row level security;
create policy "公开可查看已发布模板" on custom_templates for select using (status = 'published');
create policy "用户可管理自己的模板" on custom_templates for all using (auth.uid() = user_id);
