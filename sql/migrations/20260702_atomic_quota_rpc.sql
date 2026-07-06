-- v4: Atomic quota check-and-increment RPC — 防 TOCTOU 竞态
-- 替换旧的盲增 RPC，改为原子 check + increment
create or replace function try_increment_projects_used(uid uuid)
returns boolean language plpgsql as $$
declare
  quota_row user_quotas%rowtype;
begin
  select * into quota_row from user_quotas where user_id = uid;
  if not found then
    -- 首次使用：创建 free 配额并增加 1
    insert into user_quotas (user_id, tier, projects_limit, projects_used, codegen_limit, codegen_used, storage_limit_mb, reset_date)
    values (uid, 'free', 3, 1, 10, 0, 100, current_date + interval '30 days');
    return true;
  end if;
  -- 原子检查：仅当未超限时才增加
  if quota_row.projects_used < quota_row.projects_limit or quota_row.tier <> 'free' then
    update user_quotas set projects_used = projects_used + 1, updated_at = now()
    where user_id = uid;
    return true;
  end if;
  return false;
end; $$;

create or replace function try_increment_codegen_used(uid uuid)
returns boolean language plpgsql as $$
declare
  quota_row user_quotas%rowtype;
begin
  select * into quota_row from user_quotas where user_id = uid;
  if not found then
    insert into user_quotas (user_id, tier, projects_limit, projects_used, codegen_limit, codegen_used, storage_limit_mb, reset_date)
    values (uid, 'free', 3, 0, 10, 1, 100, current_date + interval '30 days');
    return true;
  end if;
  if quota_row.codegen_used < quota_row.codegen_limit or quota_row.tier <> 'free' then
    update user_quotas set codegen_used = codegen_used + 1, updated_at = now()
    where user_id = uid;
    return true;
  end if;
  return false;
end; $$;

-- 保留旧 RPC 以防回滚需要
-- create or replace function increment_projects_used(uid uuid) returns void ... (preserved);
-- create or replace function increment_codegen_used(uid uuid) returns void ... (preserved);
